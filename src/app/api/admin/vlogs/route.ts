import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { makeId, nowIso, updateAdminData } from "@/lib/admin-store";
import { isImageFile, uploadImageToStorage } from "@/lib/image-upload";
import { createSupabaseAdmin } from "@/lib/supabase-server";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  try {
    const formData = await request.formData();
    const title = String(formData.get("title") || "").trim();
    const details = String(formData.get("details") || "").trim();
    const youtubeUrl = String(formData.get("youtubeUrl") || "").trim();
    const thumbnail = formData.get("thumbnail");

    if (!title || !details || !youtubeUrl) throw new Error("Title, project details and YouTube link are required.");
    if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(youtubeUrl)) throw new Error("Please enter a valid YouTube link.");
    if (!isImageFile(thumbnail instanceof File ? thumbnail : null)) throw new Error("Please upload a thumbnail image.");

    const uploaded = await uploadImageToStorage(thumbnail as File, "vlogs", title);
    const vlog = { id: makeId("vlog", title), title, details, youtubeUrl, thumbnailUrl: uploaded.imageUrl, createdAt: nowIso() };

    // Persist to Supabase vlogs table
    try {
      const supabaseAdmin = createSupabaseAdmin();
      const { error: vlogError } = await supabaseAdmin.from("vlogs").upsert(
        {
          id: vlog.id,
          title: vlog.title,
          details: vlog.details,
          youtube_url: vlog.youtubeUrl,
          thumbnail_url: vlog.thumbnailUrl,
          created_at: vlog.createdAt,
        },
        { onConflict: "id" },
      );

      if (vlogError) {
        return NextResponse.json({ message: vlogError.message || "Failed to save vlog to database." }, { status: 500 });
      }
    } catch (err) {
      return NextResponse.json({ message: (err as Error).message || "Failed to save vlog to database." }, { status: 500 });
    }

    const next = await updateAdminData((current) => ({ ...current, vlogs: [vlog, ...current.vlogs] }));
    revalidatePath("/vlog");
    revalidatePath("/vlog.html");
    return NextResponse.json(next);
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}
