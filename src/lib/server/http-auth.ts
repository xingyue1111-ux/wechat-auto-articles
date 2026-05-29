import { optionalEnv } from "@/lib/env";

export function assertCronAuthorization(request: Request): Response | null {
  const secret = optionalEnv("CRON_SECRET");
  if (!secret) {
    return new Response("CRON_SECRET is not configured", { status: 503 });
  }

  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  return null;
}
