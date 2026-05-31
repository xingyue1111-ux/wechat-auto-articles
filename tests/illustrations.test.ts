import { describe, expect, it } from "vitest";
import {
  selectIllustrationPrompts
} from "@/lib/visual-render/illustrations";

describe("visual brief illustration allocation", () => {
  it("uses two Seedream illustrations for the fixed ten-panel brief", () => {
    const prompts = Array.from({ length: 10 }, (_, index) => `prompt-${index + 1}`);

    expect(selectIllustrationPrompts(prompts)).toEqual([
      "prompt-1",
      "prompt-3"
    ]);
  });
});
