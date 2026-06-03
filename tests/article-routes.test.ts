import { describe, expect, it } from "vitest";
import { articleAdminHref, articleLongImageHref } from "@/lib/article-routes";

describe("article route helpers", () => {
  it("keeps publishing and long-image links pinned to the same run", () => {
    const article = {
      date: "2026-06-03",
      revision: "run-20260603123000000"
    };

    expect(articleAdminHref(article)).toBe("/admin/article/2026-06-03?run=run-20260603123000000");
    expect(articleLongImageHref(article)).toBe("/article/2026-06-03?run=run-20260603123000000");
  });

  it("keeps old stable date links readable when no run exists", () => {
    const article = { date: "2026-06-03" };

    expect(articleAdminHref(article)).toBe("/admin/article/2026-06-03");
    expect(articleLongImageHref(article)).toBe("/article/2026-06-03");
  });
});
