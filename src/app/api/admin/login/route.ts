import { NextResponse } from "next/server";
import { setAdminSession, verifyAdminPassword } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { password?: string };

  if (!body.password || !verifyAdminPassword(body.password)) {
    return NextResponse.json({ message: "Invalid admin password." }, { status: 401 });
  }

  await setAdminSession();
  return NextResponse.json({ ok: true });
}
