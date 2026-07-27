import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { updateAdminData } from "@/lib/admin-store";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  return NextResponse.json(await updateAdminData((current) => ({ ...current, vlogs: current.vlogs.filter((vlog) => vlog.id !== id) })));
}
