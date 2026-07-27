import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { updateAdminData, readAdminData } from "@/lib/admin-store";

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { slug, enabled } = body as { slug?: string; enabled?: boolean };

  if (typeof slug !== "string" || typeof enabled !== "boolean") {
    return NextResponse.json({ message: "Invalid request. Expect { slug: string, enabled: boolean }" }, { status: 400 });
  }

  const next = await updateAdminData((data) => {
    const menu = { ...(data.menu || {}), [slug]: enabled };
    return { ...data, menu };
  });

  return NextResponse.json(next);
}

// Allow GET to fetch current menu map for convenience
export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const data = await readAdminData();
  return NextResponse.json({ menu: data.menu || {} });
}
