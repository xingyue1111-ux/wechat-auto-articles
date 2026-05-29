import type {
  NormalizedContentItem,
  SourceWindow,
  VisualBriefDraft,
  VisualBriefManifest,
  VisualBriefPanelDraft,
  VisualPanelKind
} from "@/lib/domain/types";
import { panelBlobPath } from "@/lib/storage/paths";

type BriefContext = {
  date: string;
  sourceWindow: SourceWindow;
  items: NormalizedContentItem[];
};

export { panelBlobPath };

export function normalizeVisualBrief(raw: string, context: BriefContext): VisualBriefDraft {
  try {
    const parsed = JSON.parse(stripJsonFence(raw)) as Partial<VisualBriefDraft>;
    const panels = Array.isArray(parsed.panels) ? parsed.panels.map(normalizePanel).filter(Boolean) : [];
    if (!parsed.title || panels.length < 4) {
      return buildFallbackVisualBrief(context);
    }

    return ensureBriefShape({
      date: context.date,
      title: String(parsed.title),
      subtitle: String(parsed.subtitle ?? "AI HOT 视觉新闻简报"),
      sourceWindow: context.sourceWindow,
      panels: panels as VisualBriefPanelDraft[]
    }, context);
  } catch {
    return buildFallbackVisualBrief(context);
  }
}

export function buildFallbackVisualBrief(context: BriefContext): VisualBriefDraft {
  const newsItems = context.items.slice(0, 6);
  const title = "今天 AI 圈的信号图";
  const panels: VisualBriefPanelDraft[] = [
    {
      kind: "cover",
      kicker: "AI HOT",
      title,
      body: [
        `从 ${context.sourceWindow === "24h" ? "过去 24 小时" : "最近 7 天"}精选新闻里，抓出最值得企业 AI 落地人注意的变化。`,
        "这不是新闻列表，而是一张给内部流程建设者看的信号地图。"
      ],
      imagePrompt: "retrofuturistic vector illustration, AI news radar, beige teal amber palette, clean editorial infographic",
      sourceUrls: newsItems.map((item) => item.url)
    },
    {
      kind: "context",
      kicker: "今日脉络",
      title: "AI 正在从工具走向流程",
      body: [
        "今天的重点不是某一个模型参数，而是多个产品都在把 AI 能力嵌进工作流。",
        "对企业来说，真正的机会在于把采集、判断、生成、审核、发布串成稳定链路。"
      ],
      imagePrompt: "retrofuturistic vector illustration, workflow map, signal lines, beige teal amber, no readable text",
      sourceUrls: newsItems.map((item) => item.url)
    },
    ...newsItems.map((item, index): VisualBriefPanelDraft => ({
      kind: "news",
      kicker: `重点 ${String(index + 1).padStart(2, "0")}`,
      title: item.title,
      body: [
        item.summary || "这条新闻值得放进今天的 AI 趋势观察里。",
        "落地提醒：不要只看发布本身，要看它会不会改变团队的信息流、审批流或创作流。"
      ],
      imagePrompt: `retrofuturistic vector illustration for AI news: ${item.title}, beige teal amber palette, editorial long-image style, no readable text`,
      sourceUrls: [item.url]
    })),
    {
      kind: "takeaway",
      kicker: "给企业 AI 落地人的判断",
      title: "先做链路，再追热点",
      body: [
        "热点每天都会变，但企业真正需要的是可重复运行的内容和流程系统。",
        "如果一条新闻不能转化成场景、动作和风险检查，它就只是信息噪音。"
      ],
      imagePrompt: "retrofuturistic vector illustration, enterprise AI control panel, human-in-the-loop workflow, beige teal amber",
      sourceUrls: newsItems.map((item) => item.url)
    },
    {
      kind: "footer",
      kicker: "明天继续",
      title: "把新闻变成组织记忆",
      body: [
        "今日简报由 AI HOT 精选新闻自动生成。",
        "适合发布前人工快速校对事实、链接和措辞。"
      ],
      imagePrompt: "retrofuturistic vector illustration, archive of AI signals, clean ending page, beige teal amber",
      sourceUrls: []
    }
  ];

  return ensureBriefShape({
    date: context.date,
    title,
    subtitle: "复古未来主义 AI 视觉新闻简报",
    sourceWindow: context.sourceWindow,
    panels
  }, context);
}

export function validateVisualBriefManifest(input: unknown): VisualBriefManifest {
  const manifest = input as VisualBriefManifest;
  if (!manifest || typeof manifest !== "object") {
    throw new Error("Invalid manifest");
  }
  if (!manifest.date || !manifest.title || !Array.isArray(manifest.panels)) {
    throw new Error("Invalid manifest shape");
  }
  for (const [index, panel] of manifest.panels.entries()) {
    if (panel.index !== index + 1 || panel.width !== 1080 || !panel.imageUrl) {
      throw new Error("Invalid manifest panel");
    }
  }
  return manifest;
}

function ensureBriefShape(brief: VisualBriefDraft, context: BriefContext): VisualBriefDraft {
  const panels = [...brief.panels];
  if (panels[0]?.kind !== "cover") {
    panels.unshift(buildFallbackVisualBrief({ ...context, items: context.items.slice(0, 1) }).panels[0]);
  }
  if (!panels.some((panel) => panel.kind === "takeaway")) {
    panels.push({
      kind: "takeaway",
      kicker: "判断",
      title: "真正重要的是可复用链路",
      body: ["把新闻沉淀成流程判断，比追逐单个热点更重要。"],
      imagePrompt: "retrofuturistic enterprise AI workflow infographic, beige teal amber",
      sourceUrls: context.items.map((item) => item.url).slice(0, 6)
    });
  }
  if (panels.at(-1)?.kind !== "footer") {
    panels.push({
      kind: "footer",
      kicker: "END",
      title: "把新闻变成组织记忆",
      body: ["今日简报由 AI HOT 精选新闻自动生成。"],
      imagePrompt: "retrofuturistic AI archive illustration, beige teal amber",
      sourceUrls: []
    });
  }

  return {
    ...brief,
    panels: panels.slice(0, 10)
  };
}

function normalizePanel(value: unknown): VisualBriefPanelDraft | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const panel = value as Partial<VisualBriefPanelDraft>;
  const kind = normalizeKind(panel.kind);
  if (!kind || !panel.title) {
    return null;
  }
  return {
    kind,
    kicker: String(panel.kicker ?? labelForKind(kind)),
    title: String(panel.title),
    body: Array.isArray(panel.body) ? panel.body.map(String).filter(Boolean).slice(0, 4) : [],
    imagePrompt: String(panel.imagePrompt ?? `retrofuturistic vector illustration for ${panel.title}`),
    sourceUrls: Array.isArray(panel.sourceUrls) ? panel.sourceUrls.map(String).filter(Boolean) : []
  };
}

function normalizeKind(value: unknown): VisualPanelKind | null {
  const allowed: VisualPanelKind[] = ["cover", "context", "news", "takeaway", "footer"];
  return allowed.includes(value as VisualPanelKind) ? (value as VisualPanelKind) : null;
}

function labelForKind(kind: VisualPanelKind): string {
  return {
    cover: "AI HOT",
    context: "今日脉络",
    news: "重点新闻",
    takeaway: "落地判断",
    footer: "明天继续"
  }[kind];
}

function stripJsonFence(raw: string): string {
  return raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}
