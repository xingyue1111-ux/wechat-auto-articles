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

  it("uses a local placeholder when the generated image cannot be downloaded", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "";
    vi.stubGlobal("fetch", async () => {
      throw new Error("temporary download failure");
    });

    const image = await persistSeedreamImageForRender(
      "2026-05-30",
      2,
      "https://seedream.example/generated.png"
    );

    expect(image.renderUrl).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(image.renderUrl).not.toBe("https://seedream.example/generated.png");
  });
});
