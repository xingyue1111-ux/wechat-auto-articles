import type { VisualBriefPanelDraft, VisualPanelKind } from "@/lib/domain/types";

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
  const lineCount = panels.reduce((total, panel) => total + panel.body.length, 0);
  const titleUnits = panels.reduce((total, panel) => total + Math.ceil(panel.title.length / 18), 0);
  const heightProfile = {
    cover: { base: 1550, min: 1750, max: 2500 },
    analysis: { base: 1400, min: 1750, max: 3000 },
    radar: { base: 1350, min: 1700, max: 3000 },
    takeaway: { base: 1060, min: 1380, max: 2400 }
  }[variant];
  return clamp(
    heightProfile.base + lineCount * 48 + titleUnits * 32,
    heightProfile.min,
    heightProfile.max
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
