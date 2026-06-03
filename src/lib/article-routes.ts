import type { VisualBriefManifest } from "@/lib/domain/types";

type ArticleRouteTarget = Pick<VisualBriefManifest, "date" | "revision">;

export function articleAdminHref(article: ArticleRouteTarget): string {
  return articleHref("/admin/article", article);
}

export function articleLongImageHref(article: ArticleRouteTarget): string {
  return articleHref("/article", article);
}

function articleHref(base: string, article: ArticleRouteTarget): string {
  const pathname = `${base}/${encodeURIComponent(article.date)}`;
  return article.revision ? `${pathname}?run=${encodeURIComponent(article.revision)}` : pathname;
}
