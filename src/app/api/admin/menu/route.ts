import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { updateAdminData, readAdminData } from "@/lib/admin-store";
import { readPersistentMenu, writePersistentMenu } from "@/lib/menu-store";

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { slug, enabled, menu: requestedMenu } = body as {
    slug?: string;
    enabled?: boolean;
    menu?: Record<string, unknown>;
  };
  const singleUpdate = typeof slug === "string" && typeof enabled === "boolean" ? { [slug]: enabled } : null;
  const bulkUpdate =
    requestedMenu &&
    typeof requestedMenu === "object" &&
    !Array.isArray(requestedMenu) &&
    Object.entries(requestedMenu).every(([key, value]) => key.trim().length > 0 && typeof value === "boolean")
      ? (requestedMenu as Record<string, boolean>)
      : null;

  if (!singleUpdate && !bulkUpdate) {
    return NextResponse.json(
      { message: "Invalid request. Expect { slug, enabled } or { menu: Record<string, boolean> }." },
      { status: 400 },
    );
  }

  try {
    const current = await readAdminData();
    const persistedMenu = await readPersistentMenu();
    const menu = { ...(current.menu || {}), ...(persistedMenu || {}), ...(singleUpdate || bulkUpdate || {}) };

    // Supabase Storage is the durable source of truth on serverless hosts.
    // Do this before the best-effort local cache write, so a successful HTTP
    // response always represents a setting that survives the next deployment.
    await writePersistentMenu(menu);

    try {
      await updateAdminData((data) => ({ ...data, menu }));
    } catch {
      // The project filesystem is read-only on many hosts. The Supabase copy
      // above remains authoritative in that case.
    }

    return NextResponse.json({ ...current, menu });
  } catch (error) {
    console.error("Failed to persist menu settings", error);
    return NextResponse.json(
      {
        message:
          "Menu settings could not be saved. Check the deployed SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET values.",
      },
      { status: 503 },
    );
  }
}

// Allow GET to fetch current menu map for convenience
export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const data = await readAdminData();
  return NextResponse.json({ menu: { ...(data.menu || {}), ...((await readPersistentMenu()) || {}) } });
}
