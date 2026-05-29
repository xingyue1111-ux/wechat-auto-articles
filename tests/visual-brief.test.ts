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
    expect(brief.panels[0].kind).toBe("cover");
    expect(brief.panels.at(-1)?.kind).toBe("footer");
    expect(brief.panels.filter((panel) => panel.kind === "news")).toHaveLength(5);
    expect(brief.panels[2].imagePrompt).toContain("retrofuturistic");
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

    expect(manifest.panels.map((panel) => panel.index)).toEqual([1, 2, 3, 4, 5]);
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
