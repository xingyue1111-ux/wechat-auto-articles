import { hasValidAdminSession } from "@/lib/admin/auth";
import {
  createProgressLog,
  describeGenerationError,
  serializeSseEvent,
  type GenerationStreamEvent
} from "@/lib/server/generation-progress";
import { generateDailyVisualBrief } from "@/lib/server/visual-pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const runtime = "nodejs";

export async function POST() {
  if (!(await hasValidAdminSession())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let isClosed = false;
      const send = (event: GenerationStreamEvent) => {
        if (isClosed) {
          return;
        }
        try {
          controller.enqueue(encoder.encode(serializeSseEvent(event)));
        } catch {
          isClosed = true;
        }
      };

      void (async () => {
        try {
          const manifest = await generateDailyVisualBrief({
            onProgress: (event) => send(event)
          });
          send({
            type: "complete",
            redirectUrl: `/admin/article/${manifest.date}`,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          const detail = describeGenerationError(error);
          send(createProgressLog("error", "system", "生成失败", detail));
          send({
            type: "error",
            message: "生成失败，请查看最后一条错误日志。",
            detail,
            timestamp: new Date().toISOString()
          });
        } finally {
          if (!isClosed) {
            controller.close();
          }
        }
      })();
    }
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no"
    }
  });
}
