import type { VisualBriefPanelDraft } from "@/lib/domain/types";

type IllustrationPanel = Pick<VisualBriefPanelDraft, "title" | "body" | "imagePrompt">;

const ARTICLE_IMAGE_GROUPS = [
  {
    panelIndexes: [0, 1],
    directive: "article block 1, opening synthesis, show a newsroom-style signal map becoming an actionable enterprise decision board, avoid a single central gauge"
  },
  {
    panelIndexes: [2, 3],
    directive: "article block 2, first argument section, show team handoff, ownership boundaries, workflow checkpoints, and human collaboration"
  },
  {
    panelIndexes: [4, 5],
    directive: "article block 3, second argument section, show permission gates, audit trail, risk boundary, and controlled production environment"
  },
  {
    panelIndexes: [6, 7],
    directive: "article block 4, third argument section, show pilot-to-production loop, evaluation console, rollback path, and reusable operating playbook"
  }
];

export function selectIllustrationCompositions(panels: IllustrationPanel[]): string[] {
  return ARTICLE_IMAGE_GROUPS.map((group) => {
    const groupedPanels = group.panelIndexes
      .map((index) => panels[index])
      .filter((panel): panel is IllustrationPanel => Boolean(panel));
    if (!groupedPanels.length) {
      return "";
    }
    const titles = groupedPanels.map((panel) => panel.title).filter(Boolean).join(" / ");
    const bodySignal = groupedPanels.flatMap((panel) => panel.body).join(" ").slice(0, 160);
    const visualMetaphor = groupedPanels.map((panel) => panel.imagePrompt).filter(Boolean).join("; ");
    return [
      group.directive,
      `section titles: ${titles}`,
      `section meaning: ${bodySignal}`,
      `visual metaphor details: ${visualMetaphor}`
    ].join(", ");
  }).filter(Boolean);
}

export function selectIllustrationPrompts(panels: IllustrationPanel[]): string[] {
  return selectIllustrationCompositions(panels).map((composition) =>
    buildSeedreamStylePrompt(composition, "3:4 portrait ratio")
  );
}

export function buildSeedreamStylePrompt(composition: string, aspectRatio = "3:4 portrait ratio"): string {
  return `${composition}, flat vector illustration style with Halftone texture overlay, Ligne Claire clean line work, Art Deco decorative border elements, Beige Teal Amber color palette, aged parchment background texture, editorial yet playful atmosphere, ${aspectRatio}, ultra detailed digital art, retro-futurism aesthetic, no readable text`;
}
