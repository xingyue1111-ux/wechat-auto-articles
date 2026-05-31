const ILLUSTRATION_PANEL_INDEXES = [0, 2, 4, 6, 8];

export function selectIllustrationPrompts(panelPrompts: string[]): string[] {
  return ILLUSTRATION_PANEL_INDEXES.map((index) => panelPrompts[index]).filter(Boolean);
}
