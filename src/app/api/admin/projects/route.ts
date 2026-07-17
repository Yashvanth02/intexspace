import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { makeId, nowIso, type Project, updateAdminData } from "@/lib/admin-store";
import { isImageFile, uploadImageToStorage } from "@/lib/image-upload";

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

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await request.formData();
      const file = formData.get("image");
      const title = String(formData.get("title") || "").trim();
      const status = String(formData.get("status") || "ongoing").trim();
      const location = String(formData.get("location") || "").trim();
      const client = String(formData.get("client") || "").trim();
      const category = String(formData.get("category") || "").trim();
      const year = String(formData.get("year") || "").trim();
      const summary = String(formData.get("summary") || "").trim();
      const description = String(formData.get("description") || "").trim();

      if (!title) {
        return NextResponse.json({ message: "Project title is required." }, { status: 400 });
      }

      if (!isImageFile(file instanceof File ? file : null)) {
        return NextResponse.json({ message: "Please upload a valid image file." }, { status: 400 });
      }

      const uploadedImage = await uploadImageToStorage(file as File, "projects", title);
      const project = {
        id: makeId("project", title),
        title,
        status: status as Project["status"],
        location,
        client,
        category,
        year,
        summary,
        description,
        imageUrl: uploadedImage.imageUrl,
        updatedAt: nowIso(),
      };

      const data = await updateAdminData((current) => ({
        ...current,
        projects: [project, ...current.projects],
      }));

      return NextResponse.json(data);
    } catch (error) {
      return NextResponse.json({ message: (error as Error).message }, { status: 400 });
    }
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
