import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { nowIso, type Project, updateAdminData } from "@/lib/admin-store";
import { createSupabaseAdmin } from "@/lib/supabase-server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: RouteParams) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as Partial<Project>;
  const updatedAt = nowIso();

  const data = await updateAdminData((current) => ({
    ...current,
    projects: current.projects.map((project) =>
      project.id === id
        ? {
            ...project,
            ...body,
            id: project.id,
            updatedAt,
          }
        : project,
    ),
  }));

  const project = data.projects.find((projectItem) => projectItem.id === id);
  if (project) {
    const supabaseAdmin = createSupabaseAdmin();
    const { error: projectError } = await supabaseAdmin.from("projects").upsert(
      {
        id: project.id,
        title: project.title,
        status: project.status,
        location: project.location,
        client: project.client,
        category: project.category,
        year: project.year,
        summary: project.summary,
        description: project.description,
        image_url: project.imageUrl,
        updated_at: project.updatedAt,
      },
      { onConflict: "id" },
    );

    if (projectError) {
      return NextResponse.json({ message: projectError.message || "Failed to update project metadata." }, { status: 500 });
    }
  }

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

  const supabaseAdmin = createSupabaseAdmin();
  const { error: projectError } = await supabaseAdmin.from("projects").delete().eq("id", id);

  if (projectError) {
    return NextResponse.json({ message: projectError.message || "Failed to delete project metadata." }, { status: 500 });
  }

  return NextResponse.json(data);
}
