import { describe, expect, it } from "vitest";
import { getTextBlob, putPublicBlob } from "@/lib/storage/blob";
import { articleManifestPath, latestManifestPath, seedreamBlobPath } from "@/lib/storage/paths";

describe("blob storage paths", () => {
  it("uses the agreed Vercel Blob layout", () => {
    expect(articleManifestPath("2026-05-29")).toBe("articles/2026-05-29/manifest.json");
    expect(seedreamBlobPath("2026-05-29", 2)).toBe("articles/2026-05-29/seedream/02-illustration.png");
    expect(latestManifestPath()).toBe("latest.json");
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
});
