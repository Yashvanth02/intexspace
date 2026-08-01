import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { readAdminData, updateAdminData, writeAdminData } from "@/lib/admin-store";
import { isImageFile, uploadImageToStorage } from "@/lib/image-upload";

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
    const existingVlog = current.vlogs.find((vlog) => vlog.id === id);

    if (!existingVlog) throw new Error("Vlog not found.");

    let thumbnailUrl = existingVlog.thumbnailUrl;

    if (thumbnail instanceof File && thumbnail.size > 0) {
      if (!isImageFile(thumbnail)) throw new Error("Please upload a thumbnail image.");
      const uploaded = await uploadImageToStorage(thumbnail as File, "vlogs", title);
      thumbnailUrl = uploaded.imageUrl;
    }

    const updatedVlog = { ...existingVlog, title, details, youtubeUrl, thumbnailUrl };
    const next = { ...current, vlogs: current.vlogs.map((vlog) => (vlog.id === id ? updatedVlog : vlog)) };

    await writeAdminData(next);
    return NextResponse.json(next);
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  return NextResponse.json(await updateAdminData((current) => ({ ...current, vlogs: current.vlogs.filter((vlog) => vlog.id !== id) })));
}
