import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { readAdminData, updateAdminData } from "@/lib/admin-store";
import { createSupabaseAdmin, getSupabaseStorageBucket } from "@/lib/supabase-server";


type RouteParams = {
  params: Promise<{ id: string }>;
};

function galleryResponse(adminData: Awaited<ReturnType<typeof readAdminData>>, galleryRows: any[]) {
  const galleryById = new Map(adminData.gallery.map((item) => [item.id, item]));

  for (const galleryItem of galleryRows) {
    galleryById.set(galleryItem.id, {
      id: galleryItem.id,
      title: galleryItem.title,
      imageUrl: galleryItem.image_url,
      alt: galleryItem.alt,
      category: galleryItem.category,
      uploadedAt: galleryItem.uploaded_at,
    });
  }

  return {
    ...adminData,
    gallery: Array.from(galleryById.values()).sort(
      (first, second) => new Date(second.uploadedAt).getTime() - new Date(first.uploadedAt).getTime(),
    ),
  };
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabaseAdmin = createSupabaseAdmin();
  // An item can exist in the admin store without a matching Supabase row (for
  // example, content created before Supabase syncing was enabled).  Do not
  // make those items impossible to delete from the dashboard.
  const { data: galleryItem, error: fetchError } = await supabaseAdmin
    .from("gallery")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ message: fetchError.message || "Failed to load gallery item." }, { status: 500 });
  }

  if (galleryItem?.storage_path) {
    const bucket = getSupabaseStorageBucket();
    await supabaseAdmin.storage.from(bucket).remove([galleryItem.storage_path]);
  }

  const { error: deleteError } = await supabaseAdmin.from("gallery").delete().eq("id", id);

  if (deleteError) {
    return NextResponse.json({ message: deleteError.message || "Failed to delete gallery item." }, { status: 500 });
  }

  await updateAdminData((current) => ({
    ...current,
    gallery: current.gallery.filter((galleryItem) => galleryItem.id !== id),
  }));

  const adminData = await readAdminData();
  const { data: galleryRows, error: galleryError } = await supabaseAdmin
    .from("gallery")
    .select("id, title, image_url, alt, category, uploaded_at")
    .order("uploaded_at", { ascending: false });

  if (galleryError) {
    return NextResponse.json({ message: galleryError.message || "Failed to load gallery data." }, { status: 500 });
  }

  return NextResponse.json(galleryResponse(adminData, galleryRows ?? []));
}

export async function PUT(request: Request, { params }: RouteParams) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const title = String(body.title || "").trim();
  const category = String(body.category || "Completed Projects").trim();
  const alt = String(body.alt || title || "").trim();

  const supabaseAdmin = createSupabaseAdmin();
  const { error: updateError } = await supabaseAdmin
    .from("gallery")
    .update({ title, category, alt })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ message: updateError.message || "Failed to update gallery metadata." }, { status: 500 });
  }

  await updateAdminData((current) => ({
    ...current,
    gallery: current.gallery.map((galleryItem) =>
      galleryItem.id === id ? { ...galleryItem, title, category, alt } : galleryItem,
    ),
  }));

  const adminData = await readAdminData();
  const { data: galleryRows, error: galleryError } = await supabaseAdmin
    .from("gallery")
    .select("id, title, image_url, alt, category, uploaded_at")
    .order("uploaded_at", { ascending: false });

  if (galleryError) {
    return NextResponse.json({ message: galleryError.message || "Failed to load gallery data." }, { status: 500 });
  }

  return NextResponse.json(galleryResponse(adminData, galleryRows ?? []));
}
