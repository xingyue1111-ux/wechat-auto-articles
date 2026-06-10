import { optionalEnv } from "@/lib/env";
import { upstreamError } from "@/lib/server/generation-progress";

type GeneratedSeedreamImage = {
  prompt: string;
  url: string;
  storagePath: string;
};

export type SeedreamImageSize = "1536x2048" | "2048x1536" | "3136x1344";

export type SeedreamPromptRequest = {
  prompt: string;
  size?: SeedreamImageSize;
};

type SeedreamProgressStatus = "running" | "retrying" | "failed" | "success";

const DEFAULT_ARTICLE_IMAGE_SIZE: SeedreamImageSize = "1536x2048";

export async function generateSeedreamImages(input: {
  runId: string;
  prompts: Array<string | SeedreamPromptRequest>;
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
  const requests = input.prompts.map(normalizeRequest);
  if (!apiKey || !model) {
    return requests.map((request, index) => placeholderImage(input.runId, request, index + 1));
  }

  const total = requests.length;
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
          request: requests[index],
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
  request: SeedreamPromptRequest & { size: SeedreamImageSize };
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
          prompt: input.request.prompt,
          size: input.request.size,
          response_format: "url"
        }),
        signal: controller.signal
      }).finally(() => clearTimeout(timeout));

      if (!response.ok) {
        throw await upstreamError("Seedream", response);
      }

      const payload = (await response.json()) as { data?: Array<{ url?: string }> };
      const url = payload.data?.[0]?.url;
      if (!url) {
        throw new Error("Seedream 返回结果缺少图片 URL");
      }
      input.onProgress?.({ index: input.index, total: input.total, status: "success" });
      return {
        prompt: input.request.prompt,
        url,
        storagePath: storagePath(input.runId, input.index)
      };
    } catch (error) {
      lastError = describeError(error);
      if (isTimeoutError(error)) {
        break;
      }
      if (attempt === 1 && input.retryDelayMs > 0) {
        await sleep(input.retryDelayMs);
      }
    }
  }

  input.onProgress?.({
    index: input.index,
    total: input.total,
    status: "failed",
    detail: lastError
  });
  return placeholderImage(input.runId, input.request, input.index);
}

function normalizeRequest(prompt: string | SeedreamPromptRequest): SeedreamPromptRequest & { size: SeedreamImageSize } {
  if (typeof prompt === "string") {
    return { prompt, size: DEFAULT_ARTICLE_IMAGE_SIZE };
  }
  return {
    prompt: prompt.prompt,
    size: prompt.size ?? DEFAULT_ARTICLE_IMAGE_SIZE
  };
}

function placeholderImage(
  runId: string,
  request: SeedreamPromptRequest & { size: SeedreamImageSize },
  index: number
): GeneratedSeedreamImage {
  return {
    prompt: request.prompt,
    url: placeholderImageUrl(index, request.size),
    storagePath: storagePath(runId, index)
  };
}

function storagePath(runId: string, index: number): string {
  return `article-assets/${runId}/images/image-${String(index).padStart(2, "0")}.png`;
}

function describeError(error: unknown): string {
  if (isTimeoutError(error)) {
    return "Seedream 请求超时";
  }
  if (error instanceof Error && error.name === "AbortError") {
    return "Seedream 请求超时";
  }
  return error instanceof Error ? error.message : String(error);
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
    return true;
  }
  if (typeof error === "object" && error !== null) {
    const name = "name" in error ? String(error.name) : "";
    const message = "message" in error ? String(error.message) : "";
    return name === "AbortError" || name === "TimeoutError" || message.includes("aborted due to timeout");
  }
  return false;
}

function placeholderImageUrl(index: number, size: SeedreamImageSize): string {
  const [width, height] = size.split("x").map(Number);
  const centerX = width / 2;
  const centerY = height / 2;
  const cardWidth = Math.round(width * 0.58);
  const cardHeight = Math.round(height * 0.38);
  const cardX = Math.round((width - cardWidth) / 2);
  const cardY = Math.round((height - cardHeight) / 2);
  const fontSize = Math.round(Math.min(width, height) * 0.07);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#f4e8cf"/>
  <circle cx="${Math.round(width * 0.18)}" cy="${Math.round(height * 0.28)}" r="${Math.round(Math.min(width, height) * 0.18)}" fill="#0f766e" opacity=".26"/>
  <circle cx="${Math.round(width * 0.78)}" cy="${Math.round(height * 0.74)}" r="${Math.round(Math.min(width, height) * 0.22)}" fill="#d89a2b" opacity=".28"/>
  <path d="M${Math.round(width * 0.1)} ${Math.round(height * 0.66)} C ${Math.round(width * 0.28)} ${Math.round(height * 0.3)}, ${Math.round(width * 0.5)} ${Math.round(height * 0.84)}, ${Math.round(width * 0.88)} ${Math.round(height * 0.34)}" fill="none" stroke="#0f766e" stroke-width="${Math.round(Math.min(width, height) * 0.035)}" stroke-linecap="round"/>
  <rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="${Math.round(Math.min(width, height) * 0.045)}" fill="#fffdf8" stroke="#17211f" stroke-width="${Math.round(Math.min(width, height) * 0.012)}"/>
  <text x="${centerX}" y="${centerY}" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="${fontSize}" font-weight="700" fill="#17211f">AI HOT ${index}</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
