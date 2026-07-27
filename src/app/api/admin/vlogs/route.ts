import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { makeId, nowIso, updateAdminData } from "@/lib/admin-store";
import { isImageFile, uploadImageToStorage } from "@/lib/image-upload";

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
    return NextResponse.json(await updateAdminData((current) => ({ ...current, vlogs: [vlog, ...current.vlogs] })));
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}
