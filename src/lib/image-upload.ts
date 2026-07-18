import { makeId } from "./admin-store";
import { createSupabaseAdmin, getSupabaseStorageBucket } from "./supabase-server";

function extensionFor(file: File) {
  const extension = file.name.toLowerCase().split(".").pop();

  if (extension && ["jpg", "jpeg", "png", "webp", "gif", "bmp", "avif", "heic", "heif", "tiff", "tif", "svg"].includes(extension)) {
    return `.${extension}`;
  }

  const mimeType = file.type || "";

  if (mimeType === "image/png") {
    return ".png";
  }

  if (mimeType === "image/webp") {
    return ".webp";
  }

  if (mimeType === "image/gif") {
    return ".gif";
  }

  if (mimeType === "image/jpeg") {
    return ".jpg";
  }

  if (mimeType.startsWith("image/")) {
    return ".jpg";
  }

  return ".jpg";
}

export function isImageFile(file: File | null | undefined) {
  return Boolean(file && file.size > 0 && (file.type.startsWith("image/") || [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif", ".heic", ".heif", ".tiff", ".tif", ".svg"].some((extension) => file.name.toLowerCase().endsWith(extension))));
}

export async function uploadImageToStorage(file: File, folder: string, fallbackTitle: string) {
  const id = makeId(folder, fallbackTitle || file.name);
  const fileName = `${id}${extensionFor(file)}`;
  const storagePath = `${folder}/${fileName}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const supabaseAdmin = createSupabaseAdmin();
  const bucket = getSupabaseStorageBucket();

  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucket)
    .upload(storagePath, fileBuffer, { contentType: file.type || "application/octet-stream" });

  if (uploadError) {
    throw new Error(
      uploadError.message || `Image upload failed. Ensure bucket "${bucket}" exists and is accessible from Supabase.`,
    );
  }

  const publicUrlResponse = supabaseAdmin.storage.from(bucket).getPublicUrl(storagePath);

  if (!publicUrlResponse?.data?.publicUrl) {
    throw new Error("Failed to build public image URL.");
  }

  return { imageUrl: publicUrlResponse.data.publicUrl, storagePath, id };
}
