import { describe, expect, it } from "vitest";
import { buildPanelRenderPlan } from "@/lib/visual-render/render-plan";
import { renderPanelPng } from "@/lib/visual-render/render-panel";

describe("long image render plan", () => {
  it("creates real PNG render plans with seedream illustration slots", () => {
    const plan = buildPanelRenderPlan({
      index: 3,
      kind: "news",
      title: "AI agents enter the workflow layer",
      kicker: "重点 01",
      body: ["企业软件开始把 Agent 放进流程，而不是只放在聊天框里。"],
      imagePrompt: "retrofuturistic vector illustration of AI workflow",
      sourceUrls: ["https://example.com/news"],
      seedreamImageUrl: "https://blob.example/seedream.png"
    });

    expect(plan.width).toBe(1080);
    expect(plan.height).toBeGreaterThanOrEqual(1350);
    expect(plan.height).toBeLessThanOrEqual(1800);
    expect(plan.seedreamImageUrl).toBe("https://blob.example/seedream.png");
    expect(plan.theme.palette).toEqual(["#F4E8CF", "#0F766E", "#D89A2B"]);
  });

  it("renders a panel into a PNG buffer", async () => {
    const plan = buildPanelRenderPlan({
      index: 1,
      kind: "cover",
      title: "今天 AI 圈的信号图",
      kicker: "AI HOT",
      body: ["复古未来主义长图简报。"],
      imagePrompt: "retrofuturistic vector illustration",
      sourceUrls: [],
      seedreamImageUrl:
        "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiPjxyZWN0IHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiIGZpbGw9IiNmNGU4Y2YiLz48Y2lyY2xlIGN4PSI1MTIiIGN5PSI1MTIiIHI9IjI0MCIgZmlsbD0iIzBmNzY2ZSIgb3BhY2l0eT0iLjQiLz48L3N2Zz4="
    });

    const png = await renderPanelPng(plan);

    expect(png.byteLength).toBeGreaterThan(1000);
    expect(Buffer.from(png.subarray(0, 8)).toString("hex")).toBe("89504e470d0a1a0a");
  });
});
