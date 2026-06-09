import { optionalEnv } from "@/lib/env";
import { generateDailyVisualBrief } from "@/lib/server/visual-pipeline";

export const maxDuration = 300;

export async function POST(request: Request) {
  const adminPassword = optionalEnv("ADMIN_PASSWORD");
  const cronSecret = optionalEnv("CRON_SECRET");
  const auth = request.headers.get("authorization");
  const password = request.headers.get("x-admin-password");
  const allowLocalNoSecret = process.env.NODE_ENV !== "production" && !adminPassword && !cronSecret;
  const allowed =
    (adminPassword && password === adminPassword) ||
    (cronSecret && auth === `Bearer ${cronSecret}`) ||
    allowLocalNoSecret;

  if (!allowed) {
    return new Response("Unauthorized", { status: 401 });
  }

  const manifest = await generateDailyVisualBrief();
  return Response.json({ ok: true, manifest });
}
