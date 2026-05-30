import {
  collectEnterpriseAiCandidates,
  type ContentSourceProgressEvent
} from "@/lib/content-sources/aggregate";
import type { VisualBriefManifest } from "@/lib/domain/types";
import { optionalEnv } from "@/lib/env";
import { BRIEF_SYSTEM_PROMPT, buildBriefPrompt } from "@/lib/server/brief-prompt";
import {
  createProgressLog,
  type GenerationProgressReporter
} from "@/lib/server/generation-progress";
import { generateWithDeepSeek } from "@/lib/services/deepseek";
import { generateSeedreamImages } from "@/lib/services/seedream";
import { putPublicBlob } from "@/lib/storage/blob";
import { articleManifestPath, latestManifestPath, panelBlobPath, seedreamBlobPath } from "@/lib/storage/paths";
import { buildFallbackVisualBrief, normalizeVisualBrief, validateVisualBriefManifest } from "@/lib/visual-brief";
import { buildPanelRenderPlan } from "@/lib/visual-render/render-plan";
import { renderPanelPng } from "@/lib/visual-render/render-panel";

export async function generateDailyVisualBrief(input: {
  now?: Date;
  date?: string;
  onProgress?: GenerationProgressReporter;
} = {}): Promise<VisualBriefManifest> {
  const now = input.now ?? new Date();
  const date = input.date ?? toShanghaiDate(now);
  const report = (
    level: Parameters<typeof createProgressLog>[0],
    stage: Parameters<typeof createProgressLog>[1],
    message: string,
    detail?: string
  ) => emitProgress(input.onProgress, createProgressLog(level, stage, message, detail));

  report("info", "system", `创建 ${date} 的企业 AI 落地长图简报任务`);
  report("running", "sources", "并行抓取五路公开信号源");
  const source = await collectEnterpriseAiCandidates({
    now,
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

  report("running", "deepseek", "调用 DeepSeek 生成固定 10 屏简报结构");
  const briefText = await generateWithDeepSeek({
    system: BRIEF_SYSTEM_PROMPT,
    prompt: buildBriefPrompt(date, source.sourceWindow, source.items),
    fallback: JSON.stringify(buildFallbackVisualBrief({ date, sourceWindow: source.sourceWindow, items: source.items }))
  });
  const brief = normalizeVisualBrief(briefText, {
    date,
    sourceWindow: source.sourceWindow,
    items: source.items
  });
  report(
    "success",
    "deepseek",
    `简报结构已确认，共 ${brief.panels.length} 个长图分镜`,
    optionalEnv("DEEPSEEK_API_KEY") ? "使用 DeepSeek API" : "未配置 DEEPSEEK_API_KEY，使用规则化兜底内容"
  );

  if (!optionalEnv("ARK_API_KEY") || !optionalEnv("ARK_SEEDREAM_MODEL")) {
    report("info", "seedream", "未配置完整 Seedream 参数，将使用本地占位配图");
  }
  const seedreamImages = await generateSeedreamImages({
    runId: date,
    prompts: brief.panels.map((panel) => panel.imagePrompt),
    onProgress: ({ index, total, status, detail }) => {
      if (status === "running") {
        report("running", "seedream", `Seedream 正在生成配图 ${index}/${total}`);
      } else if (status === "retrying") {
        report("running", "seedream", `Seedream 配图 ${index}/${total} 首次未完成，正在重试`, detail);
      } else if (status === "degraded") {
        report("error", "seedream", `Seedream 配图 ${index}/${total} 已降级为占位图`, detail);
      } else {
        report("success", "seedream", `Seedream 配图 ${index}/${total} 已生成`);
      }
    }
  });

  const persistedSeedreamUrls = await Promise.all(
    seedreamImages.map(async (image, index) => {
      report("running", "blob", `保存配图素材 ${index + 1}/${seedreamImages.length}`);
      const url = await persistRemoteImage(date, index + 1, image.url);
      report("success", "blob", `配图素材 ${index + 1}/${seedreamImages.length} 已保存`);
      return url;
    })
  );

  const panels: VisualBriefManifest["panels"] = [];
  for (const [index, panel] of brief.panels.entries()) {
    report("running", "render", `渲染 PNG 长图 ${index + 1}/${brief.panels.length}`, panel.title);
    const plan = buildPanelRenderPlan({
      ...panel,
      index: index + 1,
      seedreamImageUrl: persistedSeedreamUrls[index] ?? seedreamImages[index]?.url
    });
    const png = await renderPanelPng(plan);
    const blob = await putPublicBlob(panelBlobPath(date, index + 1, panel.kind), png, "image/png");
    panels.push({
      index: index + 1,
      kind: panel.kind,
      title: panel.title,
      imageUrl: blob.url,
      width: plan.width,
      height: plan.height,
      sourceUrls: panel.sourceUrls
    });
    report("success", "render", `PNG 长图 ${index + 1}/${brief.panels.length} 已上传`);
  }

  report("running", "manifest", "写入文章索引和 latest 指针");
  const manifest = validateVisualBriefManifest({
    date,
    title: brief.title,
    subtitle: brief.subtitle,
    generatedAt: now.toISOString(),
    sourceWindow: brief.sourceWindow,
    panels
  });
  const manifestBlob = await putPublicBlob(
    articleManifestPath(date),
    JSON.stringify(manifest, null, 2),
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

async function persistRemoteImage(date: string, index: number, url: string): Promise<string> {
  if (url.startsWith("data:")) {
    return url;
  }

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) {
      return url;
    }
    const contentType = response.headers.get("content-type") ?? "image/png";
    const body = new Uint8Array(await response.arrayBuffer());
    const blob = await putPublicBlob(seedreamBlobPath(date, index), body, contentType);
    return blob.url;
  } catch {
    return url;
  }
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
