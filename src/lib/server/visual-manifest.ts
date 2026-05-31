import type { VisualBriefManifest } from "@/lib/domain/types";
import { getTextBlob, listPublicBlobPathnames } from "@/lib/storage/blob";
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

export async function listArticleManifestSummaries(limit = 12): Promise<VisualBriefManifest[]> {
  const pathnames = await listPublicBlobPathnames("articles/");
  const dates = pathnames
    .map((pathname) => pathname.match(/^articles\/(\d{4}-\d{2}-\d{2})\/manifest\.json$/)?.[1])
    .filter((date): date is string => Boolean(date));
  const manifests = await Promise.all(Array.from(new Set(dates)).map(readArticleManifest));
  return manifests
    .filter((manifest): manifest is VisualBriefManifest => manifest !== null)
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
    .slice(0, limit);
}
