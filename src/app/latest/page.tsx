import { notFound } from "next/navigation";
import { VisualBriefPage } from "@/components/visual-brief-page";
import { readLatestManifest } from "@/lib/server/visual-manifest";

export const dynamic = "force-dynamic";

export default async function LatestPage() {
  const manifest = await readLatestManifest();
  if (!manifest) {
    notFound();
  }
  return <VisualBriefPage manifest={manifest} />;
}
