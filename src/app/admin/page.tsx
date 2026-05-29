import { CalendarDays, ImagePlus, Link2, Sparkles } from "lucide-react";
import { generateVisualBriefAction } from "@/app/admin/actions";

export default async function AdminPage() {
  return (
    <main className="page">
      <header className="topbar">
        <div>
          <p className="eyebrow">AI HOT Visual Brief</p>
          <h1>长图简报生成台</h1>
          <p className="muted">抓取 AI HOT 精选新闻，生成复古未来主义配图长图，并保存到 Vercel Blob。</p>
        </div>
        <a className="button secondary" href="/latest" aria-label="查看最新长图简报">
          <Link2 size={18} />
          <span style={{ marginLeft: 8 }}>查看 latest</span>
        </a>
      </header>

      <section className="grid" aria-label="生成能力">
        <Metric icon={<Sparkles size={20} />} label="内容来源" value="AI HOT" />
        <Metric icon={<ImagePlus size={20} />} label="配图方式" value="Seedream" />
        <Metric icon={<CalendarDays size={20} />} label="定时任务" value="19:00" />
        <Metric icon={<Link2 size={20} />} label="保存位置" value="Blob" />
      </section>

      <section className="panel">
        <h2>立即生成</h2>
        <p className="muted">生成过程会抓取新闻、调用 DeepSeek、调用 Seedream，再把每一屏合成为真实 PNG 长图。</p>
        <form action={generateVisualBriefAction}>
          <button type="submit">
            <ImagePlus size={18} />
            <span style={{ marginLeft: 8 }}>生成今日长图简报</span>
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>历史访问</h2>
        <p className="muted">生成后可以用 `/latest` 查看最新一期，也可以打开 `/article/YYYY-MM-DD` 查看指定日期。</p>
      </section>
    </main>
  );
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
