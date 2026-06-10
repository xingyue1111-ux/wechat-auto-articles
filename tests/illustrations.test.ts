import { describe, expect, it } from "vitest";
import {
  buildSeedreamStylePrompt,
  selectIllustrationPrompts
} from "@/lib/visual-render/illustrations";

describe("visual brief illustration allocation", () => {
  it("uses four Seedream illustrations for the four article rhythm blocks", () => {
    const panels = Array.from({ length: 10 }, (_, index) => ({
      title: `板块标题 ${index + 1}`,
      body: [`板块正文 ${index + 1}`],
      imagePrompt: `visual metaphor ${index + 1}`
    }));
    const selected = selectIllustrationPrompts(panels);

    expect(selected).toHaveLength(4);
    expect(selected.map((prompt) => prompt.match(/article block \d/u)?.[0])).toEqual([
      "article block 1",
      "article block 2",
      "article block 3",
      "article block 4"
    ]);
    expect(selected[0]).toContain("板块标题 1 / 板块标题 2");
    expect(selected[1]).toContain("板块标题 3 / 板块标题 4");
    expect(selected[2]).toContain("板块标题 5 / 板块标题 6");
    expect(selected[3]).toContain("板块标题 7 / 板块标题 8");
    expect(new Set(selected.map((prompt) => prompt.split(",")[1]))).toHaveLength(4);
    expect(selected.every((prompt) => prompt.includes("retro-futurism aesthetic"))).toBe(true);
  });

  it("applies one retro-futurist magazine art direction to every Seedream prompt", () => {
    const prompt = buildSeedreamStylePrompt("enterprise AI workflow control room");

    expect(prompt).toContain("flat vector illustration style with Halftone texture overlay");
    expect(prompt).toContain("Ligne Claire clean line work");
    expect(prompt).toContain("Art Deco decorative border elements");
    expect(prompt).toContain("aged parchment background texture");
    expect(prompt).toContain("3:4 portrait ratio");
    expect(prompt).toContain("retro-futurism aesthetic");
    expect(prompt).toContain("no readable text");
  });

  it("can apply a portrait article ratio instead of the wide cover ratio", () => {
    const prompt = buildSeedreamStylePrompt("enterprise AI workflow control room", "3:4 portrait ratio");

    expect(prompt).toContain("3:4 portrait ratio");
    expect(prompt).not.toContain("2.35:1 wide screen ratio");
  });
});
