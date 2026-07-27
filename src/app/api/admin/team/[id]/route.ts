import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createSupabaseAdmin, getSupabaseStorageBucket } from "@/lib/supabase-server";
import { readAdminData, updateAdminData, type TeamMember, nowIso } from "@/lib/admin-store";

type RouteParams = {
  params: Promise<{ id: string }>;
};

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

export async function PUT(request: Request, { params }: RouteParams) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const formData = await request.formData();
  const file = formData.get("photo");
  const name = String(formData.get("name") || "").trim();
  const designation = String(formData.get("designation") || "").trim();
  const linkedIn = String(formData.get("linkedIn") || "").trim();
  const instagram = String(formData.get("instagram") || "").trim();
  const facebook = String(formData.get("facebook") || "").trim();
  const x = String(formData.get("x") || "").trim();

  if (!name) {
    return NextResponse.json({ message: "Team member name is required." }, { status: 400 });
  }

  if (!designation) {
    return NextResponse.json({ message: "Designation is required." }, { status: 400 });
  }

  const data = await readAdminData();
  const existing = data.team.find((member) => member.id === id);

  if (!existing) {
    return NextResponse.json({ message: "Team member not found." }, { status: 404 });
  }

  const supabaseAdmin = createSupabaseAdmin();
  const bucket = getSupabaseStorageBucket();
  let photoUrl = existing.photoUrl;
  let storagePath = existing.storagePath;

  if (file instanceof File && file.size > 0) {
    if (!allowedTypes.has(file.type)) {
      return NextResponse.json({ message: "Please upload a JPG, PNG, WEBP or GIF photo." }, { status: 400 });
    }

    const extension = extensionFor(file);
    const fileName = `${id}${extension}`;
    const nextStoragePath = `team/${fileName}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage.from(bucket).upload(nextStoragePath, fileBuffer, {
      contentType: file.type,
      upsert: true,
    });

    if (uploadError) {
      return NextResponse.json({ message: uploadError.message || "Failed to upload photo." }, { status: 500 });
    }

    if (storagePath && storagePath !== nextStoragePath) {
      await supabaseAdmin.storage.from(bucket).remove([storagePath]);
    }

    const publicUrlResponse = supabaseAdmin.storage.from(bucket).getPublicUrl(nextStoragePath);

    if (!publicUrlResponse?.data?.publicUrl) {
      return NextResponse.json({ message: "Failed to build public photo URL." }, { status: 500 });
    }

    photoUrl = publicUrlResponse.data.publicUrl;
    storagePath = nextStoragePath;
  }

  const updatedMember: TeamMember = {
    ...existing,
    name,
    designation,
    linkedIn,
    instagram,
    facebook,
    x,
    photoUrl,
    storagePath,
    updatedAt: nowIso(),
  };

  const updatedData = await updateAdminData((current) => ({
    ...current,
    team: current.team.map((member) => (member.id === id ? updatedMember : member)),
  }));

  return NextResponse.json(updatedData);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const data = await readAdminData();
  const existing = data.team.find((member) => member.id === id);

  if (!existing) {
    return NextResponse.json({ message: "Team member not found." }, { status: 404 });
  }

  if (existing.storagePath) {
    const supabaseAdmin = createSupabaseAdmin();
    const bucket = getSupabaseStorageBucket();
    await supabaseAdmin.storage.from(bucket).remove([existing.storagePath]);
  }

  const updatedData = await updateAdminData((current) => ({
    ...current,
    team: current.team.filter((member) => member.id !== id),
  }));

  return NextResponse.json(updatedData);
}
