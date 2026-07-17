import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { makeId, nowIso, readAdminData } from "@/lib/admin-store";
import { createSupabaseAdmin } from "@/lib/supabase-server";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extensionFor(file: File) {
  const extension = file.name.toLowerCase().split(".").pop();

  if (extension && ["jpg", "jpeg", "png", "webp", "gif"].includes(extension)) {
    return `.${extension}`;
  }

  return file.type === "image/png"
    ? ".png"
    : file.type === "image/webp"
      ? ".webp"
      : file.type === "image/gif"
        ? ".gif"
        : ".jpg";
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("image");
  const title = String(formData.get("title") || "").trim();
  const category = String(formData.get("category") || "Project Gallery").trim();
  const alt = String(formData.get("alt") || title).trim();

  if (!(file instanceof File) || !allowedTypes.has(file.type)) {
    return NextResponse.json({ message: "Please upload a JPG, PNG, WEBP or GIF image." }, { status: 400 });
  }

  const id = makeId("gallery", title || file.name);
  const fileName = `${id}${extensionFor(file)}`;
  const storagePath = `gallery/${fileName}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const supabaseAdmin = createSupabaseAdmin();

  const { error: uploadError } = await supabaseAdmin.storage
    .from("gallery")
    .upload(storagePath, fileBuffer, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ message: uploadError.message || "Image upload failed." }, { status: 500 });
  }

  const publicUrlResponse = supabaseAdmin.storage.from("gallery").getPublicUrl(storagePath);

  if (!publicUrlResponse?.data?.publicUrl) {
    return NextResponse.json({ message: "Failed to build public image URL." }, { status: 500 });
  }

  const imageUrl = publicUrlResponse.data.publicUrl;
  const image = {
    id,
    title: title || file.name,
    image_url: imageUrl,
    storage_path: storagePath,
    alt: alt || title || file.name,
    category,
    uploaded_at: nowIso(),
  };

  const { error: insertError } = await supabaseAdmin
    .from("gallery")
    .insert(image);

  if (insertError) {
    return NextResponse.json({ message: insertError.message || "Failed to save gallery metadata." }, { status: 500 });
  }

  const adminData = await readAdminData();
  const { data: galleryRows, error: galleryError } = await supabaseAdmin
    .from("gallery")
    .select("id, title, image_url, alt, category, uploaded_at")
    .order("uploaded_at", { ascending: false });

  if (galleryError) {
    return NextResponse.json({ message: galleryError.message || "Failed to load gallery data." }, { status: 500 });
  }

  return NextResponse.json({
    ...adminData,
    gallery:
      (galleryRows ?? []).map((galleryItem: any) => ({
        id: galleryItem.id,
        title: galleryItem.title,
        imageUrl: galleryItem.image_url,
        alt: galleryItem.alt,
        category: galleryItem.category,
        uploadedAt: galleryItem.uploaded_at,
      })),
  });
}
