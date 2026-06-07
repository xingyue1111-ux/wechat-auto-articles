import { describe, expect, it } from "vitest";
import { BRIEF_SYSTEM_PROMPT, buildBriefPrompt } from "@/lib/server/brief-prompt";

describe("AI application signal brief prompt", () => {
  it("positions the account around broad AI application and industry signals", () => {
    const prompt = buildBriefPrompt("2026-06-07", "24h", [
      { title: "New multimodal model", summary: "Summary", url: "https://example.com/1", source: "AI HOT" }
    ]);

    expect(BRIEF_SYSTEM_PROMPT).toContain("AI 应用与产业信号");
    expect(BRIEF_SYSTEM_PROMPT).toContain("产品进展");
    expect(BRIEF_SYSTEM_PROMPT).toContain("产业动态");
    expect(prompt).toContain("不强行只写企业落地");
    expect(prompt).toContain("对真实应用意味着什么");
  });

  it("requires an exact ten-panel JSON contract", () => {
    const prompt = buildBriefPrompt("2026-06-07", "24h", [
      { title: "Agent workflow update", summary: "Summary", url: "https://example.com/1", source: "AI HOT" }
    ]);

    expect(BRIEF_SYSTEM_PROMPT).toContain("只输出合法 JSON");
    expect(prompt).toContain("panels 必须恰好包含 10 项");
    expect(prompt).toContain("输出紧凑 JSON");
    expect(prompt).toContain("每屏 body 1-2 段");
    expect(prompt).toContain("01-cover");
    expect(prompt).toContain("10-footer");
    expect(prompt).toContain('"kind": "cover"');
    expect(prompt).toContain("标题、摘要和正文必须全部使用简体中文");
  });

  it("compresses candidate signals before sending them to DeepSeek", () => {
    const longSummary = "这是一段很长的素材摘要".repeat(40);
    const prompt = buildBriefPrompt(
      "2026-06-07",
      "24h",
      Array.from({ length: 80 }, (_, index) => ({
        title: `AI signal ${index + 1}`,
        summary: longSummary,
        url: `https://example.com/${index + 1}`,
        source: index % 2 ? "AI HOT" : "Hacker News",
        category: "ai-products",
        publishedAt: "2026-06-07T11:00:00.000Z"
      }))
    );

    expect(prompt).toContain('"index": 45');
    expect(prompt).not.toContain('"index": 46');
    expect(prompt).not.toContain(longSummary);
  });

  it("requires a continuous article around fifteen hundred Chinese characters", () => {
    const prompt = buildBriefPrompt("2026-06-07", "24h", [
      { title: "Agent workflow update", summary: "Summary", url: "https://example.com/1", source: "AI HOT" }
    ]);

    expect(prompt).toContain("1400-1600");
    expect(prompt).toContain("完整文章");
    expect(prompt).toContain("连续叙事");
  });

  it("forbids generic placeholder article titles", () => {
    const prompt = buildBriefPrompt("2026-06-07", "24h", [
      { title: "Anthropic threat report", summary: "AI abuse risk is rising", url: "https://example.com/1", source: "AI HOT" }
    ]);

    expect(prompt).toContain("不得使用“企业 AI 落地信号图”");
    expect(prompt).toContain("不得使用“AI 应用日报”");
    expect(prompt).not.toContain('"title": "企业 AI 落地信号图"');
  });
});
