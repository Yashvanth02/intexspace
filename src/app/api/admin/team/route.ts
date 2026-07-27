import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createSupabaseAdmin, getSupabaseStorageBucket } from "@/lib/supabase-server";
import { makeId, nowIso, updateAdminData, type TeamMember } from "@/lib/admin-store";

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

function teamMemberFromBody(body: Partial<TeamMember>, photoUrl: string, storagePath: string): TeamMember {
  const name = String(body.name || "").trim();

  if (!name) {
    throw new Error("Team member name is required.");
  }

  const designation = String(body.designation || "").trim();

  return {
    id: makeId("team", name),
    name,
    designation,
    linkedIn: String(body.linkedIn || "").trim(),
    instagram: String(body.instagram || "").trim(),
    facebook: String(body.facebook || "").trim(),
    x: String(body.x || "").trim(),
    photoUrl,
    storagePath,
    updatedAt: nowIso(),
  };
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("photo");
  const name = String(formData.get("name") || "").trim();
  const designation = String(formData.get("designation") || "").trim();
  const linkedIn = String(formData.get("linkedIn") || "").trim();
  const instagram = String(formData.get("instagram") || "").trim();
  const facebook = String(formData.get("facebook") || "").trim();
  const x = String(formData.get("x") || "").trim();

  if (!(file instanceof File) || !allowedTypes.has(file.type)) {
    return NextResponse.json({ message: "Please upload a JPG, PNG, WEBP or GIF photo." }, { status: 400 });
  }

  if (!name) {
    return NextResponse.json({ message: "Team member name is required." }, { status: 400 });
  }

  if (!designation) {
    return NextResponse.json({ message: "Designation is required." }, { status: 400 });
  }

  const id = makeId("team", name);
  const extension = extensionFor(file);
  const fileName = `${id}${extension}`;
  const storagePath = `team/${fileName}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const supabaseAdmin = createSupabaseAdmin();
  const bucket = getSupabaseStorageBucket();

  const { error: uploadError } = await supabaseAdmin.storage.from(bucket).upload(storagePath, fileBuffer, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ message: uploadError.message || "Failed to upload photo." }, { status: 500 });
  }

  const publicUrlResponse = supabaseAdmin.storage.from(bucket).getPublicUrl(storagePath);

  if (!publicUrlResponse?.data?.publicUrl) {
    return NextResponse.json({ message: "Failed to build public photo URL." }, { status: 500 });
  }

  const photoUrl = publicUrlResponse.data.publicUrl;
  const teamMember = teamMemberFromBody(
    { name, designation, linkedIn, instagram, facebook, x },
    photoUrl,
    storagePath,
  );

  const data = await updateAdminData((current) => ({
    ...current,
    team: [teamMember, ...current.team],
  }));

  return NextResponse.json(data);
}
