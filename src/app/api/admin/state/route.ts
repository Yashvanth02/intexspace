import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { readSiteSnapshot } from "@/lib/content-store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { data, settings } = await readSiteSnapshot();
  return NextResponse.json({
    ...data,
    settings,
    menuSections: ["about", "projects", "ongoing", "careers", "gallery", "vlog", "team", "contact"],
  }, { headers: { "Cache-Control": "no-store" } });
}
