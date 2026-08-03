import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { makeId, normalizeProjectStatus, nowIso, type Project, updateAdminData } from "@/lib/admin-store";
import { uploadImageToStorage } from "@/lib/image-upload";
import { createSupabaseAdmin } from "@/lib/supabase-server";

function projectFromBody(body: Partial<Project>): Project {
  const title = String(body.title || "").trim();

  if (!title) {
    throw new Error("Project title is required.");
  }

  return {
    id: makeId("project", title),
    title,
    status: normalizeProjectStatus(body.status),
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
      const fileEntries = formData.getAll("images");
      const files = fileEntries.filter((file): file is File => file instanceof File && file.size > 0);
      const fallback = formData.get("image");
      const allFiles = files.length > 0
        ? files
        : fallback instanceof File && fallback.size > 0
          ? [fallback]
          : [];

      const title = String(formData.get("title") || "").trim();
      const status = normalizeProjectStatus(formData.get("status"));
      const location = String(formData.get("location") || "").trim();
      const client = String(formData.get("client") || "").trim();
      const category = String(formData.get("category") || "").trim();
      const year = String(formData.get("year") || "").trim();
      const summary = String(formData.get("summary") || "").trim();
      const description = String(formData.get("description") || "").trim();

      if (!title) {
        return NextResponse.json({ message: "Project title is required." }, { status: 400 });
      }

      if (allFiles.length === 0) {
        return NextResponse.json({ message: "Please upload at least one image file." }, { status: 400 });
      }

      const [featuredFile, ...extraFiles] = allFiles;
      const uploadedImage = await uploadImageToStorage(featuredFile, "projects", title);
      const project = {
        id: makeId("project", title),
        title,
        status,
        location,
        client,
        category,
        year,
        summary,
        description,
        imageUrl: uploadedImage.imageUrl,
        updatedAt: nowIso(),
      };

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
        return NextResponse.json({ message: projectError.message || "Failed to save project metadata." }, { status: 500 });
      }

      const galleryItems = await Promise.all(
        extraFiles.map(async (file, index) => {
          const uploaded = await uploadImageToStorage(file, "gallery", `${title} ${index + 1}`);
          const galleryItem = {
            id: uploaded.id,
            title: `${title} ${index + 1}`,
            imageUrl: uploaded.imageUrl,
            alt: title,
            category: category || "Completed Projects",
            uploadedAt: nowIso(),
            storagePath: uploaded.storagePath,
          };

          return galleryItem;
        }),
      );

      if (galleryItems.length > 0) {
        const galleryRows = galleryItems.map((item) => ({
          id: item.id,
          title: item.title,
          image_url: item.imageUrl,
          storage_path: item.storagePath,
          alt: item.alt,
          category: item.category,
          uploaded_at: item.uploadedAt,
        }));

        const { error: galleryError } = await supabaseAdmin.from("gallery").insert(galleryRows);

        if (galleryError) {
          return NextResponse.json({ message: galleryError.message || "Failed to save gallery metadata." }, { status: 500 });
        }
      }

      const data = await updateAdminData((current) => ({
        ...current,
        projects: [project, ...current.projects],
        gallery: [...galleryItems, ...current.gallery],
      }));

      return NextResponse.json(data);
    } catch (error) {
      return NextResponse.json({ message: (error as Error).message }, { status: 400 });
    }
  }

  try {
    const project = projectFromBody((await request.json()) as Partial<Project>);
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
      return NextResponse.json({ message: projectError.message || "Failed to save project metadata." }, { status: 500 });
    }

    const data = await updateAdminData((current) => ({
      ...current,
      projects: [project, ...current.projects],
    }));

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}
