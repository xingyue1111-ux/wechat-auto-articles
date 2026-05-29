import type { VisualPanelKind } from "@/lib/domain/types";

const PANEL_KIND_BY_INDEX: VisualPanelKind[] = ["cover", "context", "news", "news", "news", "news", "news", "news", "takeaway", "footer"];

export function articleManifestPath(date: string): string {
  return `articles/${date}/manifest.json`;
}

export function latestManifestPath(): string {
  return "latest.json";
}

export function seedreamBlobPath(date: string, index: number): string {
  return `articles/${date}/seedream/${String(index).padStart(2, "0")}-illustration.png`;
}

export function panelBlobPath(date: string, index: number, kind?: VisualPanelKind): string {
  const resolvedKind = kind ?? PANEL_KIND_BY_INDEX[index - 1] ?? "news";
  return `articles/${date}/panels/${String(index).padStart(2, "0")}-${resolvedKind}.png`;
}
