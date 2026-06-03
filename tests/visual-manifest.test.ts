import { beforeEach, describe, expect, it, vi } from "vitest";

const listPublicBlobPathnames = vi.hoisted(() => vi.fn());
const getTextBlob = vi.hoisted(() => vi.fn());

vi.mock("@/lib/storage/blob", () => ({
  listPublicBlobPathnames,
  getTextBlob
}));

import { listArticleManifestSummaries, readArticleManifest } from "@/lib/server/visual-manifest";

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
      revision: pathname.match(/runs\/([^/]+)\/manifest\.json/)?.[1],
      title: "企业 AI 日报",
      subtitle: "过去 24 小时",
      generatedAt: pathname.includes("run-new")
        ? "2026-05-31T12:00:00.000Z"
        : pathname.includes("run-old")
          ? "2026-05-31T10:00:00.000Z"
          : pathname.includes("2026-05-31")
            ? "2026-05-31T12:00:00.000Z"
            : "2026-05-30T11:00:00.000Z",
      sourceWindow: "24h",
      panels: [
        { index: 1, kind: "cover", title: "封面", imageUrl: "https://blob.example/1.png", width: 1080, height: 2000, sourceUrls: [] },
        { index: 2, kind: "news", title: "主线", imageUrl: "https://blob.example/2.png", width: 1080, height: 2000, sourceUrls: [] },
        { index: 3, kind: "news", title: "雷达", imageUrl: "https://blob.example/3.png", width: 1080, height: 2000, sourceUrls: [] },
        { index: 4, kind: "takeaway", title: "判断", imageUrl: "https://blob.example/4.png", width: 1080, height: 2000, sourceUrls: [] }
      ]
    }));
  });

  it("lists each same-day run and only uses stable manifests when a day has no runs", async () => {
    const articles = await listArticleManifestSummaries();

    expect(articles.map((article) => `${article.date}:${article.revision ?? "stable"}`)).toEqual([
      "2026-05-31:run-new",
      "2026-05-31:run-old",
      "2026-05-30:stable"
    ]);
    expect(getTextBlob).toHaveBeenCalledTimes(3);
  });

  it("reads a specific run manifest by date and revision", async () => {
    const manifest = await readArticleManifest("2026-05-31", "run-new");

    expect(getTextBlob).toHaveBeenCalledWith("articles/2026-05-31/runs/run-new/manifest.json");
    expect(manifest?.revision).toBe("run-new");
  });
});
