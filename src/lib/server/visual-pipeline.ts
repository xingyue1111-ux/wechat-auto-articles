import {
  collectEnterpriseAiCandidates,
  type ContentSourceProgressEvent
} from "@/lib/content-sources/aggregate";
import type { VisualBriefManifest } from "@/lib/domain/types";
import { optionalEnv } from "@/lib/env";
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
  report("running", "deepseek", "调用 DeepSeek 生成简报结构");
  const briefText = await generateWithDeepSeek({
    system:
      "你是企业 AI 落地公众号的视觉新闻编辑。请输出严格 JSON，不要 markdown。重点关注 Agent 生产力、Harness Engineering、流程治理与可复用的企业实践。风格是复古未来主义。",
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
    onProgress: ({ index, total, status }) =>
      report(
        status === "running" ? "running" : "success",
        "seedream",
        status === "running" ? `Seedream 正在生成配图 ${index}/${total}` : `Seedream 配图 ${index}/${total} 已生成`
      )
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

function buildBriefPrompt(
  date: string,
  sourceWindow: string,
  items: Array<{ title: string; summary: string; url: string; source: string }>
): string {
  const news = items
    .slice(0, 30)
    .map((item, index) => `${index + 1}. ${item.title}\n来源：${item.source}\n摘要：${item.summary.slice(0, 600)}\n链接：${item.url}`)
    .join("\n\n");

  return `请基于多来源信号，生成一篇面向企业 AI 落地负责人的视觉决策简报。

日期：${date}
时间窗口：${sourceWindow}

必须输出 JSON，结构如下：
{
  "title": "短标题",
  "subtitle": "副标题",
  "panels": [
    {
      "kind": "cover|context|news|takeaway|footer",
      "kicker": "短标签",
      "title": "每屏大标题",
      "body": ["每屏 1-4 句短文案"],
      "imagePrompt": "英文 seedream 提示词，retrofuturistic vector illustration, Beige Teal Amber, no readable text",
      "sourceUrls": ["来源链接"]
    }
  ]
}

页面结构必须包含：封面、今日主线、3-4 屏主线深挖、3-4 条落地雷达简讯、给企业 AI 落地人的判断、结尾页。
请围绕一个真正影响企业效率、流程、治理、权限、安全、成本或组织协作的变化展开。
Coding Agent 和 Vibe Coding 是重要观察窗口，但除非发生重大变化，不要让整篇文章只服务开发者。
重点解释 Harness Engineering：上下文、规则、技能、权限、验证、复盘如何让 Agent 稳定完成工作。
排版方向参考中文科普公众号的连续长图分镜：大标题、短段落、强节奏、每屏一个观点。
不要复制任何具体 IP、角色形象或原文画风。

新闻素材：
${news}`;
}

async function persistRemoteImage(date: string, index: number, url: string): Promise<string> {
  if (url.startsWith("data:")) {
    return url;
  }

  try {
    const response = await fetch(url);
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
  if (event.id === "aggregate") return `${event.label}：${event.detail ?? "处理完成"}，共 ${event.count ?? 0} 条`;
  return `${event.label} 抓取完成，共 ${event.count ?? 0} 条`;
}
