import { optionalEnv } from "@/lib/env";
import { upstreamError } from "@/lib/server/generation-progress";

type GeneratedSeedreamImage = {
  prompt: string;
  url: string;
  storagePath: string;
};

type SeedreamProgressStatus = "running" | "retrying" | "degraded" | "success";

export async function generateSeedreamImages(input: {
  runId: string;
  prompts: string[];
  concurrency?: number;
  requestTimeoutMs?: number;
  retryDelayMs?: number;
  phaseTimeoutMs?: number;
  onProgress?: (event: {
    index: number;
    total: number;
    status: SeedreamProgressStatus;
    detail?: string;
  }) => void;
}): Promise<GeneratedSeedreamImage[]> {
  const apiKey = optionalEnv("ARK_API_KEY");
  const model = optionalEnv("ARK_SEEDREAM_MODEL");
  if (!apiKey || !model) {
    return input.prompts.map((prompt, index) => placeholderImage(input.runId, prompt, index + 1));
  }

  const total = input.prompts.length;
  const concurrency = Math.min(Math.max(input.concurrency ?? 3, 1), Math.max(total, 1));
  const requestTimeoutMs = input.requestTimeoutMs ?? 75_000;
  const retryDelayMs = input.retryDelayMs ?? 800;
  const deadline = Date.now() + (input.phaseTimeoutMs ?? 160_000);
  const generated = new Array<GeneratedSeedreamImage>(total);
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (true) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= total) {
          return;
        }

        generated[index] = await generateOneImage({
          apiKey,
          model,
          runId: input.runId,
          prompt: input.prompts[index],
          index: index + 1,
          total,
          requestTimeoutMs,
          retryDelayMs,
          deadline,
          onProgress: input.onProgress
        });
      }
    })
  );

  return generated;
}

async function generateOneImage(input: {
  apiKey: string;
  model: string;
  runId: string;
  prompt: string;
  index: number;
  total: number;
  requestTimeoutMs: number;
  retryDelayMs: number;
  deadline: number;
  onProgress?: (event: {
    index: number;
    total: number;
    status: SeedreamProgressStatus;
    detail?: string;
  }) => void;
}): Promise<GeneratedSeedreamImage> {
  let lastError = "";

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const remainingMs = input.deadline - Date.now();
    if (remainingMs <= 0) {
      lastError = "Seedream 阶段已达到时间上限";
      break;
    }

    input.onProgress?.({
      index: input.index,
      total: input.total,
      status: attempt === 1 ? "running" : "retrying",
      detail: attempt === 1 ? undefined : lastError
    });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        Math.max(1, Math.min(input.requestTimeoutMs, remainingMs))
      );
      const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: input.model,
          prompt: input.prompt,
          size: "2048x2048",
          response_format: "url"
        }),
        signal: controller.signal
      }).finally(() => clearTimeout(timeout));

      if (!response.ok) {
        throw await upstreamError("Seedream", response);
      }

      const payload = (await response.json()) as { data?: Array<{ url?: string }> };
      input.onProgress?.({ index: input.index, total: input.total, status: "success" });
      return {
        prompt: input.prompt,
        url: payload.data?.[0]?.url ?? placeholderImageUrl(input.index),
        storagePath: storagePath(input.runId, input.index)
      };
    } catch (error) {
      lastError = describeError(error);
      if (attempt === 1 && input.retryDelayMs > 0) {
        await sleep(input.retryDelayMs);
      }
    }
  }

  input.onProgress?.({
    index: input.index,
    total: input.total,
    status: "degraded",
    detail: lastError
  });
  return placeholderImage(input.runId, input.prompt, input.index);
}

function placeholderImage(runId: string, prompt: string, index: number): GeneratedSeedreamImage {
  return {
    prompt,
    url: placeholderImageUrl(index),
    storagePath: storagePath(runId, index)
  };
}

function storagePath(runId: string, index: number): string {
  return `article-assets/${runId}/images/image-${String(index).padStart(2, "0")}.png`;
}

function describeError(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") {
    return "Seedream 请求超时";
  }
  return error instanceof Error ? error.message : String(error);
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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
