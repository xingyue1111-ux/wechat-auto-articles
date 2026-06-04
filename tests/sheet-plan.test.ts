import { describe, expect, it } from "vitest";
import { buildFallbackVisualBrief } from "@/lib/visual-brief";
import {
  VISUAL_SHEET_STYLE_COUNT,
  buildVisualBriefSheetPlans,
  visualSheetStyleVariant
} from "@/lib/visual-render/sheet-plan";
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
    expect(sheets[0].accentSeedreamImageUrl).toBeUndefined();
    expect(sheets.map((sheet) => sheet.variant)).toEqual([
      "cover",
      "analysis",
      "radar",
      "takeaway"
    ]);
    expect(sheets.map((sheet) => sheet.panelNumbers)).toEqual([
      [0, 1],
      [2, 3, 4],
      [5, 6, 7],
      [8, 9]
    ]);
  });

  it("rotates long-image visual styles across generation runs", () => {
    expect(VISUAL_SHEET_STYLE_COUNT).toBeGreaterThanOrEqual(4);

    const variants = Array.from({ length: VISUAL_SHEET_STYLE_COUNT }, (_, index) =>
      visualSheetStyleVariant(`run-${index}`)
    );
    const sheets = buildVisualBriefSheetPlans(
      buildFallbackVisualBrief({ date: "2026-06-04", sourceWindow: "24h", items: [] }).panels,
      ["image"],
      "run-1"
    );

    expect(new Set(variants).size).toBe(VISUAL_SHEET_STYLE_COUNT);
    expect(sheets.every((sheet) => sheet.styleVariant === "warm-card")).toBe(true);
    expect(buildVisualBriefSheetPlans(sheets.flatMap((sheet) => sheet.panels).slice(0, 10), ["image"], "run-2")[0].styleVariant)
      .not.toBe(sheets[0].styleVariant);
  });

  it("wraps continuous Chinese text before it can overflow the sheet width", () => {
    expect(wrapVisualText("企业人工智能落地信号持续增长", 6)).toEqual([
      "企业人工智能",
      "落地信号持续",
      "增长"
    ]);
  });

  it("splits long English tokens before they can overflow the right margin", () => {
    const lines = wrapVisualText("AgentDoGSuperLongContinuousAlignmentFramework", 10);

    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((line) => line.length <= 18)).toBe(true);
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
