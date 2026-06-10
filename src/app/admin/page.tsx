import type { ReactNode } from "react";
import { CalendarDays, Eye, ImagePlus, Link2, Sparkles } from "lucide-react";
import { GenerateBriefForm } from "@/components/generate-brief-form";
import { articleAdminHref } from "@/lib/article-routes";
import { listArticleManifestSummaries } from "@/lib/server/visual-manifest";

export const maxDuration = 300;

const PUBLIC_SOURCES = [
  "AI HOT",
  "Hacker News",
  "Hugging Face Daily Papers",
  "arXiv RSS",
  "GitHub Releases"
];

export default async function AdminPage() {
  const articles = await listArticleManifestSummaries().catch(() => []);

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <p className="eyebrow">Enterprise AI Visual Brief</p>
          <h1>公众号文章生成台</h1>
          <p className="muted">聚合五路公开信号，生成完整公众号正文、4 张内嵌 Seedream 正文配图和 1 张横版封面图。</p>
        </div>
        <div className="topbar-actions">
          <a className="button secondary" href="/archive">
            <Eye size={18} />
            <span style={{ marginLeft: 8 }}>历史归档</span>
          </a>
          <a className="button secondary" href="/latest" aria-label="查看最新文章">
            <Link2 size={18} />
            <span style={{ marginLeft: 8 }}>查看 latest</span>
          </a>
        </div>
      </header>

      <section className="grid" aria-label="生成能力">
        <Metric icon={<Sparkles size={20} />} label="公开信号源" value="5 路" />
        <Metric icon={<ImagePlus size={20} />} label="正文配图 + 封面" value="4+1 张" />
        <Metric icon={<CalendarDays size={20} />} label="定时任务" value="19:00" />
        <Metric icon={<Link2 size={20} />} label="保存位置" value="Blob" />
      </section>

      <section className="source-strip" aria-label="公开信号源明细">
        <span className="source-strip-label">公开信号源</span>
        {PUBLIC_SOURCES.map((source) => (
          <span className="source-chip" key={source}>{source}</span>
        ))}
      </section>

      <section className="panel">
        <h2>立即生成</h2>
        <p className="muted">生成过程会抓取新闻、调用 DeepSeek 生成完整文章、调用 Seedream 生成正文配图和封面图，再输出可一键复制到公众号的正文。</p>
        <GenerateBriefForm />
      </section>

      <section className="panel">
        <h2>已保存简报</h2>
        <p className="muted">每次生成完成后都会保存到 Blob。可以随时回来查看，不需要当场下载。</p>
        {articles.length ? (
          <div className="article-history">
            {articles.map((article) => (
              <article className="article-history-row" key={`${article.date}-${article.revision ?? article.generatedAt}`}>
                {coverImageUrl(article) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="article-history-cover" src={coverImageUrl(article)} alt="" loading="lazy" />
                ) : null}
                <div>
                  <strong>{article.date}</strong>
                  <span>{article.title}</span>
                  <small>{generationModeLabel(article)} · 公众号 HTML · 4 张内嵌配图 · 1 张封面图</small>
                </div>
                <a className="button secondary compact" href={articleAdminHref(article)}>
                  <Eye size={16} />
                  <span>查看发布稿</span>
                </a>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted history-empty">还没有已保存的简报。</p>
        )}
      </section>
    </main>
  );
}

function coverImageUrl(article: Awaited<ReturnType<typeof listArticleManifestSummaries>>[number]): string | undefined {
  return article.coverImageUrl ?? article.illustrations?.[0]?.imageUrl ?? article.panels[0]?.imageUrl;
}

function generationModeLabel(article: Awaited<ReturnType<typeof listArticleManifestSummaries>>[number]): string {
  if (article.generation?.contentMode === "fallback") {
    return "规则兜底";
  }
  if (article.generation?.contentMode === "deepseek") {
    return "DeepSeek 正文";
  }
  return "生成模式未知";
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="metric">
      <div style={{ color: "var(--teal)", marginBottom: 10 }}>{icon}</div>
      <strong>{value}</strong>
      <span className="muted">{label}</span>
    </div>
  );
}
