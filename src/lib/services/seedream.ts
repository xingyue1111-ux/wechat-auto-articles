import { optionalEnv } from "@/lib/env";
import { upstreamError } from "@/lib/server/generation-progress";

export async function generateSeedreamImages(input: {
  runId: string;
  prompts: string[];
  onProgress?: (event: { index: number; total: number; status: "running" | "success" }) => void;
}): Promise<Array<{ prompt: string; url: string; storagePath: string }>> {
  const apiKey = optionalEnv("ARK_API_KEY");
  const model = optionalEnv("ARK_SEEDREAM_MODEL");
  if (!apiKey || !model) {
    return input.prompts.map((prompt, index) => ({
      prompt,
      url: placeholderImageUrl(index + 1),
      storagePath: `article-assets/${input.runId}/images/image-${String(index + 1).padStart(2, "0")}.png`
    }));
  }

  const generated: Array<{ prompt: string; url: string; storagePath: string }> = [];
  for (const [index, prompt] of input.prompts.entries()) {
    input.onProgress?.({ index: index + 1, total: input.prompts.length, status: "running" });
    const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        prompt,
        size: "1024x1024",
        response_format: "url"
      })
    });

    if (!response.ok) {
      throw await upstreamError("Seedream", response);
    }

    const payload = (await response.json()) as { data?: Array<{ url?: string }> };
    generated.push({
      prompt,
      url: payload.data?.[0]?.url ?? placeholderImageUrl(index + 1),
      storagePath: `article-assets/${input.runId}/images/image-${String(index + 1).padStart(2, "0")}.png`
    });
    input.onProgress?.({ index: index + 1, total: input.prompts.length, status: "success" });
  }

  return generated;
}

function placeholderImageUrl(index: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#f4e8cf"/>
  <circle cx="216" cy="224" r="138" fill="#0f766e" opacity=".26"/>
  <circle cx="790" cy="764" r="186" fill="#d89a2b" opacity=".28"/>
  <path d="M170 590 C 310 410, 506 740, 846 438" fill="none" stroke="#0f766e" stroke-width="28" stroke-linecap="round"/>
  <rect x="218" y="294" width="588" height="380" rx="34" fill="#fffdf8" stroke="#17211f" stroke-width="8"/>
  <text x="512" y="500" text-anchor="middle" font-family="Arial" font-size="54" font-weight="700" fill="#17211f">AI HOT ${index}</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
