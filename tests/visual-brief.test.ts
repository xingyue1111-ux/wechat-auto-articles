import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildFallbackVisualBrief,
  normalizeVisualBrief,
  normalizeVisualBriefWithDiagnostics,
  panelBlobPath,
  validateVisualBriefManifest
} from "@/lib/visual-brief";
import type { NormalizedContentItem } from "@/lib/domain/types";

describe("visual brief generation", () => {
  it("falls back to a stable visual brief when model JSON is invalid", () => {
    const items = [
      item("1", "OpenAI ships a workflow product", "AI workflow summary"),
      item("2", "Anthropic updates enterprise controls", "Enterprise control summary"),
      item("3", "Google launches model feature", "Model feature summary"),
      item("4", "AI coding tool adds agents", "Coding agent summary"),
      item("5", "New paper evaluates RAG", "RAG paper summary")
    ];

    const brief = normalizeVisualBrief("not-json", {
      date: "2026-05-29",
      sourceWindow: "24h",
      items
    });

    expect(brief.date).toBe("2026-05-29");
    expect(brief.sourceWindow).toBe("24h");
    expect(brief.panels.map((panel) => panel.kind)).toEqual([
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
    ]);
    expect(brief.panels[2].imagePrompt).toContain("retrofuturistic");
  });

  it("falls back when model JSON does not follow the ten-panel order", () => {
    const panels = Array.from({ length: 10 }, (_, index) => ({
      kind: "news",
      kicker: `Panel ${index + 1}`,
      title: `Panel ${index + 1}`,
      body: ["Body"],
      imagePrompt: "retrofuturistic illustration",
      sourceUrls: []
    }));

    const brief = normalizeVisualBrief(JSON.stringify({ title: "Invalid custom title", panels }), {
      date: "2026-05-29",
      sourceWindow: "24h",
      items: [item("1", "A", "A summary")]
    });

    expect(brief.title).toBe("企业 AI 工具正在改变成本与交付方式");
    expect(brief.panels).toHaveLength(10);
  });

  it("uses the main source headline as the fallback article title when it is Chinese", () => {
    const brief = buildFallbackVisualBrief({
      date: "2026-05-29",
      sourceWindow: "24h",
      items: [item("1", "智能体安全进入生产环境", "企业开始关注权限、审计和可恢复流程")]
    });

    expect(brief.title).toBe("智能体安全进入生产环境");
  });

  it("replaces generic model titles with the first concrete article section title", () => {
    const panels = validPanelsForTitleTest();
    panels[0].title = "企业 AI 落地信号图";
    panels[1].title = "今日脉络";
    panels[2].title = "攻击者智能化：AI 恶意账户风险飙升";

    const brief = normalizeVisualBrief(JSON.stringify({
      title: "企业 AI 落地信号图",
      subtitle: "把公开信号变成可执行判断",
      panels
    }), {
      date: "2026-06-03",
      sourceWindow: "24h",
      items: [item("1", "Anthropic threat report", "AI abuse risk is rising")]
    });

    expect(brief.title).toBe("攻击者智能化：AI 恶意账户风险飙升");
    expect(brief.panels[0].title).toBe("攻击者智能化：AI 恶意账户风险飙升");
  });

  it("replaces broad AI placeholder titles with a concrete section title", () => {
    const panels = validPanelsForTitleTest();
    panels[0].title = "AI 应用日报";
    panels[2].title = "多模态应用正在从演示走向日常工具";

    const brief = normalizeVisualBrief(JSON.stringify({
      title: "AI 应用日报",
      subtitle: "把公开信号变成可理解的应用判断",
      panels
    }), {
      date: "2026-06-07",
      sourceWindow: "24h",
      items: [item("1", "Multimodal model update", "AI application signal")]
    });

    expect(brief.title).toBe("多模态应用正在从演示走向日常工具");
    expect(brief.panels[0].title).toBe("多模态应用正在从演示走向日常工具");
  });

  it("does not expose raw English headlines in fallback reader copy", () => {
    const brief = buildFallbackVisualBrief({
      date: "2026-05-29",
      sourceWindow: "24h",
      items: [item("1", "AgentDoG continuous coding agents", "A scalable alignment framework")]
    });

    expect(brief.panels[2].title).toBe("企业 AI 工具正在改变成本与交付方式");
    expect(brief.panels[2].body[0]).toContain("公开信号");
    expect(brief.panels[5].title).not.toBe("AgentDoG continuous coding agents");
    expect(brief.panels[5].title).toMatch(/[\u3400-\u9fff]/u);
  });

  it("keeps fallback article copy close to fifteen hundred Chinese characters", () => {
    const brief = buildFallbackVisualBrief({
      date: "2026-05-29",
      sourceWindow: "24h",
      items: [item("1", "Agent workflow update", "Enterprise AI workflow summary")]
    });
    const bodyLength = brief.panels.flatMap((panel) => panel.body).join("").length;

    expect(bodyLength).toBeGreaterThanOrEqual(1400);
    expect(bodyLength).toBeLessThanOrEqual(1600);
  });

  it("repairs a missing top-level title from concrete model panels instead of falling back", () => {
    const panels = modelArticlePanels({ charsPerPanel: 150 });
    const normalized = normalizeVisualBriefWithDiagnostics(JSON.stringify({
      subtitle: "把公开信号变成可执行判断",
      panels
    }), {
      date: "2026-06-07",
      sourceWindow: "24h",
      items: [item("1", "兜底标题不应该被使用", "兜底摘要")]
    });

    expect(normalized.usedFallback).toBe(false);
    expect(normalized.brief.title).toBe("智能体权限治理进入交付阶段");
    expect(normalized.brief.panels).toHaveLength(10);
  });

  it("pads slightly short model articles to the required publishing length instead of falling back", () => {
    const normalized = normalizeVisualBriefWithDiagnostics(JSON.stringify({
      title: "智能体权限治理进入交付阶段",
      subtitle: "把公开信号变成可执行判断",
      panels: modelArticlePanels({ charsPerPanel: 120 })
    }), {
      date: "2026-06-07",
      sourceWindow: "24h",
      items: [item("1", "兜底标题不应该被使用", "兜底摘要")]
    });
    const bodyLength = normalized.brief.panels.flatMap((panel) => panel.body).join("").length;

    expect(normalized.usedFallback).toBe(false);
    expect(normalized.brief.title).toBe("智能体权限治理进入交付阶段");
    expect(bodyLength).toBeGreaterThanOrEqual(1400);
    expect(bodyLength).toBeLessThanOrEqual(1600);
  });

  it("does not truncate valid model article paragraphs before length validation", () => {
    const normalized = normalizeVisualBriefWithDiagnostics(JSON.stringify({
      title: "智能体权限治理进入交付阶段",
      subtitle: "把公开信号变成可执行判断",
      panels: modelArticlePanels({ linesPerPanel: 5, charsPerLine: 30 })
    }), {
      date: "2026-06-07",
      sourceWindow: "24h",
      items: [item("1", "兜底标题不应该被使用", "兜底摘要")]
    });

    expect(normalized.usedFallback).toBe(false);
    expect(normalized.brief.panels[2].body).toHaveLength(5);
  });

  it("keeps manifest order and blob paths stable", () => {
    const brief = buildFallbackVisualBrief({
      date: "2026-05-29",
      sourceWindow: "7d",
      items: [item("1", "A", "A summary")]
    });

    const manifest = validateVisualBriefManifest({
      date: brief.date,
      title: brief.title,
      subtitle: brief.subtitle,
      generatedAt: "2026-05-29T11:00:00.000Z",
      sourceWindow: brief.sourceWindow,
      panels: [
        { kind: "cover", title: "封面与今日脉络" },
        { kind: "news", title: "主线拆解" },
        { kind: "news", title: "雷达信号" },
        { kind: "takeaway", title: "落地判断" }
      ].map((panel, index) => ({
        index: index + 1,
        kind: panel.kind,
        title: panel.title,
        imageUrl: `https://blob.example/${panelBlobPath(brief.date, index + 1)}`,
        width: 1080,
        height: 1500,
        sourceUrls: panel.sourceUrls
      }))
    });

    expect(manifest.panels.map((panel) => panel.index)).toEqual([1, 2, 3, 4]);
    expect(panelBlobPath("2026-05-29", 1)).toBe("articles/2026-05-29/panels/01-cover.png");
    expect(panelBlobPath("2026-05-29", 5, "footer")).toBe("articles/2026-05-29/panels/05-footer.png");
  });

  it("keeps archived article copy and Seedream illustrations", () => {
    const manifest = validateVisualBriefManifest({
      date: "2026-05-31",
      title: "企业 AI 日报",
      subtitle: "过去 24 小时",
      generatedAt: "2026-05-31T11:00:00.000Z",
      sourceWindow: "24h",
      article: {
        panels: [{
          kind: "cover",
          kicker: "本日主线",
          title: "企业 AI 日报",
          body: ["正文"],
          sourceUrls: ["https://example.com/source"]
        }]
      },
      illustrations: [{ index: 1, imageUrl: "https://blob.example/seedream-01.png" }],
      panels: manifestPanels()
    });

    expect(manifest.article?.panels[0].body).toEqual(["正文"]);
    expect(manifest.illustrations?.[0].imageUrl).toContain("seedream-01.png");
  });

  it("allows new article manifests without rendered long-image panels", () => {
    const manifest = validateVisualBriefManifest({
      date: "2026-06-09",
      title: "火山引擎 TRAE Work 企业版上线",
      subtitle: "把公开信号变成可执行判断",
      generatedAt: "2026-06-09T11:00:00.000Z",
      sourceWindow: "24h",
      article: {
        panels: [{
          kind: "cover",
          kicker: "本日主线",
          title: "火山引擎 TRAE Work 企业版上线",
          body: ["正文"],
          sourceUrls: ["https://example.com/source"]
        }]
      },
      illustrations: [{ index: 1, imageUrl: "https://blob.example/seedream-01.png" }],
      panels: []
    });

    expect(manifest.panels).toEqual([]);
    expect(manifest.article?.panels[0].title).toContain("TRAE Work");
  });

  it("repairs generic archived manifest titles from saved article sections", () => {
    const manifest = validateVisualBriefManifest({
      date: "2026-06-03",
      title: "企业 AI 落地信号图",
      subtitle: "把公开信号变成可执行判断",
      generatedAt: "2026-06-03T11:00:00.000Z",
      sourceWindow: "24h",
      article: {
        panels: [
          { kind: "cover", kicker: "ENTERPRISE AI", title: "企业 AI 落地信号图", body: ["正文"], sourceUrls: [] },
          { kind: "context", kicker: "今日脉络", title: "今日脉络", body: ["正文"], sourceUrls: [] },
          { kind: "news", kicker: "主线 01", title: "攻击者智能化：AI 恶意账户风险飙升", body: ["正文"], sourceUrls: [] }
        ]
      },
      panels: manifestPanels()
    });

    expect(manifest.title).toBe("攻击者智能化：AI 恶意账户风险飙升");
    expect(manifest.article?.panels[0].title).toBe("攻击者智能化：AI 恶意账户风险飙升");
  });

  it("keeps older manifests readable without archive extras", () => {
    const manifest = validateVisualBriefManifest({
      date: "2026-05-30",
      title: "旧简报",
      subtitle: "兼容旧数据",
      generatedAt: "2026-05-30T11:00:00.000Z",
      sourceWindow: "24h",
      panels: manifestPanels()
    });

    expect(manifest.article).toBeUndefined();
    expect(manifest.illustrations).toBeUndefined();
  });

  it("keeps cover and generation diagnostics for archived briefs", () => {
    const manifest = validateVisualBriefManifest({
      date: "2026-05-31",
      title: "Enterprise AI",
      subtitle: "24h",
      generatedAt: "2026-05-31T11:00:00.000Z",
      sourceWindow: "24h",
      coverImageUrl: "https://blob.example/cover.png",
      generation: {
        contentMode: "deepseek",
        deepseekAttempts: 1,
        candidateCount: 1,
        sourceStats: [{ id: "aihot", label: "AI HOT", count: 1 }],
        excludedPreviousUrls: [],
        selectedSourceUrls: ["https://example.com/1"],
        candidatePool: [{
          title: "Agent workflow",
          url: "https://example.com/1",
          source: "AI HOT",
          category: "enterprise-ai",
          publishedAt: "2026-05-31T10:00:00.000Z"
        }]
      },
      panels: manifestPanels()
    });

    expect(manifest.coverImageUrl).toContain("cover.png");
    expect(manifest.generation?.candidateCount).toBe(1);
    expect(manifest.generation?.candidatePool[0].source).toBe("AI HOT");
  });

  it("rejects malformed archive extras", () => {
    expect(() => validateVisualBriefManifest({
      date: "2026-05-31",
      title: "企业 AI 日报",
      subtitle: "过去 24 小时",
      generatedAt: "2026-05-31T11:00:00.000Z",
      sourceWindow: "24h",
      article: { panels: "not-an-array" },
      illustrations: [{ index: 1, imageUrl: "" }],
      panels: manifestPanels()
    })).toThrow("Invalid manifest archive");
  });

  it("writes article copy and Seedream illustrations from the visual pipeline", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src", "lib", "server", "visual-pipeline.ts"),
      "utf8"
    );

    expect(source).toContain("article: {");
    expect(source).toContain("illustrations: persistedSeedreamImages.map");
    expect(source).toContain("coverImageUrl:");
    expect(source).toContain("generation:");
  });
});

function manifestPanels() {
  return [
    { index: 1, kind: "cover", title: "封面", imageUrl: "https://blob.example/1.png", width: 1080, height: 2000, sourceUrls: [] },
    { index: 2, kind: "news", title: "主线", imageUrl: "https://blob.example/2.png", width: 1080, height: 2000, sourceUrls: [] },
    { index: 3, kind: "news", title: "雷达", imageUrl: "https://blob.example/3.png", width: 1080, height: 2000, sourceUrls: [] },
    { index: 4, kind: "takeaway", title: "判断", imageUrl: "https://blob.example/4.png", width: 1080, height: 2000, sourceUrls: [] }
  ];
}

function validPanelsForTitleTest() {
  const kinds = ["cover", "context", "news", "news", "news", "news", "news", "news", "takeaway", "footer"];
  return kinds.map((kind, index) => ({
    kind,
    kicker: `板块 ${index + 1}`,
    title: `具体标题 ${index + 1}`,
    body: ["企业智能体落地需要权限审计恢复验收协同推进。".repeat(7)],
    imagePrompt: `enterprise workflow section ${index + 1}`,
    sourceUrls: [`https://example.com/${index + 1}`]
  }));
}

function modelArticlePanels(options: { charsPerPanel?: number; linesPerPanel?: number; charsPerLine?: number }) {
  const kinds = ["cover", "context", "news", "news", "news", "news", "news", "news", "takeaway", "footer"];
  const titles = [
    "智能体权限治理进入交付阶段",
    "从演示热度走向流程治理",
    "企业开始追问权限边界",
    "交付标准正在发生变化",
    "工具链需要可审计记录",
    "安全和效率必须同时计算",
    "先从高频流程做小试验",
    "把异常处理写进流程",
    "先管住边界再扩大规模",
    "发布前保留人工校对"
  ];
  return kinds.map((kind, index) => ({
    kind,
    kicker: `板块 ${index + 1}`,
    title: titles[index],
    body: modelBody(options),
    imagePrompt: `enterprise AI workflow panel ${index + 1}`,
    sourceUrls: [`https://example.com/model-${index + 1}`]
  }));
}

function modelBody(options: { charsPerPanel?: number; linesPerPanel?: number; charsPerLine?: number }) {
  const base = "企业智能体落地不能只看模型能力，还要看权限、流程、审计、异常恢复和人工验收是否能稳定闭环。";
  if (options.linesPerPanel && options.charsPerLine) {
    return Array.from({ length: options.linesPerPanel }, () => repeatToLength(base, options.charsPerLine));
  }
  return [repeatToLength(base, options.charsPerPanel ?? 150)];
}

function repeatToLength(value: string, length: number): string {
  return value.repeat(Math.ceil(length / value.length)).slice(0, length);
}

function item(id: string, title: string, summary: string): NormalizedContentItem {
  return {
    id,
    externalId: id,
    title,
    url: `https://example.com/${id}`,
    summary,
    source: "AI HOT",
    category: "ai-products",
    tags: [],
    publishedAt: "2026-05-29T10:00:00.000Z",
    contentHash: `aihot:${id}`
  };
}
