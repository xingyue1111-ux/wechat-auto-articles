import { articleAdminHref } from "@/lib/article-routes";
import type { VisualBriefManifest } from "@/lib/domain/types";

export function VisualBriefPage({ manifest }: { manifest: VisualBriefManifest }) {
  if (!manifest.panels.length) {
    return (
      <main className="brief-page">
        <section className="panel">
          <p className="eyebrow">Article Ready</p>
          <h1>{manifest.title}</h1>
          <p className="muted">这篇文章已经改为公众号正文内嵌 Seedream 配图，不再生成 PNG 图片版。</p>
          <a className="button secondary compact" href={articleAdminHref(manifest)}>查看发布稿</a>
        </section>
      </main>
    );
  }

  return (
    <main className="brief-page">
      <section className="brief-shell" aria-label={manifest.title}>
        {manifest.panels.map((panel) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={panel.index}
            src={panel.imageUrl}
            alt={`${panel.index}. ${panel.title}`}
            width={panel.width}
            height={panel.height}
            loading={panel.index <= 2 ? "eager" : "lazy"}
          />
        ))}
      </section>
    </main>
  );
}
