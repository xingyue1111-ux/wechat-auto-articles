import { describe, expect, it } from "vitest";
import {
  buildSeedreamStylePrompt,
  selectIllustrationPrompts
} from "@/lib/visual-render/illustrations";

describe("visual brief illustration allocation", () => {
  it("uses five Seedream illustrations for the fixed ten-panel brief", () => {
    const prompts = Array.from({ length: 10 }, (_, index) => `prompt-${index + 1}`);
    const selected = selectIllustrationPrompts(prompts);

    expect(selected.map((prompt) => prompt.split(",")[0])).toEqual([
      "prompt-1",
      "prompt-3",
      "prompt-5",
      "prompt-7",
      "prompt-9"
    ]);
    expect(selected.every((prompt) => prompt.includes("retro-futurism aesthetic"))).toBe(true);
  });

  it("applies one retro-futurist magazine art direction to every Seedream prompt", () => {
    const prompt = buildSeedreamStylePrompt("enterprise AI workflow control room");

    expect(prompt).toContain("flat vector illustration style with Halftone texture overlay");
    expect(prompt).toContain("Ligne Claire clean line work");
    expect(prompt).toContain("Art Deco decorative border elements");
    expect(prompt).toContain("aged parchment background texture");
    expect(prompt).toContain("2.35:1 wide screen ratio");
    expect(prompt).toContain("retro-futurism aesthetic");
    expect(prompt).toContain("no readable text");
  });
});
