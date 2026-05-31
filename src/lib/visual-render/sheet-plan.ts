import type { VisualBriefPanelDraft, VisualPanelKind } from "@/lib/domain/types";
import { estimateVisualLineCount } from "@/lib/visual-render/typography";

export type VisualBriefSheetPlan = {
  index: number;
  kind: VisualPanelKind;
  variant: "cover" | "analysis" | "radar" | "takeaway";
  title: string;
  width: 1080;
  height: number;
  seedreamImageUrl: string;
  accentSeedreamImageUrl?: string;
  panels: VisualBriefPanelDraft[];
  theme: {
    background: "#F4E8CF";
    ink: "#17211F";
  };
};

const SHEET_GROUPS: Array<{
  kind: VisualPanelKind;
  variant: VisualBriefSheetPlan["variant"];
  title: string;
  panelIndexes: number[];
  illustrationIndex: number;
  accentIllustrationIndex?: number;
}> = [
  {
    kind: "cover",
    variant: "cover",
    title: "封面与今日脉络",
    panelIndexes: [0, 1],
    illustrationIndex: 0,
    accentIllustrationIndex: 1
  },
  {
    kind: "news",
    variant: "analysis",
    title: "主线拆解",
    panelIndexes: [2, 3, 4],
    illustrationIndex: 2
  },
  {
    kind: "news",
    variant: "radar",
    title: "雷达信号",
    panelIndexes: [5, 6, 7],
    illustrationIndex: 3
  },
  {
    kind: "takeaway",
    variant: "takeaway",
    title: "落地判断",
    panelIndexes: [8, 9],
    illustrationIndex: 4
  }
];

export function buildVisualBriefSheetPlans(
  panels: VisualBriefPanelDraft[],
  illustrationUrls: string[]
): VisualBriefSheetPlan[] {
  if (panels.length !== 10) {
    throw new Error(`Expected 10 editorial panels, received ${panels.length}`);
  }
  const fallbackIllustration = illustrationUrls[0] ?? "";

  return SHEET_GROUPS.map((group, index) => {
    const groupedPanels = group.panelIndexes.map((panelIndex) => panels[panelIndex]);
    return {
      index: index + 1,
      kind: group.kind,
      variant: group.variant,
      title: group.title,
      width: 1080,
      height: sheetHeight(group.variant, groupedPanels),
      seedreamImageUrl: illustrationUrls[group.illustrationIndex] ?? fallbackIllustration,
      accentSeedreamImageUrl:
        group.accentIllustrationIndex === undefined
          ? undefined
          : illustrationUrls[group.accentIllustrationIndex] ?? fallbackIllustration,
      panels: groupedPanels,
      theme: {
        background: "#F4E8CF",
        ink: "#17211F"
      }
    };
  });
}

function sheetHeight(
  variant: VisualBriefSheetPlan["variant"],
  panels: VisualBriefPanelDraft[]
): number {
  const bodyLineCount = panels.reduce(
    (total, panel) =>
      total + panel.body.reduce((lineTotal, line) => lineTotal + estimateVisualLineCount(line, 29), 0),
    0
  );
  const titleLineCount = panels.reduce(
    (total, panel) => total + estimateVisualLineCount(panel.title, 16),
    0
  );
  const heightProfile = {
    cover: { base: 1700, min: 2100, max: 4600 },
    analysis: { base: 1500, min: 2200, max: 6000 },
    radar: { base: 1380, min: 2200, max: 6000 },
    takeaway: { base: 1300, min: 1800, max: 4000 }
  }[variant];
  return clamp(
    heightProfile.base + bodyLineCount * 52 + titleLineCount * 62,
    heightProfile.min,
    heightProfile.max
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
