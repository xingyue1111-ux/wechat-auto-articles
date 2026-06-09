import {
  collectEnterpriseAiCandidates,
  type ContentSourceProgressEvent
} from "@/lib/content-sources/aggregate";
import type { VisualBriefManifest } from "@/lib/domain/types";
import { optionalEnv } from "@/lib/env";
import { BRIEF_SYSTEM_PROMPT, buildBriefPrompt } from "@/lib/server/brief-prompt";
import { generateVisualBriefWithRetry } from "@/lib/server/deepseek-brief";
import {
  createProgressLog,
  type GenerationProgressReporter
} from "@/lib/server/generation-progress";
import { persistSeedreamImageForRender } from "@/lib/server/persist-seedream-image";
import { readLatestManifest } from "@/lib/server/visual-manifest";
import { generateWithDeepSeek } from "@/lib/services/deepseek";
import { generateSeedreamImages } from "@/lib/services/seedream";
import { putPublicBlob } from "@/lib/storage/blob";
import { articleManifestPath, latestManifestPath, panelBlobPath } from "@/lib/storage/paths";
import { buildFallbackVisualBrief, validateVisualBriefManifest } from "@/lib/visual-brief";
import { selectIllustrationPrompts } from "@/lib/visual-render/illustrations";
import { renderSheetPng } from "@/lib/visual-render/render-sheet";
import { buildVisualBriefSheetPlans } from "@/lib/visual-render/sheet-plan";

const FUNCTION_TIME_BUDGET_MS = 300_000;
const COMPLETION_SAFETY_MS = 35_000;
const SEEDREAM_PHASE_TIMEOUT_MS = 150_000;
const SEEDREAM_REQUEST_TIMEOUT_MS = 75_000;
const SEEDREAM_MIN_REMOTE_BUDGET_MS = 45_000;
const DEEPSEEK_REQUEST_TIMEOUT_MS = 110_000;

export async function generateDailyVisualBrief(input: {
  now?: Date;
  date?: string;
  onProgress?: GenerationProgressReporter;
} = {}): Promise<VisualBriefManifest> {
  const startedAt = Date.now();
  const now = input.now ?? new Date();
  const date = input.date ?? toShanghaiDate(now);
  const revision = buildRunRevision(now);
  const report = (
    level: Parameters<typeof createProgressLog>[0],
    stage: Parameters<typeof createProgressLog>[1],
    message: string,
    detail?: string
  ) => emitProgress(input.onProgress, createProgressLog(level, stage, message, detail));

  report("info", "system", `创建 ${date} 的企业 AI 落地长图简报任务`);
  report("running", "sources", "并行抓取五路公开信号源");
  const previousManifest = await readLatestManifest().catch(() => null);
  const previousSourceUrls = previousManifest
    ? Array.from(new Set(previousManifest.panels.flatMap((panel) => panel.sourceUrls)))
    : [];
  const source = await collectEnterpriseAiCandidates({
    now,
    excludedUrls: previousSourceUrls,
    onProgress: (event) =>
      report(
        event.status === "running" ? "running" : event.status === "success" ? "success" : "error",
        sourceProgressStage(event),
        sourceProgressMessage(event),
        event.detail
      )
  });
  report(
    "success",
    "sources",
    `候选内容池已确认，共 ${source.items.length} 条素材送入 DeepSeek`,
    source.failures.length ? `${source.failures.length} 路来源暂时不可用，其余来源继续运行` : "五路来源均可用"
  );

  const briefContext = {
    date,
    sourceWindow: source.sourceWindow,
    items: source.items
  };
  report("running", "deepseek", "调用 DeepSeek 分类素材，并生成 1400-1600 字完整公众号文章");
  const deepseek = optionalEnv("DEEPSEEK_API_KEY")
    ? await generateVisualBriefWithRetry({
        context: briefContext,
        request: () => generateWithDeepSeek({
          system: BRIEF_SYSTEM_PROMPT,
          prompt: buildBriefPrompt(date, source.sourceWindow, source.items),
          fallback: "",
          requestTimeoutMs: deepseekRequestTimeoutMs(startedAt)
        }),
        onRetry: (reason) =>
          report("running", "deepseek", "DeepSeek 首次输出未通过校验，正在重试", reason)
      })
    : {
        brief: buildFallbackVisualBrief(briefContext),
        diagnostics: {
          contentMode: "fallback" as const,
          attempts: 0,
          degradationReason: "未配置 DEEPSEEK_API_KEY"
        }
      };
  const brief = deepseek.brief;
  if (deepseek.diagnostics.contentMode === "fallback") {
    report(
      "error",
      "deepseek",
      "DeepSeek 未返回可用结构，已降级为规则化兜底内容",
      deepseek.diagnostics.degradationReason
    );
  } else {
    report(
      "success",
      "deepseek",
      `DeepSeek 已完成分类、选题与完整文章生成，共 ${brief.panels.length} 个内部排版块`,
      `调用 ${deepseek.diagnostics.attempts} 次`
    );
  }

  if (!optionalEnv("ARK_API_KEY") || !optionalEnv("ARK_SEEDREAM_MODEL")) {
    report("info", "seedream", "未配置完整 Seedream 参数，将使用本地占位配图");
  }
  const seedreamBudgetMs = seedreamPhaseTimeoutMs(startedAt);
  const skipRemoteSeedream = seedreamBudgetMs < SEEDREAM_MIN_REMOTE_BUDGET_MS;
  if (skipRemoteSeedream) {
    report(
      "info",
      "seedream",
      "剩余时间不足，跳过 Seedream 真请求并使用占位配图",
      `剩余可用预算 ${Math.max(0, seedreamBudgetMs)}ms`
    );
  }
  const seedreamImages = await generateSeedreamImages({
    runId: revision,
    prompts: selectIllustrationPrompts(brief.panels),
    phaseTimeoutMs: skipRemoteSeedream ? 0 : seedreamBudgetMs,
    requestTimeoutMs: skipRemoteSeedream ? 1 : Math.min(SEEDREAM_REQUEST_TIMEOUT_MS, seedreamBudgetMs),
    retryDelayMs: skipRemoteSeedream ? 0 : 800,
    onProgress: ({ index, total, status, detail }) => {
      if (status === "running") {
        report("running", "seedream", `Seedream 正在生成配图 ${index}/${total}`);
      } else if (status === "retrying") {
        report("running", "seedream", `Seedream 配图 ${index}/${total} 首次未完成，正在重试`, detail);
      } else if (status === "failed") {
        report("error", "seedream", `Seedream 配图 ${index}/${total} 生成失败`, detail);
      } else {
        report("success", "seedream", `Seedream 配图 ${index}/${total} 已生成`);
      }
    }
  });

  const persistedSeedreamImages = await Promise.all(
    seedreamImages.map(async (image, index) => {
      report("running", "blob", `保存配图素材 ${index + 1}/${seedreamImages.length}`);
      const persisted = await persistSeedreamImageForRender(date, index + 1, image.url, revision);
      report("success", "blob", `配图素材 ${index + 1}/${seedreamImages.length} 已保存`);
      return persisted;
    })
  );

  const sheetPlans = buildVisualBriefSheetPlans(
    brief.panels,
    persistedSeedreamImages.map((image) => image.renderUrl),
    revision
  );
  const panels: VisualBriefManifest["panels"] = [];
  for (const [index, sheet] of sheetPlans.entries()) {
    report("running", "render", `渲染 PNG 长图 ${index + 1}/${sheetPlans.length}`, sheet.title);
    const renderStartedAt = Date.now();
    const png = await renderSheetPng(sheet);
    const blob = await putPublicBlob(panelBlobPath(date, index + 1, sheet.kind, revision), png, "image/png");
    panels.push({
      index: index + 1,
      kind: sheet.kind,
      title: sheet.title,
      imageUrl: blob.url,
      width: sheet.width,
      height: sheet.height,
      sourceUrls: Array.from(new Set(sheet.panels.flatMap((panel) => panel.sourceUrls)))
    });
    report(
      "success",
      "render",
      `PNG 长图 ${index + 1}/${sheetPlans.length} 已上传`,
      `耗时 ${((Date.now() - renderStartedAt) / 1000).toFixed(1)} 秒`
    );
  }

  report("running", "manifest", "写入文章索引和 latest 指针");
  const selectedSourceUrls = Array.from(new Set(brief.panels.flatMap((panel) => panel.sourceUrls)));
  const manifest = validateVisualBriefManifest({
    date,
    revision,
    title: brief.title,
    subtitle: brief.subtitle,
    generatedAt: now.toISOString(),
    sourceWindow: brief.sourceWindow,
    coverImageUrl: persistedSeedreamImages[0]?.assetUrl,
    generation: {
      contentMode: deepseek.diagnostics.contentMode,
      deepseekAttempts: deepseek.diagnostics.attempts,
      degradationReason: deepseek.diagnostics.degradationReason,
      candidateCount: source.items.length,
      sourceStats: source.sourceStats,
      excludedPreviousUrls: source.excludedPreviousUrls,
      selectedSourceUrls,
      candidatePool: source.items.map(({ title, url, source, category, publishedAt }) => ({
        title,
        url,
        source,
        category,
        publishedAt
      }))
    },
    article: {
      panels: brief.panels.map(({ kind, kicker, title, body, sourceUrls }) => ({
        kind,
        kicker,
        title,
        body,
        sourceUrls
      }))
    },
    illustrations: persistedSeedreamImages.map(({ assetUrl }, index) => ({
      index: index + 1,
      imageUrl: assetUrl
    })),
    panels
  });
  const manifestJson = JSON.stringify(manifest, null, 2);
  const manifestBlob = await putPublicBlob(
    articleManifestPath(date, revision),
    manifestJson,
    "application/json"
  );
  await putPublicBlob(
    articleManifestPath(date),
    manifestJson,
    "application/json"
  );
  await putPublicBlob(
    latestManifestPath(),
    JSON.stringify({ date, manifestUrl: manifestBlob.url, updatedAt: now.toISOString() }, null, 2),
    "application/json"
  );
  report("success", "manifest", "文章索引已写入 Vercel Blob");
  report("success", "system", "长图简报生成完成");
  return manifest;
}

function buildRunRevision(now: Date): string {
  return `run-${now.toISOString().replace(/\D/g, "")}`;
}

function toShanghaiDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function emitProgress(reporter: GenerationProgressReporter | undefined, event: Parameters<GenerationProgressReporter>[0]) {
  try {
    reporter?.(event);
  } catch {
    // A disconnected browser must not interrupt cron or Blob persistence.
  }
}

function remainingTimeBudgetMs(startedAt: number): number {
  return FUNCTION_TIME_BUDGET_MS - (Date.now() - startedAt);
}

function deepseekRequestTimeoutMs(startedAt: number): number {
  const remaining = remainingTimeBudgetMs(startedAt) - COMPLETION_SAFETY_MS - SEEDREAM_MIN_REMOTE_BUDGET_MS;
  return Math.max(1_000, Math.min(DEEPSEEK_REQUEST_TIMEOUT_MS, remaining));
}

function seedreamPhaseTimeoutMs(startedAt: number): number {
  const remaining = remainingTimeBudgetMs(startedAt) - COMPLETION_SAFETY_MS;
  return Math.max(0, Math.min(SEEDREAM_PHASE_TIMEOUT_MS, remaining));
}

function sourceProgressStage(
  event: ContentSourceProgressEvent
): Parameters<typeof createProgressLog>[1] {
  return event.id === "aggregate" ? "sources" : event.id;
}

function sourceProgressMessage(event: ContentSourceProgressEvent): string {
  if (event.status === "running") return `抓取 ${event.label}`;
  if (event.status === "error") return `${event.label} 暂时不可用，继续使用其他来源`;
  if (event.id === "aggregate") return `${event.label}，${event.detail ?? "处理完成"}，共 ${event.count ?? 0} 条`;
  return `${event.label} 抓取完成，共 ${event.count ?? 0} 条`;
}
