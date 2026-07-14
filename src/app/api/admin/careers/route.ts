import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { makeId, nowIso, type CareerOpening, updateAdminData } from "@/lib/admin-store";

function careerFromBody(body: Partial<CareerOpening>): CareerOpening {
  const title = String(body.title || "").trim();

  if (!title) {
    throw new Error("Career title is required.");
  }

  return {
    id: makeId("career", title),
    title,
    location: String(body.location || "Chennai").trim(),
    employmentType: String(body.employmentType || "Full-time").trim(),
    experience: String(body.experience || "").trim(),
    qualification: String(body.qualification || "").trim(),
    description: String(body.description || "").trim(),
    isOpen: body.isOpen ?? true,
    updatedAt: nowIso(),
  };
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const career = careerFromBody((await request.json()) as Partial<CareerOpening>);
    const data = await updateAdminData((current) => ({
      ...current,
      careers: [career, ...current.careers],
    }));

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}
