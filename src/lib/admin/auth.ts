import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { optionalEnv } from "@/lib/env";

const COOKIE_NAME = "wechat_auto_ops_admin";

export function createAdminSessionToken(password: string): string {
  const secret = optionalEnv("ADMIN_PASSWORD") ?? "local-dev-password";
  return createHash("sha256").update(`${secret}:${password}`).digest("hex");
}

export function isValidAdminPassword(password: string): boolean {
  const expected = optionalEnv("ADMIN_PASSWORD");
  if (!expected) {
    return password === "admin";
  }
  return timingSafeTextEqual(password, expected);
}

export async function setAdminSession(password: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createAdminSessionToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  });
}

export async function assertAdminSession(): Promise<void> {
  const expected = optionalEnv("ADMIN_PASSWORD");
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!expected) {
    return;
  }

  const expectedToken = createAdminSessionToken(expected);
  if (!token || !timingSafeTextEqual(token, expectedToken)) {
    redirect("/login");
  }
}

function timingSafeTextEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}
