import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const cookieName = "intex_admin_session";

function adminPassword() {
  return process.env.ADMIN_PASSWORD || "admin123";
}

function authSecret() {
  return process.env.ADMIN_SESSION_SECRET || adminPassword();
}

function sessionSignature() {
  return createHmac("sha256", authSecret()).update(adminPassword()).digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const session = cookieStore.get(cookieName)?.value;

  return Boolean(session && safeEqual(session, sessionSignature()));
}

export async function setAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(cookieName, sessionSignature(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

export function verifyAdminPassword(password: string) {
  return safeEqual(password, adminPassword());
}
