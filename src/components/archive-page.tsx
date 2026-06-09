import { ArrowLeft, ExternalLink, Images } from "lucide-react";
import type { ArchivedVisualBriefPanel, VisualBriefManifest } from "@/lib/domain/types";
import { articleAdminHref } from "@/lib/article-routes";

export function ArchivePage({ articles }: { articles: VisualBriefManifest[] }) {
  return (
    <main className="archive-page">
      <header className="archive-header">
        <div>
          <p className="eyebrow">Enterprise AI Visual Brief</p>
          <h1>历史归档</h1>
          <p className="muted">每次点击生成都会保存为一篇独立文章。正文、Seedream 配图和原始信号都保存在这里。</p>
        </div>
        <a className="button secondary compact" href="/admin">
          <ArrowLeft size={16} />
          <span>返回生成台</span>
        </a>
      </header>

      {articles.length ? (
        <section className="archive-list" aria-label="历史简报">
          {articles.map((article) => (
            <article className="archive-card" key={`${article.date}-${article.revision ?? article.generatedAt}`}>
              <div className="archive-card-heading">
                <div>
                  <time dateTime={article.generatedAt}>{article.date}</time>
                  <h2>{article.title}</h2>
                  <p className="muted">{article.subtitle}</p>
                  <small>{formatGeneratedAt(article.generatedAt)} · {(article.illustrations ?? []).length} 张 Seedream 配图</small>
                </div>
                <a className="button secondary compact" href={articleAdminHref(article)}>
                  <Images size={16} />
                  <span>查看发布稿</span>
                </a>
              </div>
              {coverImageUrl(article) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="archive-card-cover" src={coverImageUrl(article)} alt="" loading="lazy" />
              ) : null}

              <details className="archive-copy">
                <summary>公众号完整正文</summary>
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
              <SourceLinks panels={article.article?.panels ?? article.panels} />
            </article>
          ))}
        </section>
      ) : <p className="archive-empty-state muted">还没有已保存的简报。</p>}
    </main>
  );
}

function coverImageUrl(article: VisualBriefManifest): string | undefined {
  return article.coverImageUrl ?? article.illustrations?.[0]?.imageUrl ?? article.panels[0]?.imageUrl;
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
