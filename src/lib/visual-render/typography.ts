export function wrapVisualText(text: string, maxUnits: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    wrapParagraph(paragraph, maxUnits, lines);
  }
  return lines.length ? lines : [""];
}

export function estimateVisualLineCount(text: string, maxUnits: number): number {
  return wrapVisualText(text, maxUnits).length;
}

function wrapParagraph(paragraph: string, maxUnits: number, lines: string[]): void {
  const tokens = paragraph.match(/[A-Za-z0-9][A-Za-z0-9+.#:/_-]*|\s+|./gu) ?? [];
  let current = "";
  let currentUnits = 0;

  for (const token of tokens) {
    const tokenUnits = visualUnits(token);
    if (current && currentUnits + tokenUnits > maxUnits) {
      lines.push(current.trimEnd());
      current = token.trimStart();
      currentUnits = visualUnits(current);
      continue;
    }
    if (!current && token.trim() === "") {
      continue;
    }
    current += token;
    currentUnits += tokenUnits;
  }

  if (current || paragraph === "") {
    lines.push(current.trimEnd());
  }
}

function visualUnits(text: string): number {
  return Array.from(text).reduce((units, character) => units + (/[\u0000-\u00ff]/.test(character) ? 0.56 : 1), 0);
}
