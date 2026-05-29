import type { VisualBriefManifest } from "@/lib/domain/types";
import { getTextBlob } from "@/lib/storage/blob";
import { articleManifestPath, latestManifestPath } from "@/lib/storage/paths";
import { validateVisualBriefManifest } from "@/lib/visual-brief";

export async function readArticleManifest(date: string): Promise<VisualBriefManifest | null> {
  const text = await getTextBlob(articleManifestPath(date));
  if (!text) {
    return null;
  }
  return validateVisualBriefManifest(JSON.parse(text));
}

export async function readLatestManifest(): Promise<VisualBriefManifest | null> {
  const latestText = await getTextBlob(latestManifestPath());
  if (!latestText) {
    return null;
  }
  const latest = JSON.parse(latestText) as { date?: string; manifestUrl?: string };
  if (latest.manifestUrl) {
    const text = await getTextBlob(latest.manifestUrl);
    if (text) {
      return validateVisualBriefManifest(JSON.parse(text));
    }
  }
  return latest.date ? readArticleManifest(latest.date) : null;
}
