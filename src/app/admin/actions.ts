"use server";

import { redirect } from "next/navigation";
import { generateDailyVisualBrief } from "@/lib/server/visual-pipeline";

export async function generateVisualBriefAction(): Promise<void> {
  const manifest = await generateDailyVisualBrief();
  redirect(`/article/${manifest.date}`);
}
