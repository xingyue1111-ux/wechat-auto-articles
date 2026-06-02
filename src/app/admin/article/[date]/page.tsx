import { notFound } from "next/navigation";
import { WechatPublishingWorkbench } from "@/components/wechat-publishing-workbench";
import { readArticleManifest } from "@/lib/server/visual-manifest";
import { buildWechatArticleHtml } from "@/lib/wechat-article-html";

export const dynamic = "force-dynamic";

export default async function AdminArticlePage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const manifest = await readArticleManifest(date);
  if (!manifest) {
    notFound();
  }
  return <WechatPublishingWorkbench manifest={manifest} html={buildWechatArticleHtml(manifest)} />;
}
