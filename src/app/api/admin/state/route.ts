import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { normalizeProjectStatus, readAdminData } from "@/lib/admin-store";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { readPersistentMenu } from "@/lib/menu-store";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const storedAdminData = await readAdminData();
  const adminData = {
    ...storedAdminData,
    menu: { ...(storedAdminData.menu || {}), ...((await readPersistentMenu()) || {}) },
  };
  // Menu controls must remain usable even while a non-menu Supabase query is
  // unavailable (for example, while a deployment is picking up its variables).
  // The local/fallback admin data is still enough to render the dashboard.
  let galleryRows: Array<any> = [];
  let projectRows: Array<any> = [];

  try {
    const supabaseAdmin = createSupabaseAdmin();
    const [galleryResult, projectResult] = await Promise.all([
      supabaseAdmin
        .from("gallery")
        .select("id, title, image_url, alt, category, uploaded_at")
        .order("uploaded_at", { ascending: false }),
      supabaseAdmin
        .from("projects")
        .select("id, title, status, location, client, category, year, summary, description, image_url, updated_at")
        .order("updated_at", { ascending: false }),
    ]);

    if (!galleryResult.error) galleryRows = galleryResult.data ?? [];
    if (!projectResult.error) projectRows = projectResult.data ?? [];
  } catch {
    // Fall back to the admin data loaded above. A failed optional content
    // refresh must not make the entire admin dashboard, including Menu
    // Controls, disappear.
  }

  const localGalleryById = new Map(adminData.gallery.map((item) => [item.id, item]));

  const mergedGallery = new Map<string, any>(localGalleryById);

  for (const galleryItem of galleryRows ?? []) {
    mergedGallery.set(galleryItem.id, {
      id: galleryItem.id,
      title: galleryItem.title,
      imageUrl: galleryItem.image_url,
      alt: galleryItem.alt,
      category: galleryItem.category,
      uploadedAt: galleryItem.uploaded_at,
    });
  }

  const localProjectsById = new Map(adminData.projects.map((item) => [item.id, item]));
  const mergedProjects = new Map(localProjectsById);

  for (const project of projectRows ?? []) {
    const localProject = localProjectsById.get(project.id);
    mergedProjects.set(project.id, {
      id: project.id,
      title: project.title || localProject?.title || "",
      status: normalizeProjectStatus(project.status || localProject?.status),
      location: project.location || localProject?.location || "",
      client: project.client || localProject?.client || "",
      category: project.category || localProject?.category || "",
      year: project.year || localProject?.year || "",
      summary: project.summary || localProject?.summary || "",
      description: project.description || localProject?.description || "",
      imageUrl: project.image_url || localProject?.imageUrl || "/images/project-workplace-fabric.jpg",
      updatedAt: project.updated_at || localProject?.updatedAt || new Date().toISOString(),
    });
  }

  const menuSections = ["about", "projects", "ongoing", "careers", "gallery", "vlog", "team", "contact"];

  return NextResponse.json({
    ...adminData,
    menuSections,
    projects: Array.from(mergedProjects.values())
      .map((project) => ({ ...project, status: normalizeProjectStatus(project.status) }))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    gallery: Array.from(mergedGallery.values()).sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    ),
  });
}
