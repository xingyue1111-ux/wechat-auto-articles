import { describe, expect, it } from "vitest";
import { buildFallbackVisualBrief } from "@/lib/visual-brief";
import { buildVisualBriefSheetPlans } from "@/lib/visual-render/sheet-plan";

describe("visual brief sheet plans", () => {
  it("combines ten editorial panels into four long-image sheets", () => {
    const brief = buildFallbackVisualBrief({
      date: "2026-05-30",
      sourceWindow: "24h",
      items: []
    });

    const sheets = buildVisualBriefSheetPlans(brief.panels, [
      "data:image/png;base64,cover",
      "data:image/png;base64,body"
    ]);

    expect(sheets).toHaveLength(4);
    expect(sheets.map((sheet) => sheet.panels.length)).toEqual([2, 3, 3, 2]);
    expect(sheets.map((sheet) => sheet.kind)).toEqual(["cover", "news", "news", "takeaway"]);
    expect(sheets.map((sheet) => sheet.seedreamImageUrl)).toEqual([
      "data:image/png;base64,cover",
      "data:image/png;base64,body",
      "data:image/png;base64,body",
      "data:image/png;base64,body"
    ]);
  });
});
