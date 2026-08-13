import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { readAdminData, updateAdminData, writeAdminData } from "@/lib/admin-store";
import { isImageFile, uploadImageToStorage } from "@/lib/image-upload";
import { createSupabaseAdmin } from "@/lib/supabase-server";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const formData = await request.formData();
    const title = String(formData.get("title") || "").trim();
    const details = String(formData.get("details") || "").trim();
    const youtubeUrl = String(formData.get("youtubeUrl") || "").trim();
    const thumbnail = formData.get("thumbnail");

    if (!title || !details || !youtubeUrl) throw new Error("Title, project details and YouTube link are required.");
    if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(youtubeUrl)) throw new Error("Please enter a valid YouTube link.");

    const current = await readAdminData();
    let existingVlog = current.vlogs.find((vlog) => vlog.id === id);

    if (!existingVlog) {
      const client = createSupabaseAdmin();
      const { data, error } = await client
        .from("vlogs")
        .select("id, title, details, youtube_url, thumbnail_url, created_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message || "Failed to load vlog metadata.");
      if (data) {
        existingVlog = {
          id: data.id, title: data.title, details: data.details, youtubeUrl: data.youtube_url,
          thumbnailUrl: data.thumbnail_url, createdAt: data.created_at,
        };
      }
    }

    if (!existingVlog) throw new Error("Vlog not found.");

    let thumbnailUrl = existingVlog.thumbnailUrl;

    if (thumbnail instanceof File && thumbnail.size > 0) {
      if (!isImageFile(thumbnail)) throw new Error("Please upload a thumbnail image.");
      const uploaded = await uploadImageToStorage(thumbnail as File, "vlogs", title);
      thumbnailUrl = uploaded.imageUrl;
    }

    const updatedVlog = { ...existingVlog, title, details, youtubeUrl, thumbnailUrl };
    const next = {
      ...current,
      vlogs: current.vlogs.some((vlog) => vlog.id === id)
        ? current.vlogs.map((vlog) => (vlog.id === id ? updatedVlog : vlog))
        : [updatedVlog, ...current.vlogs],
    };

    const supabaseAdmin = createSupabaseAdmin();
    const { error } = await supabaseAdmin.from("vlogs").upsert({
      id: updatedVlog.id,
      title: updatedVlog.title,
      details: updatedVlog.details,
      youtube_url: updatedVlog.youtubeUrl,
      thumbnail_url: updatedVlog.thumbnailUrl,
      created_at: updatedVlog.createdAt,
    }, { onConflict: "id" });

    if (error) throw new Error(error.message || "Failed to update vlog metadata.");

    await writeAdminData(next);
    return NextResponse.json(next);
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const supabaseAdmin = createSupabaseAdmin();
    const { error } = await supabaseAdmin.from("vlogs").delete().eq("id", id);
    if (error) throw new Error(error.message || "Failed to delete vlog metadata.");
    return NextResponse.json(await updateAdminData((current) => ({ ...current, vlogs: current.vlogs.filter((vlog) => vlog.id !== id) })));
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}
