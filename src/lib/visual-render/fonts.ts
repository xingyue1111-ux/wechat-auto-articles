import { readFile } from "node:fs/promises";
import path from "node:path";

type VisualFont = {
  name: "Noto Sans SC" | "Noto Serif SC";
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal";
};

let visualFontCache: VisualFont[] | null = null;

export function resolveVisualFontFiles(): string[] {
  return [
    fontFile("@fontsource/noto-sans-sc", "noto-sans-sc-chinese-simplified-400-normal.woff"),
    fontFile("@fontsource/noto-sans-sc", "noto-sans-sc-chinese-simplified-700-normal.woff"),
    fontFile("@fontsource/noto-serif-sc", "noto-serif-sc-chinese-simplified-700-normal.woff")
  ];
}

export async function loadVisualFonts(): Promise<VisualFont[]> {
  if (!visualFontCache) {
    const [sansRegular, sansBold, serifBold] = await Promise.all(
      resolveVisualFontFiles().map(readFont)
    );
    visualFontCache = [
      { name: "Noto Sans SC", data: sansRegular, weight: 400, style: "normal" },
      { name: "Noto Sans SC", data: sansBold, weight: 700, style: "normal" },
      { name: "Noto Serif SC", data: serifBold, weight: 700, style: "normal" }
    ];
  }
  return visualFontCache;
}

function fontFile(packageName: string, filename: string): string {
  return path.join(process.cwd(), "node_modules", packageName, "files", filename);
}

async function readFont(filename: string): Promise<ArrayBuffer> {
  const data = await readFile(filename);
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
}
