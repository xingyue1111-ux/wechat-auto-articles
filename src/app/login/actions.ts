"use server";

import { redirect } from "next/navigation";
import { isValidAdminPassword, setAdminSession } from "@/lib/admin/auth";

export async function loginAction(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");
  if (!isValidAdminPassword(password)) {
    redirect("/login?error=1");
  }

  await setAdminSession(password);
  redirect("/admin");
}
