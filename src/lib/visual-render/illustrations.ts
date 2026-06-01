const ILLUSTRATION_PANEL_INDEXES = [0, 2, 6, 8];

export function selectIllustrationPrompts(panelPrompts: string[]): string[] {
  return ILLUSTRATION_PANEL_INDEXES.map((index) => panelPrompts[index])
    .filter(Boolean)
    .map(buildSeedreamStylePrompt);
}

export function buildSeedreamStylePrompt(composition: string): string {
  return `${composition}, flat vector illustration style with Halftone texture overlay, Ligne Claire clean line work, Art Deco decorative border elements, Beige Teal Amber color palette, aged parchment background texture, editorial yet playful atmosphere, 2.35:1 wide screen ratio, ultra detailed digital art, retro-futurism aesthetic, no readable text`;
}
