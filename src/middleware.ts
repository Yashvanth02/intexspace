import { NextResponse, type NextRequest } from "next/server";

const CONSTRUCTION_PATH = "/under-construction";

export function middleware(request: NextRequest) {
  // Read per-request rather than at module scope so the flag can be flipped
  // without touching code.
  if (process.env.SITE_UNDER_CONSTRUCTION !== "true") {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === CONSTRUCTION_PATH) {
    return NextResponse.next();
  }

  return NextResponse.rewrite(new URL(CONSTRUCTION_PATH, request.url));
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
    "/((?!_next/|images/|api/|admin|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)",
  ],
};
