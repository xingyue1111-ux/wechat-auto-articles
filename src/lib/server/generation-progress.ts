export type GenerationLogLevel = "info" | "running" | "success" | "error";

export type GenerationStage =
  | "system"
  | "aihot"
  | "hacker-news"
  | "hugging-face"
  | "arxiv"
  | "github-releases"
  | "sources"
  | "deepseek"
  | "seedream"
  | "blob"
  | "render"
  | "manifest";

export type GenerationLogEvent = {
  type: "log";
  level: GenerationLogLevel;
  stage: GenerationStage;
  message: string;
  detail?: string;
  timestamp: string;
};

export type GenerationStreamEvent =
  | GenerationLogEvent
  | {
      type: "complete";
      redirectUrl: string;
      timestamp: string;
    }
  | {
      type: "error";
      message: string;
      detail?: string;
      timestamp: string;
    };

export type GenerationProgressReporter = (event: GenerationLogEvent) => void;

export function createProgressLog(
  level: GenerationLogLevel,
  stage: GenerationStage,
  message: string,
  detail?: string
): GenerationLogEvent {
  return {
    type: "log",
    level,
    stage,
    message,
    detail: detail ? redactSensitiveText(detail) : undefined,
    timestamp: new Date().toISOString()
  };
}

export function serializeSseEvent(event: GenerationStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export function describeGenerationError(error: unknown): string {
  if (error instanceof Error) {
    return redactSensitiveText(error.message);
  }
  return redactSensitiveText(String(error));
}

export function redactSensitiveText(text: string): string {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(
      /("(?:api[_-]?key|token|authorization|secret|password)"\s*:\s*")[^"]+(")/gi,
      "$1[REDACTED]$2"
    )
    .replace(/([?&](?:token|api[_-]?key|secret)=)[^&\s]+/gi, "$1[REDACTED]")
    .slice(0, 1200);
}

export async function upstreamError(service: string, response: Response): Promise<Error> {
  const rawBody = await response.text().catch(() => "");
  const detail = redactSensitiveText(rawBody.trim());
  const suffix = detail ? `: ${detail}` : "";
  return new Error(`${service} request failed with ${response.status} ${response.statusText}${suffix}`);
}
