import type { VisualBriefManifest } from "@/lib/domain/types";

export function VisualBriefPage({ manifest }: { manifest: VisualBriefManifest }) {
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
