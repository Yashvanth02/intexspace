import { unlink } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { updateAdminData } from "@/lib/admin-store";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, { params }: RouteParams) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const data = await updateAdminData(async (current) => {
    const image = current.gallery.find((item) => item.id === id);

    if (image?.imageUrl.startsWith("/uploads/gallery/")) {
      await unlink(path.join(process.cwd(), "public", image.imageUrl)).catch(() => undefined);
    }

    return {
      ...current,
      gallery: current.gallery.filter((item) => item.id !== id),
    };
  });

  return NextResponse.json(data);
}
