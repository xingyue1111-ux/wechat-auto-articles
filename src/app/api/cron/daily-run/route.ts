import { assertCronAuthorization } from "@/lib/server/http-auth";
import { generateDailyVisualBrief } from "@/lib/server/visual-pipeline";

export async function GET(request: Request) {
  const unauthorized = assertCronAuthorization(request);
  if (unauthorized) {
    return unauthorized;
  }

  const manifest = await generateDailyVisualBrief();
  return Response.json({ ok: true, manifest });
}
