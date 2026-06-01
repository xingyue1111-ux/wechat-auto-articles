import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildFallbackVisualBrief,
  normalizeVisualBrief,
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

    expect(brief.title).toBe("企业 AI 落地信号图");
    expect(brief.panels).toHaveLength(10);
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
