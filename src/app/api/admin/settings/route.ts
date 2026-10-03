import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { readSiteSettings, writeSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await readSiteSettings(), { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (typeof body?.maintenanceEnabled !== "boolean" || body?.confirmed !== true) {
    return NextResponse.json({ message: "Confirm the maintenance change and provide an enabled/disabled value." }, { status: 400 });
  }
  try {
    return NextResponse.json(await writeSiteSettings(body.maintenanceEnabled), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "Maintenance settings could not be saved. The site status has not changed." }, { status: 503 });
  }
}
