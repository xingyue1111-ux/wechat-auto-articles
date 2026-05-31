import type { VisualPanelKind } from "@/lib/domain/types";

const PANEL_KIND_BY_INDEX: VisualPanelKind[] = ["cover", "context", "news", "news", "news", "news", "news", "news", "takeaway", "footer"];

export function articleManifestPath(date: string, revision?: string): string {
  return revision ? `articles/${date}/runs/${revision}/manifest.json` : `articles/${date}/manifest.json`;
}

export function latestManifestPath(): string {
  return "latest.json";
}

export function seedreamBlobPath(date: string, index: number, revision?: string): string {
  const base = revision ? `articles/${date}/runs/${revision}` : `articles/${date}`;
  return `${base}/seedream/${String(index).padStart(2, "0")}-illustration.png`;
}

export function panelBlobPath(date: string, index: number, kind?: VisualPanelKind, revision?: string): string {
  const resolvedKind = kind ?? PANEL_KIND_BY_INDEX[index - 1] ?? "news";
  const base = revision ? `articles/${date}/runs/${revision}` : `articles/${date}`;
  return `${base}/panels/${String(index).padStart(2, "0")}-${resolvedKind}.png`;
}
