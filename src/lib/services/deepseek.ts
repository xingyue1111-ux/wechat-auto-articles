import { optionalEnv } from "@/lib/env";
import { upstreamError } from "@/lib/server/generation-progress";

const MODEL = "deepseek-v4-pro";

export async function generateWithDeepSeek(input: {
  system: string;
  prompt: string;
  fallback: string;
}): Promise<string> {
  const apiKey = optionalEnv("DEEPSEEK_API_KEY");
  if (!apiKey) {
    return input.fallback;
  }

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 5000,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.prompt }
      ]
    })
  });

  if (!response.ok) {
    throw await upstreamError("DeepSeek", response);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return payload.choices?.[0]?.message?.content?.trim() || input.fallback;
}
