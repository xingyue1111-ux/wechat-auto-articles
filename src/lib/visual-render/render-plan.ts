import type { VisualBriefPanelDraft } from "@/lib/domain/types";

export type PanelRenderPlan = VisualBriefPanelDraft & {
  index: number;
  width: 1080;
  height: number;
  seedreamImageUrl: string;
  theme: {
    palette: ["#F4E8CF", "#0F766E", "#D89A2B"];
    background: string;
    ink: string;
  };
};

export function buildPanelRenderPlan(
  input: VisualBriefPanelDraft & { index: number; seedreamImageUrl: string }
): PanelRenderPlan {
  const bodyLength = input.body.join("").length;
  const height = clamp(1350 + Math.ceil(bodyLength / 80) * 80, 1350, 1800);

  return {
    ...input,
    width: 1080,
    height,
    theme: {
      palette: ["#F4E8CF", "#0F766E", "#D89A2B"],
      background: "#F4E8CF",
      ink: "#17211F"
    }
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
