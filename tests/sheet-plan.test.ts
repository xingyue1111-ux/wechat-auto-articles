import { describe, expect, it } from "vitest";
import { buildFallbackVisualBrief } from "@/lib/visual-brief";
import { buildVisualBriefSheetPlans } from "@/lib/visual-render/sheet-plan";
import { wrapVisualText } from "@/lib/visual-render/typography";

describe("visual brief sheet plans", () => {
  it("combines ten editorial panels into four long-image sheets", () => {
    const brief = buildFallbackVisualBrief({
      date: "2026-05-30",
      sourceWindow: "24h",
      items: []
    });

    const sheets = buildVisualBriefSheetPlans(brief.panels, [
      "data:image/png;base64,cover",
      "data:image/png;base64,context",
      "data:image/png;base64,main",
      "data:image/png;base64,radar",
      "data:image/png;base64,takeaway"
    ]);

    expect(sheets).toHaveLength(4);
    expect(sheets.map((sheet) => sheet.panels.length)).toEqual([2, 3, 3, 2]);
    expect(sheets.map((sheet) => sheet.kind)).toEqual(["cover", "news", "news", "takeaway"]);
    expect(sheets.map((sheet) => sheet.seedreamImageUrl)).toEqual([
      "data:image/png;base64,cover",
      "data:image/png;base64,main",
      "data:image/png;base64,radar",
      "data:image/png;base64,takeaway"
    ]);
    expect(sheets[0].accentSeedreamImageUrl).toBe("data:image/png;base64,context");
    expect(sheets.map((sheet) => sheet.variant)).toEqual([
      "cover",
      "analysis",
      "radar",
      "takeaway"
    ]);
  });

  it("wraps continuous Chinese text before it can overflow the sheet width", () => {
    expect(wrapVisualText("企业人工智能落地信号持续增长", 6)).toEqual([
      "企业人工智能",
      "落地信号持续",
      "增长"
    ]);
  });

  it("allocates more sheet height when a paragraph wraps onto more lines", () => {
    const shortBrief = buildFallbackVisualBrief({
      date: "2026-05-30",
      sourceWindow: "24h",
      items: []
    });
    const longBrief = structuredClone(shortBrief);
    longBrief.panels[2].body = ["企业人工智能落地需要持续验证。".repeat(60)];

    const shortSheet = buildVisualBriefSheetPlans(shortBrief.panels, ["image"])[1];
    const longSheet = buildVisualBriefSheetPlans(longBrief.panels, ["image"])[1];

    expect(longSheet.height).toBeGreaterThan(shortSheet.height);
  });
});
