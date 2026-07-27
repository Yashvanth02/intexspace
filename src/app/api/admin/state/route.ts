import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { readAdminData } from "@/lib/admin-store";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { legacySlugs } from "@/lib/legacy-pages";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const adminData = await readAdminData();
  const supabaseAdmin = createSupabaseAdmin();
  const { data: galleryRows, error: galleryError } = await supabaseAdmin
    .from("gallery")
    .select("id, title, image_url, alt, category, uploaded_at")
    .order("uploaded_at", { ascending: false });

  if (galleryError) {
    return NextResponse.json({ message: galleryError.message || "Failed to load gallery data." }, { status: 500 });
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

  // Derive menu sections from legacy slugs, normalizing and removing single-resource pages and 404/index variants
  const normalized = Array.from(new Set(legacySlugs.map((s) => s.replace(/\.html$/, ""))));
  const menuSections = normalized.filter((s) => !/^404$/.test(s) && !/^index-\d+$/.test(s) && !s.endsWith("-single"));

  return NextResponse.json({
    ...adminData,
    menuSections,
    gallery: Array.from(mergedGallery.values()).sort((a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    ),
  });
}
