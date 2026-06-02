import { afterEach, describe, expect, it, vi } from "vitest";
import { persistSeedreamImageForRender } from "@/lib/server/persist-seedream-image";

describe("persisted Seedream image rendering", () => {
  const originalToken = process.env.BLOB_READ_WRITE_TOKEN;

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.BLOB_READ_WRITE_TOKEN = originalToken;
  });

  it("renders from downloaded bytes instead of fetching the Blob URL again", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "";
    vi.stubGlobal("fetch", async () =>
      new Response(new Uint8Array([137, 80, 78, 71]), {
        headers: { "content-type": "image/png" }
      })
    );

    const image = await persistSeedreamImageForRender(
      "2026-05-30",
      1,
      "https://seedream.example/generated.png"
    );

    expect(image.renderUrl).toBe("data:image/png;base64,iVBORw==");
    expect(image.renderUrl).not.toBe("https://seedream.example/generated.png");
  });

  it("retries once and aborts the run when the generated image cannot be downloaded", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "";
    let attempts = 0;
    vi.stubGlobal("fetch", async () => {
      attempts += 1;
      throw new Error("temporary download failure");
    });

    await expect(persistSeedreamImageForRender(
      "2026-05-30",
      2,
      "https://seedream.example/generated.png",
      undefined,
      { retryDelayMs: 0 }
    )).rejects.toThrow("Seedream 配图 2 下载失败");

    expect(attempts).toBe(2);
  });
});
