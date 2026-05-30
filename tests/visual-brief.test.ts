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
      panels: brief.panels.map((panel, index) => ({
        index: index + 1,
        kind: panel.kind,
        title: panel.title,
        imageUrl: `https://blob.example/${panelBlobPath(brief.date, index + 1)}`,
        width: 1080,
        height: 1500,
        sourceUrls: panel.sourceUrls
      }))
    });

    expect(manifest.panels.map((panel) => panel.index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(panelBlobPath("2026-05-29", 1)).toBe("articles/2026-05-29/panels/01-cover.png");
    expect(panelBlobPath("2026-05-29", 5, "footer")).toBe("articles/2026-05-29/panels/05-footer.png");
  });
});

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
