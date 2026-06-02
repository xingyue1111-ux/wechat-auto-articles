import { putPublicBlob } from "@/lib/storage/blob";
import { seedreamBlobPath } from "@/lib/storage/paths";

export type PersistedSeedreamImage = {
  assetUrl: string;
  renderUrl: string;
};

export type PersistSeedreamOptions = {
  requestTimeoutMs?: number;
  retryDelayMs?: number;
};

export async function persistSeedreamImageForRender(
  date: string,
  index: number,
  url: string,
  revision?: string,
  options: PersistSeedreamOptions = {}
): Promise<PersistedSeedreamImage> {
  if (url.startsWith("data:")) {
    return { assetUrl: url, renderUrl: url };
  }

  let lastError = "";
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(options.requestTimeoutMs ?? 20_000)
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const contentType = response.headers.get("content-type") ?? "image/png";
      const body = new Uint8Array(await response.arrayBuffer());
      const blob = await putPublicBlob(seedreamBlobPath(date, index, revision), body, contentType);
      return {
        assetUrl: blob.url,
        renderUrl: `data:${contentType};base64,${Buffer.from(body).toString("base64")}`
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      const retryDelayMs = options.retryDelayMs ?? 800;
      if (attempt === 1 && retryDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }
  throw new Error(`Seedream 配图 ${index} 下载失败：${lastError}`);
}
