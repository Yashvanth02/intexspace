import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { nowIso, type CareerOpening, updateAdminData } from "@/lib/admin-store";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: RouteParams) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as Partial<CareerOpening>;
    const data = await updateAdminData((current) => {
      const existing = current.careers.find((career) => career.id === id);
      if (!existing) throw new Error("Career opening not found.");
      const title = String(body.title ?? existing.title).trim();
      if (!title) throw new Error("Career title is required.");
      const updated: CareerOpening = {
        ...existing,
        title,
        location: String(body.location ?? existing.location).trim(),
        employmentType: String(body.employmentType ?? existing.employmentType).trim(),
        experience: String(body.experience ?? existing.experience).trim(),
        qualification: String(body.qualification ?? existing.qualification).trim(),
        description: String(body.description ?? existing.description).trim(),
        isOpen: typeof body.isOpen === "boolean" ? body.isOpen : existing.isOpen,
        updatedAt: nowIso(),
      };
      return { ...current, careers: current.careers.map((career) => (career.id === id ? updated : career)) };
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const data = await updateAdminData((current) => ({
    ...current,
    careers: current.careers.filter((career) => career.id !== id),
  }));

  return NextResponse.json(data);
}
