import type { VisualBriefPanelDraft, VisualPanelKind } from "@/lib/domain/types";
import { estimateVisualLineCount } from "@/lib/visual-render/typography";

export type VisualBriefSheetPlan = {
  index: number;
  kind: VisualPanelKind;
  variant: "cover" | "analysis" | "radar" | "takeaway";
  styleVariant: VisualSheetStyleVariant;
  title: string;
  width: 1080;
  height: number;
  seedreamImageUrl: string;
  panelNumbers: number[];
  panels: VisualBriefPanelDraft[];
  theme: {
    background: string;
    ink: string;
    paper: string;
    teal: string;
    amber: string;
  };
};

export type VisualSheetStyleVariant = "classic" | "warm-card" | "teal-digest" | "amber-memo";

const VISUAL_SHEET_STYLES: Array<{
  id: VisualSheetStyleVariant;
  background: string;
  ink: string;
  paper: string;
  teal: string;
  amber: string;
}> = [
  { id: "classic", background: "#F4E8CF", ink: "#17211F", paper: "#FFFDF8", teal: "#0F766E", amber: "#D89A2B" },
  { id: "warm-card", background: "#F7E2BC", ink: "#1F2320", paper: "#FFF9EC", teal: "#146B63", amber: "#B87818" },
  { id: "teal-digest", background: "#E4F0EC", ink: "#13211F", paper: "#F8FFFC", teal: "#0B6F68", amber: "#C98F24" },
  { id: "amber-memo", background: "#FFF1D6", ink: "#1C2522", paper: "#FFFDF8", teal: "#1C6F68", amber: "#D28A12" }
];

export const VISUAL_SHEET_STYLE_COUNT = VISUAL_SHEET_STYLES.length;

const SHEET_GROUPS: Array<{
  kind: VisualPanelKind;
  variant: VisualBriefSheetPlan["variant"];
  title: string;
  panelIndexes: number[];
  illustrationIndex: number;
}> = [
  {
    kind: "cover",
    variant: "cover",
    title: "封面与今日脉络",
    panelIndexes: [0, 1],
    illustrationIndex: 0
  },
  {
    kind: "news",
    variant: "analysis",
    title: "主线拆解",
    panelIndexes: [2, 3, 4],
    illustrationIndex: 1
  },
  {
    kind: "news",
    variant: "radar",
    title: "雷达信号",
    panelIndexes: [5, 6, 7],
    illustrationIndex: 2
  },
  {
    kind: "takeaway",
    variant: "takeaway",
    title: "落地判断",
    panelIndexes: [8, 9],
    illustrationIndex: 3
  }
];

export function buildVisualBriefSheetPlans(
  panels: VisualBriefPanelDraft[],
  illustrationUrls: string[],
  runKey?: string
): VisualBriefSheetPlan[] {
  if (panels.length !== 10) {
    throw new Error(`Expected 10 editorial panels, received ${panels.length}`);
  }
  const fallbackIllustration = illustrationUrls[0] ?? "";
  const style = visualSheetStyle(runKey);

  return SHEET_GROUPS.map((group, index) => {
    const groupedPanels = group.panelIndexes.map((panelIndex) => panels[panelIndex]);
    return {
      index: index + 1,
      kind: group.kind,
      variant: group.variant,
      styleVariant: style.id,
      title: group.title,
      width: 1080,
      height: sheetHeight(group.variant, groupedPanels),
      seedreamImageUrl: illustrationUrls[group.illustrationIndex] ?? fallbackIllustration,
      panelNumbers: group.panelIndexes,
      panels: groupedPanels,
      theme: {
        background: style.background,
        ink: style.ink,
        paper: style.paper,
        teal: style.teal,
        amber: style.amber
      }
    };
  });
}

export function visualSheetStyleVariant(runKey?: string): VisualSheetStyleVariant {
  return visualSheetStyle(runKey).id;
}

function visualSheetStyle(runKey?: string) {
  const key = runKey ?? "";
  const numericSuffix = key.match(/(\d+)$/u)?.[1];
  const index = numericSuffix ? Number(numericSuffix) % VISUAL_SHEET_STYLE_COUNT : hashText(key) % VISUAL_SHEET_STYLE_COUNT;
  return VISUAL_SHEET_STYLES[index] ?? VISUAL_SHEET_STYLES[0];
}

function hashText(value: string): number {
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function sheetHeight(
  variant: VisualBriefSheetPlan["variant"],
  panels: VisualBriefPanelDraft[]
): number {
  const bodyLineCount = panels.reduce(
    (total, panel) =>
      total + panel.body.reduce((lineTotal, line) => lineTotal + estimateVisualLineCount(line, 21), 0),
    0
  );
  const titleLineCount = panels.reduce(
    (total, panel) => total + estimateVisualLineCount(panel.title, 16),
    0
  );
  const heightProfile = {
    cover: { base: 1900, min: 2400, max: 5600 },
    analysis: { base: 1740, min: 2600, max: 7200 },
    radar: { base: 1640, min: 2600, max: 7200 },
    takeaway: { base: 1500, min: 2200, max: 5000 }
  }[variant];
  return clamp(
    heightProfile.base + bodyLineCount * 72 + titleLineCount * 66,
    heightProfile.min,
    heightProfile.max
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
