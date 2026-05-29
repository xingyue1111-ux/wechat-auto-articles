import { notFound } from "next/navigation";
import { VisualBriefPage } from "@/components/visual-brief-page";
import { readArticleManifest } from "@/lib/server/visual-manifest";

export const dynamic = "force-dynamic";

export default async function ArticleDatePage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const manifest = await readArticleManifest(date);
  if (!manifest) {
    notFound();
  }
  return <VisualBriefPage manifest={manifest} />;
}
