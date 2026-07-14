import { NextResponse } from "next/server";
import { makeId, nowIso, updateAdminData } from "@/lib/admin-store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, string>;
  const name = [body.fname, body.lname].filter(Boolean).join(" ").trim() || String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const phone = String(body.phone || "").trim();
  const message = String(body.message || "").trim();

  if (!name || !email || !phone) {
    return NextResponse.json({ message: "Name, email and phone are required." }, { status: 400 });
  }

  await updateAdminData((current) => ({
    ...current,
    inquiries: [
      {
        id: makeId("inquiry", `${name}-${Date.now()}`),
        name,
        email,
        phone,
        subject: String(body.subject || "Website inquiry").trim(),
        message,
        status: "new",
        createdAt: nowIso(),
      },
      ...current.inquiries,
    ],
  }));

  return NextResponse.json({ ok: true });
}
