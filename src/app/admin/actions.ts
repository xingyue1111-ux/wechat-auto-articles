"use server";

import { redirect } from "next/navigation";
import { articleAdminHref } from "@/lib/article-routes";
import { generateDailyVisualBrief } from "@/lib/server/visual-pipeline";

export type GenerateVisualBriefState = {
  status: "idle" | "error";
  message?: string;
};

export async function generateVisualBriefAction(
  _previousState: GenerateVisualBriefState
): Promise<GenerateVisualBriefState> {
  let redirectUrl: string;
  try {
    const manifest = await generateDailyVisualBrief();
    redirectUrl = articleAdminHref(manifest);
  } catch (error) {
    console.error("Visual brief generation failed", error);
    return {
      status: "error",
      message: "生成失败。请检查 Vercel 日志、密钥和接口配置后重试。"
    };
  }

  redirect(redirectUrl);
}
