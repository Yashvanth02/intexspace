import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { nowIso, type Project, updateAdminData } from "@/lib/admin-store";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: RouteParams) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as Partial<Project>;
  const data = await updateAdminData((current) => ({
    ...current,
    projects: current.projects.map((project) =>
      project.id === id
        ? {
            ...project,
            ...body,
            id: project.id,
            updatedAt: nowIso(),
          }
        : project,
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
    projects: current.projects.filter((project) => project.id !== id),
  }));

  return NextResponse.json(data);
}
