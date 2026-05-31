import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const putMock = vi.hoisted(() => vi.fn(async () => ({ url: "https://blob.example/result.png" })));

vi.mock("@vercel/blob", () => ({
  get: vi.fn(),
  put: putMock
}));

import { putPublicBlob } from "@/lib/storage/blob";

describe("Vercel Blob overwrite behavior", () => {
  const originalToken = process.env.BLOB_READ_WRITE_TOKEN;

  beforeEach(() => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";
    putMock.mockClear();
  });

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.BLOB_READ_WRITE_TOKEN;
    } else {
      process.env.BLOB_READ_WRITE_TOKEN = originalToken;
    }
  });

  it("allows reruns to overwrite stable article paths", async () => {
    await putPublicBlob("articles/2026-05-31/panels/01-cover.png", new Uint8Array([1, 2, 3]), "image/png");

    expect(putMock).toHaveBeenCalledWith(
      "articles/2026-05-31/panels/01-cover.png",
      expect.any(Buffer),
      expect.objectContaining({
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "image/png"
      })
    );
  });
});
