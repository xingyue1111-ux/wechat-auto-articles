import { describe, expect, it } from "vitest";
import { resolveVisualFontFiles } from "@/lib/visual-render/fonts";

describe("visual render fonts", () => {
  it("loads complete Simplified Chinese font files instead of a numbered shard", () => {
    expect(resolveVisualFontFiles()).toEqual([
      expect.stringMatching(/noto-sans-sc-chinese-simplified-400-normal\.woff$/),
      expect.stringMatching(/noto-sans-sc-chinese-simplified-700-normal\.woff$/),
      expect.stringMatching(/noto-serif-sc-chinese-simplified-700-normal\.woff$/)
    ]);
  });
});
