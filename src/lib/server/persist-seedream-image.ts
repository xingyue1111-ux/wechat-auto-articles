import { putPublicBlob } from "@/lib/storage/blob";
import { seedreamBlobPath } from "@/lib/storage/paths";

export type PersistedSeedreamImage = {
  assetUrl: string;
  renderUrl: string;
};

export async function persistSeedreamImageForRender(
  date: string,
  index: number,
  url: string,
  revision?: string
): Promise<PersistedSeedreamImage> {
  if (url.startsWith("data:")) {
    return { assetUrl: url, renderUrl: url };
  }

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) {
      return { assetUrl: url, renderUrl: placeholderRenderUrl(index) };
    }
    const contentType = response.headers.get("content-type") ?? "image/png";
    const body = new Uint8Array(await response.arrayBuffer());
    const blob = await putPublicBlob(seedreamBlobPath(date, index, revision), body, contentType);
    return {
      assetUrl: blob.url,
      renderUrl: `data:${contentType};base64,${Buffer.from(body).toString("base64")}`
    };
  } catch {
    return { assetUrl: url, renderUrl: placeholderRenderUrl(index) };
  }
}

function placeholderRenderUrl(index: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#f4e8cf"/>
  <circle cx="216" cy="224" r="138" fill="#0f766e" opacity=".26"/>
  <circle cx="790" cy="764" r="186" fill="#d89a2b" opacity=".28"/>
  <path d="M170 590 C 310 410, 506 740, 846 438" fill="none" stroke="#0f766e" stroke-width="28" stroke-linecap="round"/>
  <rect x="218" y="294" width="588" height="380" rx="34" fill="#fffdf8" stroke="#17211f" stroke-width="8"/>
  <text x="512" y="500" text-anchor="middle" font-family="Arial" font-size="54" font-weight="700" fill="#17211f">ENTERPRISE AI ${index}</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
