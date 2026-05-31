import type { VisualBriefPanelDraft, VisualPanelKind } from "@/lib/domain/types";

export type VisualBriefSheetPlan = {
  index: number;
  kind: VisualPanelKind;
  title: string;
  width: 1080;
  height: number;
  seedreamImageUrl: string;
  panels: VisualBriefPanelDraft[];
  theme: {
    background: "#F4E8CF";
    ink: "#17211F";
  };
};

const SHEET_GROUPS: Array<{
  kind: VisualPanelKind;
  title: string;
  panelIndexes: number[];
  illustrationIndex: number;
}> = [
  { kind: "cover", title: "封面与今日脉络", panelIndexes: [0, 1], illustrationIndex: 0 },
  { kind: "news", title: "主线拆解", panelIndexes: [2, 3, 4], illustrationIndex: 1 },
  { kind: "news", title: "雷达信号", panelIndexes: [5, 6, 7], illustrationIndex: 1 },
  { kind: "takeaway", title: "落地判断", panelIndexes: [8, 9], illustrationIndex: 1 }
];

export function buildVisualBriefSheetPlans(
  panels: VisualBriefPanelDraft[],
  illustrationUrls: string[]
): VisualBriefSheetPlan[] {
  if (panels.length !== 10) {
    throw new Error(`Expected 10 editorial panels, received ${panels.length}`);
  }
  const coverIllustration = illustrationUrls[0] ?? "";
  const bodyIllustration = illustrationUrls[1] ?? coverIllustration;

  return SHEET_GROUPS.map((group, index) => {
    const groupedPanels = group.panelIndexes.map((panelIndex) => panels[panelIndex]);
    return {
      index: index + 1,
      kind: group.kind,
      title: group.title,
      width: 1080,
      height: sheetHeight(groupedPanels),
      seedreamImageUrl: group.illustrationIndex === 0 ? coverIllustration : bodyIllustration,
      panels: groupedPanels,
      theme: {
        background: "#F4E8CF",
        ink: "#17211F"
      }
    };
  });
}

function sheetHeight(panels: VisualBriefPanelDraft[]): number {
  const contentHeight = panels.reduce(
    (total, panel) => total + 280 + panel.body.length * 86,
    0
  );
  return clamp(980 + contentHeight, 2300, 3500);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
