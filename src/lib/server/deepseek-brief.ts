import type { BriefContext } from "@/lib/visual-brief";
import { buildFallbackVisualBrief, normalizeVisualBriefWithDiagnostics } from "@/lib/visual-brief";

export type DeepSeekBriefDiagnostics = {
  contentMode: "deepseek" | "fallback";
  attempts: number;
  degradationReason?: string;
};

export async function generateVisualBriefWithRetry(input: {
  context: BriefContext;
  request: () => Promise<string>;
  maxAttempts?: number;
  onRetry?: (reason: string) => void;
}): Promise<{
  brief: ReturnType<typeof buildFallbackVisualBrief>;
  diagnostics: DeepSeekBriefDiagnostics;
}> {
  const maxAttempts = input.maxAttempts ?? 2;
  let degradationReason = "DeepSeek 未返回可用内容";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const normalized = normalizeVisualBriefWithDiagnostics(await input.request(), input.context);
      if (!normalized.usedFallback) {
        return {
          brief: normalized.brief,
          diagnostics: { contentMode: "deepseek", attempts: attempt }
        };
      }
      degradationReason = normalized.reason ?? degradationReason;
    } catch (error) {
      degradationReason = error instanceof Error ? error.message : String(error);
    }

    if (isDeepSeekTimeout(degradationReason)) {
      break;
    }

    if (attempt < maxAttempts) {
      input.onRetry?.(degradationReason);
    }
  }

  return {
    brief: buildFallbackVisualBrief(input.context),
    diagnostics: {
      contentMode: "fallback",
      attempts: maxAttempts,
      degradationReason
    }
  };
}

function isDeepSeekTimeout(reason: string): boolean {
  return reason.includes("DeepSeek 请求超时") || reason.includes("DeepSeek 璇锋眰瓒呮椂");
}
