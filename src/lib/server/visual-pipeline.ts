import { fetchAihotWithFallback } from "@/lib/aihot";
import type { VisualBriefManifest } from "@/lib/domain/types";
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
} = {}): Promise<VisualBriefManifest> {
  const now = input.now ?? new Date();
  const date = input.date ?? toShanghaiDate(now);
  const source = await fetchAihotWithFallback({ now, minItems: 5, take: 50 });
  const briefText = await generateWithDeepSeek({
    system:
      "你是公众号视觉新闻编辑。请输出严格 JSON，不要 markdown。风格是复古未来主义，给企业 AI 落地人阅读。",
    prompt: buildBriefPrompt(date, source.sourceWindow, source.items),
    fallback: JSON.stringify(buildFallbackVisualBrief({ date, sourceWindow: source.sourceWindow, items: source.items }))
  });
  const brief = normalizeVisualBrief(briefText, {
    date,
    sourceWindow: source.sourceWindow,
    items: source.items
  });
  const seedreamImages = await generateSeedreamImages({
    runId: date,
    prompts: brief.panels.map((panel) => panel.imagePrompt)
  });
  const persistedSeedreamUrls = await Promise.all(
    seedreamImages.map((image, index) => persistRemoteImage(date, index + 1, image.url))
  );

  const panels: VisualBriefManifest["panels"] = [];
  for (const [index, panel] of brief.panels.entries()) {
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
  }

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
  return manifest;
}

function buildBriefPrompt(
  date: string,
  sourceWindow: string,
  items: Array<{ title: string; summary: string; url: string; source: string }>
): string {
  const news = items
    .slice(0, 12)
    .map((item, index) => `${index + 1}. ${item.title}\n来源：${item.source}\n摘要：${item.summary}\n链接：${item.url}`)
    .join("\n\n");

  return `请基于 AI HOT 精选新闻，生成一篇由多张长图构成的视觉新闻简报。

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

页面结构必须包含：封面、今日脉络、5-7 条重点新闻卡、给企业 AI 落地人的判断、结尾页。
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
