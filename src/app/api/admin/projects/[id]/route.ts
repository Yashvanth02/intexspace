import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { normalizeProjectStatus, nowIso, type Project, updateAdminData } from "@/lib/admin-store";
import { uploadImageToStorage } from "@/lib/image-upload";
import { createSupabaseAdmin } from "@/lib/supabase-server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: RouteParams) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const updatedAt = nowIso();
  const contentType = request.headers.get("content-type") || "";

  let patch: Partial<Project> = {};

  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await request.formData();
      const fileEntries = formData.getAll("images");
      const files = fileEntries.filter((file): file is File => file instanceof File && file.size > 0);
      const fallback = formData.get("image");
      const allFiles = files.length > 0
        ? files
        : fallback instanceof File && fallback.size > 0
          ? [fallback]
          : [];
      const title = String(formData.get("title") || "").trim();

      if (!title) {
        return NextResponse.json({ message: "Project title is required." }, { status: 400 });
      }

      patch = {
        title,
        status: normalizeProjectStatus(formData.get("status")),
        location: String(formData.get("location") || "").trim(),
        client: String(formData.get("client") || "").trim(),
        category: String(formData.get("category") || "").trim(),
        year: String(formData.get("year") || "").trim(),
        summary: String(formData.get("summary") || "").trim(),
        description: String(formData.get("description") || "").trim(),
      };

      if (formData.get("removeImage") === "true") {
        patch.imageUrl = "";
      }

      if (allFiles.length > 0) {
        const [featuredFile, ...extraFiles] = allFiles;
        const uploaded = await uploadImageToStorage(featuredFile, "projects", title);
        patch.imageUrl = uploaded.imageUrl;

        const galleryItems = await Promise.all(
          extraFiles.map(async (file, index) => {
            const uploadedGallery = await uploadImageToStorage(file, "gallery", `${title} ${index + 1}`);
            return {
              id: uploadedGallery.id,
              title: `${title} ${index + 1}`,
              imageUrl: uploadedGallery.imageUrl,
              alt: title,
              category: patch.category || "Completed Projects",
              uploadedAt: nowIso(),
              storagePath: uploadedGallery.storagePath,
            };
          }),
        );

        if (galleryItems.length > 0) {
          const supabaseAdmin = createSupabaseAdmin();
          const { error: galleryError } = await supabaseAdmin.from("gallery").insert(
            galleryItems.map((item) => ({
              id: item.id,
              title: item.title,
              image_url: item.imageUrl,
              storage_path: item.storagePath,
              alt: item.alt,
              category: item.category,
              uploaded_at: item.uploadedAt,
            })),
          );

          if (galleryError) {
            return NextResponse.json({ message: galleryError.message || "Failed to save gallery metadata." }, { status: 500 });
          }

          await updateAdminData((current) => ({
            ...current,
            gallery: [...galleryItems, ...current.gallery],
          }));
        }
      }
    } catch (error) {
      return NextResponse.json({ message: (error as Error).message }, { status: 400 });
    }
  } else {
    patch = (await request.json()) as Partial<Project>;
    if ("status" in patch) {
      patch.status = normalizeProjectStatus(patch.status);
    }
  }

  const data = await updateAdminData((current) => ({
    ...current,
    projects: current.projects.map((project) =>
      project.id === id
        ? {
            ...project,
            ...patch,
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
