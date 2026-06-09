import { optionalEnv } from "@/lib/env";
import { upstreamError } from "@/lib/server/generation-progress";

const MODEL = "deepseek-v4-pro";
const MAX_TOKENS = 12000;
const REQUEST_TIMEOUT_MS = 75_000;

export async function generateWithDeepSeek(input: {
  system: string;
  prompt: string;
  fallback: string;
  requestTimeoutMs?: number;
}): Promise<string> {
  const apiKey = optionalEnv("DEEPSEEK_API_KEY");
  if (!apiKey) {
    return input.fallback;
  }

  const requestTimeoutMs = input.requestTimeoutMs ?? REQUEST_TIMEOUT_MS;
  let response: Response;
  try {
    response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.prompt }
        ]
      }),
      signal: AbortSignal.timeout(requestTimeoutMs)
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new Error(`DeepSeek 请求超时，请缩短输入素材或稍后重试。当前 timeout=${requestTimeoutMs}ms`);
    }
    throw error;
  }

  if (!response.ok) {
    throw await upstreamError("DeepSeek", response);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ finish_reason?: string; message?: { content?: string } }>;
  };
  const choice = payload.choices?.[0];
  if (choice?.finish_reason === "length") {
    throw new Error(`DeepSeek 输出被截断，请提高 max_tokens 或缩短输入素材。当前 max_tokens=${MAX_TOKENS}`);
  }
  return choice?.message?.content?.trim() || input.fallback;
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
