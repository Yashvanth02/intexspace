import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { type Inquiry, updateAdminData } from "@/lib/admin-store";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: RouteParams) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as Partial<Inquiry>;
  const data = await updateAdminData((current) => ({
    ...current,
    inquiries: current.inquiries.map((inquiry) =>
      inquiry.id === id ? { ...inquiry, status: body.status || inquiry.status } : inquiry,
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
    inquiries: current.inquiries.filter((inquiry) => inquiry.id !== id),
  }));

  return NextResponse.json(data);
}
