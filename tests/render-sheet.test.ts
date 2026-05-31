import { describe, expect, it } from "vitest";
import { buildFallbackVisualBrief } from "@/lib/visual-brief";
import { renderSheetPng } from "@/lib/visual-render/render-sheet";
import { buildVisualBriefSheetPlans } from "@/lib/visual-render/sheet-plan";

describe("long-image sheet renderer", () => {
  it("renders a grouped sheet into a PNG buffer", async () => {
    const brief = buildFallbackVisualBrief({
      date: "2026-05-30",
      sourceWindow: "24h",
      items: []
    });
    const illustration =
      "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiPjxyZWN0IHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiIGZpbGw9IiNmNGU4Y2YiLz48Y2lyY2xlIGN4PSI1MTIiIGN5PSI1MTIiIHI9IjI0MCIgZmlsbD0iIzBmNzY2ZSIgb3BhY2l0eT0iLjQiLz48L3N2Zz4=";
    const [sheet] = buildVisualBriefSheetPlans(brief.panels, [illustration, illustration]);

    const png = await renderSheetPng(sheet);

    expect(png.byteLength).toBeGreaterThan(1000);
    expect(Buffer.from(png.subarray(0, 8)).toString("hex")).toBe("89504e470d0a1a0a");
  });
});
