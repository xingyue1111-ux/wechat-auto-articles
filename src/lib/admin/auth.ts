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
    return allowsLocalAdminFallback() && password === "admin";
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
  if (!(await hasValidAdminSession())) {
    redirect("/login");
  }
}

export async function hasValidAdminSession(): Promise<boolean> {
  const expected = optionalEnv("ADMIN_PASSWORD");
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!expected) {
    return allowsLocalAdminFallback();
  }

  const expectedToken = createAdminSessionToken(expected);
  return Boolean(token && timingSafeTextEqual(token, expectedToken));
}

function allowsLocalAdminFallback(): boolean {
  return process.env.NODE_ENV !== "production";
}

function timingSafeTextEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}
