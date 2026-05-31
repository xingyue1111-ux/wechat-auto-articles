import { ArrowLeft, ExternalLink, Images } from "lucide-react";
import type { ArchivedVisualBriefPanel, VisualBriefManifest } from "@/lib/domain/types";

export function ArchivePage({ articles }: { articles: VisualBriefManifest[] }) {
  return (
    <main className="archive-page">
      <header className="archive-header">
        <div>
          <p className="eyebrow">Enterprise AI Visual Brief</p>
          <h1>历史归档</h1>
          <p className="muted">同一天只展示最后一次生成结果。正文、原始配图和最终长图都保存在这里。</p>
        </div>
        <a className="button secondary compact" href="/admin">
          <ArrowLeft size={16} />
          <span>返回生成台</span>
        </a>
      </header>

      {articles.length ? (
        <section className="archive-list" aria-label="历史简报">
          {articles.map((article) => (
            <article className="archive-card" key={article.date}>
              <div className="archive-card-heading">
                <div>
                  <time dateTime={article.generatedAt}>{article.date}</time>
                  <h2>{article.title}</h2>
                  <p className="muted">{article.subtitle}</p>
                  <small>{formatGeneratedAt(article.generatedAt)} · {article.panels.length} 张公众号长图</small>
                </div>
                <a className="button secondary compact" href={`/article/${article.date}`}>
                  <Images size={16} />
                  <span>查看长图</span>
                </a>
              </div>

              <details className="archive-copy">
                <summary>查看推文内容</summary>
                {article.article?.panels.length ? (
                  <div className="archive-copy-body">
                    {article.article.panels.map((panel, index) => (
                      <section key={`${panel.kind}-${index}`}>
                        <small>{panel.kicker}</small>
                        <h3>{panel.title}</h3>
                        {panel.body.map((line, bodyIndex) => <p key={bodyIndex}>{line}</p>)}
                      </section>
                    ))}
                  </div>
                ) : <p className="muted archive-empty">该历史版本未保存正文。</p>}
              </details>

              <Gallery
                title="Seedream 原始配图"
                images={article.illustrations?.map((item) => item.imageUrl) ?? []}
                empty="该历史版本未保存原始配图。"
              />
              <Gallery title="最终公众号长图" images={article.panels.map((panel) => panel.imageUrl)} />
              <SourceLinks panels={article.article?.panels ?? article.panels} />
            </article>
          ))}
        </section>
      ) : <p className="archive-empty-state muted">还没有已保存的简报。</p>}
    </main>
  );
}

function Gallery({ title, images, empty }: { title: string; images: string[]; empty?: string }) {
  return (
    <section className="archive-gallery-section">
      <h3>{title}</h3>
      {images.length ? (
        <div className="archive-gallery">
          {images.map((imageUrl, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={`${imageUrl}-${index}`} src={imageUrl} alt={`${title} ${index + 1}`} loading="lazy" />
          ))}
        </div>
      ) : <p className="muted archive-empty">{empty}</p>}
    </section>
  );
}

function SourceLinks({ panels }: { panels: Array<Pick<ArchivedVisualBriefPanel, "sourceUrls">> }) {
  const urls = Array.from(new Set(panels.flatMap((panel) => panel.sourceUrls)));
  if (!urls.length) return null;
  return (
    <section className="archive-sources">
      <h3>原始信号来源</h3>
      {urls.map((url) => (
        <a key={url} href={url} rel="noreferrer" target="_blank">
          <ExternalLink size={14} />
          <span>{url}</span>
        </a>
      ))}
    </section>
  );
}

function formatGeneratedAt(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai"
  }).format(new Date(value));
}
