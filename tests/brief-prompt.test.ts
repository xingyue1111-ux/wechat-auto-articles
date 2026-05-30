import { describe, expect, it } from "vitest";
import { BRIEF_SYSTEM_PROMPT, buildBriefPrompt } from "@/lib/server/brief-prompt";

describe("enterprise AI brief prompt", () => {
  it("requires an exact ten-panel JSON contract", () => {
    const prompt = buildBriefPrompt("2026-05-30", "24h", [
      { title: "Agent workflow update", summary: "Summary", url: "https://example.com/1", source: "AI HOT" }
    ]);

    expect(BRIEF_SYSTEM_PROMPT).toContain("只输出合法 JSON");
    expect(prompt).toContain("panels 必须恰好包含 10 项");
    expect(prompt).toContain("01-cover");
    expect(prompt).toContain("10-footer");
    expect(prompt).toContain('"kind": "cover"');
    expect(prompt).toContain("主线与雷达素材不得重复");
  });
});
