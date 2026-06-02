import { describe, expect, it, vi } from "vitest";
import { generateVisualBriefWithRetry } from "@/lib/server/deepseek-brief";
import { buildFallbackVisualBrief } from "@/lib/visual-brief";
import type { NormalizedContentItem } from "@/lib/domain/types";

describe("DeepSeek visual brief generation", () => {
  it("retries once when the first response does not match the contract", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce("not-json")
      .mockResolvedValueOnce(JSON.stringify(validBrief()));

    const result = await generateVisualBriefWithRetry({
      context: { date: "2026-05-31", sourceWindow: "24h", items: [item()] },
      request
    });

    expect(request).toHaveBeenCalledTimes(2);
    expect(result.diagnostics).toEqual({ contentMode: "deepseek", attempts: 2 });
    expect(result.brief.title).toBe("\u4f01\u4e1a AI \u4fe1\u53f7\u56fe");
  });

  it("records an explicit degradation reason after two invalid responses", async () => {
    const request = vi.fn().mockResolvedValue("not-json");

    const result = await generateVisualBriefWithRetry({
      context: { date: "2026-05-31", sourceWindow: "24h", items: [item()] },
      request
    });

    expect(request).toHaveBeenCalledTimes(2);
    expect(result.diagnostics.contentMode).toBe("fallback");
    expect(result.diagnostics.attempts).toBe(2);
    expect(result.diagnostics.degradationReason).toContain("JSON");
  });
});

function validBrief() {
  const brief = buildFallbackVisualBrief({
    date: "2026-05-31",
    sourceWindow: "24h",
    items: [item()]
  });
  return {
    title: "\u4f01\u4e1a AI \u4fe1\u53f7\u56fe",
    subtitle: "\u8fc7\u53bb 24 \u5c0f\u65f6",
    panels: brief.panels
  };
}

function item(): NormalizedContentItem {
  return {
    externalId: "1",
    title: "Agent workflow",
    url: "https://example.com/1",
    summary: "Enterprise AI workflow",
    source: "AI HOT",
    category: "enterprise-ai",
    tags: [],
    publishedAt: "2026-05-31T11:00:00.000Z",
    contentHash: "aihot:1"
  };
}
