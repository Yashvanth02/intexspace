import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { nowIso, type CareerOpening, updateAdminData } from "@/lib/admin-store";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: RouteParams) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as Partial<CareerOpening>;
  const data = await updateAdminData((current) => ({
    ...current,
    careers: current.careers.map((career) =>
      career.id === id ? { ...career, ...body, id: career.id, updatedAt: nowIso() } : career,
    ),
  }));

  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const data = await updateAdminData((current) => ({
    ...current,
    careers: current.careers.filter((career) => career.id !== id),
  }));

  return NextResponse.json(data);
}
