import { CalendarDays, Eye, ImagePlus, Link2, Sparkles } from "lucide-react";
import { GenerateBriefForm } from "@/components/generate-brief-form";
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
          <h1>长图简报生成台</h1>
          <p className="muted">聚合五路公开信号，生成面向企业 AI 落地负责人的复古未来主义长图简报。</p>
        </div>
        <div className="topbar-actions">
          <a className="button secondary" href="/archive">
            <Eye size={18} />
            <span style={{ marginLeft: 8 }}>历史归档</span>
          </a>
          <a className="button secondary" href="/latest" aria-label="查看最新长图简报">
            <Link2 size={18} />
            <span style={{ marginLeft: 8 }}>查看 latest</span>
          </a>
        </div>
      </header>

      <section className="grid" aria-label="生成能力">
        <Metric icon={<Sparkles size={20} />} label="公开信号源" value="5 路" />
        <Metric icon={<ImagePlus size={20} />} label="Seedream 配图" value="4 张" />
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
        <p className="muted">生成过程会抓取新闻、调用 DeepSeek、调用 Seedream，再把每一屏合成为真实 PNG 长图。</p>
        <GenerateBriefForm />
      </section>

      <section className="panel">
        <h2>已保存简报</h2>
        <p className="muted">每次生成完成后都会保存在 Blob。可以随时回来查看，不需要当场下载。</p>
        {articles.length ? (
          <div className="article-history">
            {articles.map((article) => (
              <article className="article-history-row" key={`${article.date}-${article.generatedAt}`}>
                {coverImageUrl(article) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="article-history-cover" src={coverImageUrl(article)} alt="" loading="lazy" />
                ) : null}
                <div>
                  <strong>{article.date}</strong>
                  <span>{article.title}</span>
                  <small>{article.panels.length} 张长图</small>
                </div>
                <a className="button secondary compact" href={`/article/${article.date}`}>
                  <Eye size={16} />
                  <span>查看</span>
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

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="metric">
      <div style={{ color: "var(--teal)", marginBottom: 10 }}>{icon}</div>
      <strong>{value}</strong>
      <span className="muted">{label}</span>
    </div>
  );
}
