import { beforeEach, describe, expect, it, vi } from "vitest";

const listPublicBlobPathnames = vi.hoisted(() => vi.fn());
const getTextBlob = vi.hoisted(() => vi.fn());

vi.mock("@/lib/storage/blob", () => ({
  listPublicBlobPathnames,
  getTextBlob
}));

import { listArticleManifestSummaries } from "@/lib/server/visual-manifest";

describe("article manifest archive", () => {
  beforeEach(() => {
    listPublicBlobPathnames.mockResolvedValue([
      "articles/2026-05-31/manifest.json",
      "articles/2026-05-31/runs/run-old/manifest.json",
      "articles/2026-05-31/runs/run-new/manifest.json",
      "articles/2026-05-30/manifest.json"
    ]);
    getTextBlob.mockImplementation(async (pathname: string) => JSON.stringify({
      date: pathname.includes("2026-05-31") ? "2026-05-31" : "2026-05-30",
      title: "企业 AI 日报",
      subtitle: "过去 24 小时",
      generatedAt: pathname.includes("2026-05-31") ? "2026-05-31T11:00:00.000Z" : "2026-05-30T11:00:00.000Z",
      sourceWindow: "24h",
      panels: [
        { index: 1, kind: "cover", title: "封面", imageUrl: "https://blob.example/1.png", width: 1080, height: 2000, sourceUrls: [] },
        { index: 2, kind: "news", title: "主线", imageUrl: "https://blob.example/2.png", width: 1080, height: 2000, sourceUrls: [] },
        { index: 3, kind: "news", title: "雷达", imageUrl: "https://blob.example/3.png", width: 1080, height: 2000, sourceUrls: [] },
        { index: 4, kind: "takeaway", title: "判断", imageUrl: "https://blob.example/4.png", width: 1080, height: 2000, sourceUrls: [] }
      ]
    }));
  });

  it("lists one stable manifest per day and ignores run manifests", async () => {
    const articles = await listArticleManifestSummaries();

    expect(articles.map((article) => article.date)).toEqual(["2026-05-31", "2026-05-30"]);
    expect(getTextBlob).toHaveBeenCalledTimes(2);
  });
});
