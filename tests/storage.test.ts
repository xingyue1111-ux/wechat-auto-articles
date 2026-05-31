import { describe, expect, it } from "vitest";
import { getTextBlob, listPublicBlobPathnames, putPublicBlob } from "@/lib/storage/blob";
import { articleManifestPath, latestManifestPath, panelBlobPath, seedreamBlobPath } from "@/lib/storage/paths";

describe("blob storage paths", () => {
  it("uses the agreed Vercel Blob layout", () => {
    expect(articleManifestPath("2026-05-29")).toBe("articles/2026-05-29/manifest.json");
    expect(seedreamBlobPath("2026-05-29", 2)).toBe("articles/2026-05-29/seedream/02-illustration.png");
    expect(latestManifestPath()).toBe("latest.json");
  });

  it("uses revisioned image paths so same-day reruns cannot serve stale CDN images", () => {
    expect(seedreamBlobPath("2026-05-31", 2, "run-190000")).toBe(
      "articles/2026-05-31/runs/run-190000/seedream/02-illustration.png"
    );
    expect(panelBlobPath("2026-05-31", 1, "cover", "run-190000")).toBe(
      "articles/2026-05-31/runs/run-190000/panels/01-cover.png"
    );
    expect(articleManifestPath("2026-05-31", "run-190000")).toBe(
      "articles/2026-05-31/runs/run-190000/manifest.json"
    );
  });

  it("keeps local fallback blobs readable when Vercel Blob is not configured", async () => {
    const previousBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_READ_WRITE_TOKEN = "";

    try {
      await putPublicBlob(articleManifestPath("2026-05-29"), "{\"ok\":true}", "application/json");

      const text = await getTextBlob("memory://articles/2026-05-29/manifest.json");
      expect(text).toBe("{\"ok\":true}");
    } finally {
      if (previousBlobToken === undefined) {
        delete process.env.BLOB_READ_WRITE_TOKEN;
      } else {
        process.env.BLOB_READ_WRITE_TOKEN = previousBlobToken;
      }
    }
  });

  it("lists saved local manifests so the admin can show generation history", async () => {
    const previousBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_READ_WRITE_TOKEN = "";

    try {
      await putPublicBlob(articleManifestPath("2026-05-29"), "{}", "application/json");
      await putPublicBlob(articleManifestPath("2026-05-30"), "{}", "application/json");
      await putPublicBlob(seedreamBlobPath("2026-05-30", 1), new Uint8Array([1]), "image/png");

      expect(await listPublicBlobPathnames("articles/")).toEqual(
        expect.arrayContaining([
          "articles/2026-05-29/manifest.json",
          "articles/2026-05-30/manifest.json"
        ])
      );
    } finally {
      if (previousBlobToken === undefined) {
        delete process.env.BLOB_READ_WRITE_TOKEN;
      } else {
        process.env.BLOB_READ_WRITE_TOKEN = previousBlobToken;
      }
    }
  });
});
