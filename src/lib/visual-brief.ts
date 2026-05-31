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

export const REQUIRED_VISUAL_PANEL_KINDS: VisualPanelKind[] = [
  "cover",
  "context",
  "news",
  "news",
  "news",
  "news",
  "news",
  "news",
  "takeaway",
  "footer"
];

const REQUIRED_MANIFEST_SHEET_KINDS: VisualPanelKind[] = ["cover", "news", "news", "takeaway"];

export { panelBlobPath };

export function normalizeVisualBrief(raw: string, context: BriefContext): VisualBriefDraft {
  try {
    const parsed = JSON.parse(stripJsonFence(raw)) as Partial<VisualBriefDraft>;
    const panels = Array.isArray(parsed.panels)
      ? parsed.panels.map(normalizePanel).filter((panel): panel is VisualBriefPanelDraft => panel !== null)
      : [];
    if (!parsed.title || !hasRequiredPanelOrder(panels)) {
      return buildFallbackVisualBrief(context);
    }

    return {
      date: context.date,
      title: String(parsed.title),
      subtitle: String(parsed.subtitle ?? "企业 AI 落地决策简报"),
      sourceWindow: context.sourceWindow,
      panels: panels as VisualBriefPanelDraft[]
    };
  } catch {
    return buildFallbackVisualBrief(context);
  }
}

export function buildFallbackVisualBrief(context: BriefContext): VisualBriefDraft {
  const main = itemAt(context.items, 0);
  const radar = [itemAt(context.items, 1), itemAt(context.items, 2), itemAt(context.items, 3)];
  const allUrls = context.items.map((item) => item.url).filter(Boolean).slice(0, 8);
  const windowLabel = context.sourceWindow === "24h" ? "过去 24 小时" : "最近 7 天";

  return {
    date: context.date,
    title: "企业 AI 落地信号图",
    subtitle: "把公开信号变成可执行判断",
    sourceWindow: context.sourceWindow,
    panels: [
      {
        kind: "cover",
        kicker: "ENTERPRISE AI",
        title: "企业 AI 落地信号图",
        body: [`从${windowLabel}的公开信号里，抓出真正影响企业效率与流程的变化。`],
        imagePrompt: "retrofuturistic vector illustration, enterprise AI signal radar, Beige Teal Amber, no readable text",
        sourceUrls: allUrls
      },
      {
        kind: "context",
        kicker: "今日脉络",
        title: "从工具热度走向稳定交付",
        body: [
          "企业真正需要的，不只是更强的模型。",
          "更重要的是让 Agent 在真实工作里可控、可验证、可复盘。"
        ],
        imagePrompt: "retrofuturistic vector illustration, enterprise AI workflow map, Beige Teal Amber, no readable text",
        sourceUrls: [main.url]
      },
      {
        kind: "news",
        kicker: "主线 01",
        title: main.title,
        body: [main.summary || "这条信号值得进入今天的企业 AI 趋势观察。", "它的价值在于能否改变真实工作方式。"],
        imagePrompt: promptForNews(main.title, "signal focus"),
        sourceUrls: [main.url]
      },
      {
        kind: "news",
        kicker: "主线 02",
        title: "它会怎样影响企业工作流",
        body: ["不要只看产品发布本身。", "继续追问它会怎样改变流程、权限、成本与验证方式。"],
        imagePrompt: promptForNews(main.title, "workflow transformation"),
        sourceUrls: [main.url]
      },
      {
        kind: "news",
        kicker: "主线 03",
        title: "现在可以做一个小范围验证",
        body: ["选一个高频、规则清楚的流程。", "先补齐上下文、权限和验收标准，再判断是否值得扩大。"],
        imagePrompt: promptForNews(main.title, "controlled enterprise pilot"),
        sourceUrls: [main.url]
      },
      ...radar.map((item, index): VisualBriefPanelDraft => ({
        kind: "news",
        kicker: `雷达 ${String(index + 1).padStart(2, "0")}`,
        title: item.title,
        body: [
          item.summary || "这条信号值得加入今天的观察清单。",
          "判断重点：它是否会改变团队的流程、权限、成本或验证方式。"
        ],
        imagePrompt: promptForNews(item.title, "enterprise AI radar"),
        sourceUrls: item.url ? [item.url] : []
      })),
      {
        kind: "takeaway",
        kicker: "给企业 AI 落地人的判断",
        title: "先做 Harness，再追热点",
        body: [
          "热点每天都在变。真正稀缺的是可重复运行、可验证、可复盘的 Agent 系统。",
          "把新闻沉淀成场景、动作和风险检查，才会形成组织能力。"
        ],
        imagePrompt: "retrofuturistic vector illustration, enterprise AI control panel and human review, Beige Teal Amber, no readable text",
        sourceUrls: allUrls
      },
      {
        kind: "footer",
        kicker: "明天继续",
        title: "把新闻变成组织记忆",
        body: ["本期由五路公开信号源自动生成。", "发布前请人工快速校对事实、链接和措辞。"],
        imagePrompt: "retrofuturistic vector illustration, archive of enterprise AI signals, Beige Teal Amber, no readable text",
        sourceUrls: []
      }
    ]
  };
}

export function validateVisualBriefManifest(input: unknown): VisualBriefManifest {
  const manifest = input as VisualBriefManifest;
  if (!manifest || typeof manifest !== "object") {
    throw new Error("Invalid manifest");
  }
  if (!manifest.date || !manifest.title || !Array.isArray(manifest.panels)) {
    throw new Error("Invalid manifest shape");
  }
  if (!hasRequiredManifestSheetOrder(manifest.panels)) {
    throw new Error("Invalid manifest panel order");
  }
  for (const [index, panel] of manifest.panels.entries()) {
    if (panel.index !== index + 1 || panel.width !== 1080 || !panel.imageUrl) {
      throw new Error("Invalid manifest panel");
    }
  }
  return manifest;
}

function hasRequiredPanelOrder(panels: Array<{ kind: VisualPanelKind }>): boolean {
  return (
    panels.length === REQUIRED_VISUAL_PANEL_KINDS.length &&
    panels.every((panel, index) => panel.kind === REQUIRED_VISUAL_PANEL_KINDS[index])
  );
}

function hasRequiredManifestSheetOrder(panels: Array<{ kind: VisualPanelKind }>): boolean {
  return (
    panels.length === REQUIRED_MANIFEST_SHEET_KINDS.length &&
    panels.every((panel, index) => panel.kind === REQUIRED_MANIFEST_SHEET_KINDS[index])
  );
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
    cover: "ENTERPRISE AI",
    context: "今日脉络",
    news: "重点信号",
    takeaway: "落地判断",
    footer: "明天继续"
  }[kind];
}

function itemAt(items: NormalizedContentItem[], index: number): NormalizedContentItem {
  return (
    items[index] ?? {
      title: "企业 Agent 正在进入稳定交付阶段",
      url: "",
      summary: "更值得关注的，不只是模型参数，而是上下文、权限、验证与复盘闭环。",
      source: "fallback",
      category: "enterprise-ai",
      tags: [],
      publishedAt: "",
      contentHash: `fallback:${index}`
    }
  );
}

function promptForNews(title: string, subject: string): string {
  return `retrofuturistic vector illustration, ${subject}, ${title}, Beige Teal Amber, editorial infographic, no readable text`;
}

function stripJsonFence(raw: string): string {
  return raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}
