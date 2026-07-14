import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { makeId, nowIso, type Project, updateAdminData } from "@/lib/admin-store";

function projectFromBody(body: Partial<Project>): Project {
  const title = String(body.title || "").trim();

  if (!title) {
    throw new Error("Project title is required.");
  }

  return {
    id: makeId("project", title),
    title,
    status: body.status || "ongoing",
    location: String(body.location || "").trim(),
    client: String(body.client || "").trim(),
    category: String(body.category || "").trim(),
    year: String(body.year || "").trim(),
    summary: String(body.summary || "").trim(),
    description: String(body.description || "").trim(),
    imageUrl: String(body.imageUrl || "/images/project-workplace-fabric.jpg").trim(),
    updatedAt: nowIso(),
  };
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const project = projectFromBody((await request.json()) as Partial<Project>);
    const data = await updateAdminData((current) => ({
      ...current,
      projects: [project, ...current.projects],
    }));

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}
