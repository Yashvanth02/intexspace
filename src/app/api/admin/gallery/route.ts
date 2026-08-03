import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { makeId, nowIso, readAdminData, updateAdminData } from "@/lib/admin-store";
import { createSupabaseAdmin, getSupabaseStorageBucket } from "@/lib/supabase-server";

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
  const files = formData
    .getAll("images")
    .filter((file): file is File => file instanceof File && file.size > 0);
  const legacyFile = formData.get("image");
  const uploads = files.length > 0
    ? files
    : legacyFile instanceof File && legacyFile.size > 0
      ? [legacyFile]
      : [];

  if (uploads.length === 0 || uploads.some((file) => !allowedTypes.has(file.type))) {
    return NextResponse.json({ message: "Please upload a JPG, PNG, WEBP or GIF image." }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdmin();
  const bucket = getSupabaseStorageBucket();
  const galleryItems = await Promise.all(uploads.map(async (file) => {
    const id = makeId("gallery", file.name);
    const storagePath = `gallery/${id}${extensionFor(file)}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, Buffer.from(await file.arrayBuffer()), { contentType: file.type });

    if (uploadError) {
      throw new Error(uploadError.message || `Image upload failed. Ensure Supabase bucket "${bucket}" exists and is accessible.`);
    }

    const imageUrl = supabaseAdmin.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;
    if (!imageUrl) {
      throw new Error("Failed to build public image URL.");
    }

    return {
      id,
      title: file.name,
      imageUrl,
      storagePath,
      alt: file.name,
      category: "Gallery",
      uploadedAt: nowIso(),
    };
  }));

  const { error: insertError } = await supabaseAdmin.from("gallery").insert(
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

  if (insertError) {
    return NextResponse.json({ message: insertError.message || "Failed to save gallery images." }, { status: 500 });
  }

  const adminData = await updateAdminData((current) => ({
    ...current,
    gallery: [...galleryItems, ...current.gallery],
  }));

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
