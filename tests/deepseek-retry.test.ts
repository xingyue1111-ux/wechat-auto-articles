import { describe, expect, it } from "vitest";
import { generateVisualBriefWithRetry } from "@/lib/server/deepseek-brief";

describe("DeepSeek retry policy", () => {
  it("does not retry the same oversized prompt after a DeepSeek timeout", async () => {
    let attempts = 0;
    const result = await generateVisualBriefWithRetry({
      context: {
        date: "2026-06-09",
        sourceWindow: "24h",
        items: [{
          title: "AI workflow update",
          summary: "Enterprise AI signal",
          url: "https://example.com/1",
          source: "AI HOT",
          category: "ai-products",
          tags: [],
          publishedAt: "2026-06-09T10:00:00.000Z",
          contentHash: "1"
        }]
      },
      request: async () => {
        attempts += 1;
        throw new Error("DeepSeek 请求超时，请缩短输入素材或稍后重试。当前 timeout=1000ms");
      },
      maxAttempts: 2
    });

    expect(attempts).toBe(1);
    expect(result.diagnostics.contentMode).toBe("fallback");
    expect(result.diagnostics.degradationReason).toContain("DeepSeek 请求超时");
  });
});
