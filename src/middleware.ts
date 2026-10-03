import { NextResponse, type NextRequest } from "next/server";

const CONSTRUCTION_PATH = "/under-construction";

export async function middleware(request: NextRequest) {
  const noStore = (response: NextResponse) => {
    // Public pages render content that is edited in the admin dashboard.
    // Prevent a browser/CDN from serving an older HTML document after a save.
    response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    return response;
  };

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-intex-pathname", request.nextUrl.pathname);
  const forward = { request: { headers: requestHeaders } };

  if (request.nextUrl.pathname === "/admin" || request.nextUrl.pathname.startsWith("/admin/")) {
    return noStore(NextResponse.next(forward));
  }

  let maintenanceEnabled = process.env.SITE_UNDER_CONSTRUCTION === "true";
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (url && key) {
    try {
      const bucket = encodeURIComponent(process.env.SUPABASE_STORAGE_BUCKET?.trim() || "Gallery");
      const response = await fetch(`${url}/storage/v1/object/${bucket}/settings/site-settings.json?cacheNonce=${Date.now()}`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const settings = await response.json();
        if (typeof settings.maintenanceEnabled === "boolean") maintenanceEnabled = settings.maintenanceEnabled;
      }
    } catch {
      // Keep the environment default if the shared settings cannot be read.
    }
  }

  if (!maintenanceEnabled) return noStore(NextResponse.next(forward));

  if (request.nextUrl.pathname === CONSTRUCTION_PATH) {
    return noStore(NextResponse.next(forward));
  }

  return noStore(NextResponse.rewrite(new URL(CONSTRUCTION_PATH, request.url), forward));
}

export const config = {
  /**
   * Everything is gated except:
   *   _next, images, favicon — assets the construction page itself needs.
   *   admin, api           — the client keeps managing content while the
   *                          public site is dark. Both are already
   *                          password-protected.
   */
  matcher: [
    "/((?!_next/|images/|css/|js/|webfonts/|api/|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)",
  ],
};
