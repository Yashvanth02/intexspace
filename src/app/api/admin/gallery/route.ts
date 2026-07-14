import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { makeId, nowIso, updateAdminData } from "@/lib/admin-store";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extensionFor(file: File) {
  const fileExtension = path.extname(file.name).toLowerCase();

  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(fileExtension)) {
    return fileExtension;
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
  const uploadDir = path.join(process.cwd(), "public", "uploads", "gallery");
  const publicUrl = `/uploads/gallery/${fileName}`;

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), Buffer.from(await file.arrayBuffer()));

  const image = {
    id,
    title: title || file.name,
    imageUrl: publicUrl,
    alt: alt || title || file.name,
    category,
    uploadedAt: nowIso(),
  };
  const data = await updateAdminData((current) => ({
    ...current,
    gallery: [image, ...current.gallery],
  }));

  return NextResponse.json(data);
}
