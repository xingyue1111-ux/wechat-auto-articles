import type {
  NormalizedContentItem,
  SourceWindow,
  VisualBriefDraft,
  VisualBriefManifest,
  VisualBriefPanelDraft,
  VisualPanelKind
} from "@/lib/domain/types";
import { panelBlobPath } from "@/lib/storage/paths";

export type BriefContext = {
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
  return normalizeVisualBriefWithDiagnostics(raw, context).brief;
}

export function normalizeVisualBriefWithDiagnostics(
  raw: string,
  context: BriefContext
): { brief: VisualBriefDraft; usedFallback: boolean; reason?: string } {
  try {
    const parsed = JSON.parse(stripJsonFence(raw)) as Partial<VisualBriefDraft>;
    const panels = Array.isArray(parsed.panels)
      ? parsed.panels.map(normalizePanel).filter((panel): panel is VisualBriefPanelDraft => panel !== null)
      : [];
    if (!parsed.title || !hasRequiredPanelOrder(panels) || !hasValidWechatArticleLength(panels)) {
      return {
        brief: buildFallbackVisualBrief(context),
        usedFallback: true,
        reason: "DeepSeek JSON 缺少标题、没有严格返回固定 10 屏结构，或正文不在 1400-1600 字范围内"
      };
    }
    const fallback = buildFallbackVisualBrief(context);

    return {
      brief: {
        date: context.date,
        title: chineseOrFallback(String(parsed.title), fallback.title),
        subtitle: chineseOrFallback(String(parsed.subtitle ?? ""), fallback.subtitle),
        sourceWindow: context.sourceWindow,
        panels: panels.map((panel, index) => ensureReaderFacingChinese(panel, fallback.panels[index]))
      },
      usedFallback: false
    };
  } catch {
    return {
      brief: buildFallbackVisualBrief(context),
      usedFallback: true,
      reason: "DeepSeek 返回内容不是合法 JSON"
    };
  }
}

export function buildFallbackVisualBrief(context: BriefContext): VisualBriefDraft {
  const main = itemAt(context.items, 0);
  const radar = [itemAt(context.items, 1), itemAt(context.items, 2), itemAt(context.items, 3)];
  const allUrls = context.items.map((item) => item.url).filter(Boolean).slice(0, 8);
  const windowLabel = context.sourceWindow === "24h" ? "过去 24 小时" : "最近 7 天";
  const mainTitle = chineseOrFallback(main.title, "企业 AI 工具正在改变成本与交付方式");
  const mainSummary = chineseOrFallback(main.summary, "这条公开信号值得进入今天的企业 AI 趋势观察。");
  const fallbackBodies = [
    [
      `从${windowLabel}的公开信号里，可以看到企业 AI 正在进入一个更务实的阶段。团队不再只讨论模型参数和演示效果，而是开始关心一件更具体的事：这些能力能不能稳定地放进真实流程，持续节省时间，并且在出错时被快速发现。`
    ],
    [
      "今天最值得关注的，不是又出现了一个新工具，而是企业判断标准正在改变。过去大家习惯问模型能做什么，现在更需要问任务由谁发起、资料从哪里来、哪些动作允许自动执行、结果由谁验收，以及失败后怎样恢复。",
      mainSummary.slice(0, 100)
    ],
    [
      "这条公开信号的变化值得关注，不是因为它又增加了一个新功能，而是因为企业开始把模型能力放进真实流程。过去很多团队停留在演示阶段：能回答问题、能生成内容、能调用少量工具，但一旦进入稳定交付，就会遇到上下文不完整、权限边界不清楚、结果无法复核等问题。",
      "当流程只有一两次演示时，这些问题容易被忽略。真正开始日常使用后，任何一次资料遗漏、权限越界或错误输出，都会增加人工检查成本。企业要解决的不是单次效果，而是连续运行时的可靠性。"
    ],
    [
      "真正的变化发生在工作方式上。企业不再只问模型聪不聪明，而是开始追问任务是否可拆分、输入是否稳定、操作是否留痕、异常是否会被拦截。只有这些问题被回答，Agent 才不是一次性的演示，而是可以持续运行的生产能力。"
    ],
    [
      "这也是为什么 Harness Engineering 变得重要。模型只是系统的一部分，外层还需要明确的上下文、工具接口、权限控制、日志和验收标准。很多效果差异，并不来自更换模型，而来自是否把任务拆清楚、把输入准备好、把结果检查机制放在正确的位置。",
      "一个稳定系统还需要知道什么时候不要自动执行。涉及外部发布、资金、客户数据或高风险判断时，保留人工确认不是效率低，而是必要的责任边界。自动化的价值来自减少重复工作，不是取消所有判断。"
    ],
    [
      "对企业来说，这会改变投入顺序。与其一开始追求覆盖所有部门，不如先选一个高频、规则清楚、结果容易检查的流程。先把人工做法写清楚，再让 Agent 接管其中可验证的一段。这样才能知道效率提升来自哪里，也能在出错时快速定位。"
    ],
    [
      "落地时需要同时看三件事：第一，任务是否重复发生；第二，输入和权限是否可控；第三，输出是否能被明确验收。如果一个场景无法说明什么叫做正确结果，就不适合直接自动化。先补齐标准，再谈规模化，通常会更快。",
      "衡量结果时也要克制。不要只看完成了多少任务，还要看人工复核用了多久、哪些错误反复出现、是否产生新的沟通成本。只有把这些数字留下来，团队才知道下一轮应该优化模型、流程还是输入资料。"
    ],
    [
      "下一步可以从一个两周试验开始。选一个真实流程，记录人工耗时、返工次数和常见错误；让 Agent 只处理边界明确的部分；保留人工审核；每周复盘失败案例。试验结束后，再决定扩大范围、继续调整，还是暂停投入。",
      "如果试验没有明显收益，也要允许及时停止。暂停不是失败，而是说明当前场景、数据或流程还没有准备好。把原因记录下来，通常比勉强扩大范围更有价值。"
    ],
    [
      "判断一个试验值不值得扩大，不要只看生成速度。还要看返工是否减少、责任是否清楚、异常是否可追踪、团队是否愿意持续使用。只有这些指标同时改善，自动化才真正变成组织能力，而不是一次漂亮的演示。",
      "热点每天都会变化，但企业真正需要积累的是稳定方法。把新闻沉淀成场景、动作、权限和验收标准，再通过小范围试验持续修正，才更容易把 AI 变成可复用的生产力。"
    ],
    [
      "本期内容来自公开信号的自动整理。发布前仍需人工校对事实、链接和措辞，并根据团队实际情况调整行动建议。"
    ]
  ];

  return {
    date: context.date,
    title: "企业 AI 落地信号图",
    subtitle: "把公开信号变成可执行判断",
    sourceWindow: context.sourceWindow,
    panels: [
      {
        kind: "cover",
        kicker: "ENTERPRISE AI",
        title: mainTitle,
        body: fallbackBodies[0],
        imagePrompt: "retrofuturistic vector illustration, enterprise AI signal radar, Beige Teal Amber, no readable text",
        sourceUrls: allUrls
      },
      {
        kind: "context",
        kicker: "今日脉络",
        title: "从工具热度走向稳定交付",
        body: fallbackBodies[1],
        imagePrompt: "retrofuturistic vector illustration, enterprise AI workflow map, Beige Teal Amber, no readable text",
        sourceUrls: [main.url]
      },
      {
        kind: "news",
        kicker: "主线 01",
        title: mainTitle,
        body: fallbackBodies[2],
        imagePrompt: promptForNews(main.title, "signal focus"),
        sourceUrls: [main.url]
      },
      {
        kind: "news",
        kicker: "主线 02",
        title: "它会怎样影响企业工作流",
        body: fallbackBodies[3],
        imagePrompt: promptForNews(main.title, "workflow transformation"),
        sourceUrls: [main.url]
      },
      {
        kind: "news",
        kicker: "主线 03",
        title: "现在可以做一个小范围验证",
        body: fallbackBodies[4],
        imagePrompt: promptForNews(main.title, "controlled enterprise pilot"),
        sourceUrls: [main.url]
      },
      ...radar.map((item, index): VisualBriefPanelDraft => ({
        kind: "news",
        kicker: `文章 ${String(index + 4).padStart(2, "0")}`,
        title: chineseOrFallback(item.title, ["投入顺序正在变化", "判断场景是否适合自动化", "把试验变成组织能力"][index]),
        body: fallbackBodies[index + 5],
        imagePrompt: promptForNews(item.title, "enterprise AI radar"),
        sourceUrls: item.url ? [item.url] : []
      })),
      {
        kind: "takeaway",
        kicker: "给企业 AI 落地人的判断",
        title: "先做 Harness，再追热点",
        body: fallbackBodies[8],
        imagePrompt: "retrofuturistic vector illustration, enterprise AI control panel and human review, Beige Teal Amber, no readable text",
        sourceUrls: allUrls
      },
      {
        kind: "footer",
        kicker: "明天继续",
        title: "把新闻变成组织记忆",
        body: fallbackBodies[9],
        imagePrompt: "retrofuturistic vector illustration, archive of enterprise AI signals, Beige Teal Amber, no readable text",
        sourceUrls: []
      }
    ]
  };
}

export function countWechatArticleCharacters(panels: VisualBriefPanelDraft[]): number {
  return panels.flatMap((panel) => panel.body).join("").length;
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
  if (!hasValidManifestArchive(manifest)) {
    throw new Error("Invalid manifest archive");
  }
  for (const [index, panel] of manifest.panels.entries()) {
    if (panel.index !== index + 1 || panel.width !== 1080 || !panel.imageUrl) {
      throw new Error("Invalid manifest panel");
    }
  }
  return manifest;
}

function hasValidManifestArchive(manifest: VisualBriefManifest): boolean {
  if (manifest.coverImageUrl !== undefined && (typeof manifest.coverImageUrl !== "string" || !manifest.coverImageUrl)) {
    return false;
  }
  if (manifest.generation !== undefined) {
    const generation = manifest.generation;
    if (
      !generation ||
      !["deepseek", "fallback"].includes(generation.contentMode) ||
      typeof generation.deepseekAttempts !== "number" ||
      typeof generation.candidateCount !== "number" ||
      !Array.isArray(generation.sourceStats) ||
      !generation.sourceStats.every((source) =>
        Boolean(source && typeof source.id === "string" && typeof source.label === "string" && typeof source.count === "number")
      ) ||
      !Array.isArray(generation.excludedPreviousUrls) ||
      !generation.excludedPreviousUrls.every((url) => typeof url === "string") ||
      !Array.isArray(generation.selectedSourceUrls) ||
      !generation.selectedSourceUrls.every((url) => typeof url === "string") ||
      !Array.isArray(generation.candidatePool) ||
      !generation.candidatePool.every((item) =>
        Boolean(
          item &&
          typeof item.title === "string" &&
          typeof item.url === "string" &&
          typeof item.source === "string" &&
          typeof item.category === "string" &&
          typeof item.publishedAt === "string"
        )
      )
    ) {
      return false;
    }
  }
  if (manifest.article !== undefined) {
    if (!manifest.article || !Array.isArray(manifest.article.panels)) {
      return false;
    }
    if (!manifest.article.panels.every((panel) =>
      Boolean(
        panel &&
        normalizeKind(panel.kind) &&
        typeof panel.kicker === "string" &&
        typeof panel.title === "string" &&
        Array.isArray(panel.body) &&
        panel.body.every((line) => typeof line === "string") &&
        Array.isArray(panel.sourceUrls) &&
        panel.sourceUrls.every((url) => typeof url === "string")
      )
    )) {
      return false;
    }
  }
  if (manifest.illustrations !== undefined) {
    if (!Array.isArray(manifest.illustrations)) {
      return false;
    }
    if (!manifest.illustrations.every((illustration, index) =>
      Boolean(
        illustration &&
        illustration.index === index + 1 &&
        typeof illustration.imageUrl === "string" &&
        illustration.imageUrl
      )
    )) {
      return false;
    }
  }
  return true;
}

function hasRequiredPanelOrder(panels: Array<{ kind: VisualPanelKind }>): boolean {
  return (
    panels.length === REQUIRED_VISUAL_PANEL_KINDS.length &&
    panels.every((panel, index) => panel.kind === REQUIRED_VISUAL_PANEL_KINDS[index])
  );
}

function hasValidWechatArticleLength(panels: VisualBriefPanelDraft[]): boolean {
  const length = countWechatArticleCharacters(panels);
  return length >= 1400 && length <= 1600;
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

function ensureReaderFacingChinese(
  panel: VisualBriefPanelDraft,
  fallback: VisualBriefPanelDraft
): VisualBriefPanelDraft {
  return {
    ...panel,
    title: chineseOrFallback(panel.title, fallback.title),
    body: panel.body.map((line, index) => chineseOrFallback(line, fallback.body[index] ?? "请关注这条企业 AI 落地信号。"))
  };
}

function chineseOrFallback(value: string, fallback: string): string {
  return /[\u3400-\u9fff]/u.test(value) ? value : fallback;
}

function stripJsonFence(raw: string): string {
  return raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}
