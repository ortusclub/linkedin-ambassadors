import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const VALID_BRANDS = new Set(["linkedvelocity", "linkedreps"]);
const CANONICAL_HOSTS = new Set(["linkedvelocity.com", "linkedreps.io"]);

function normHost(h: string | null): string {
  return (h || "").split(",")[0].trim().replace(/:\d+$/, "").replace(/^www\./, "").toLowerCase();
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const sessionToken = request.cookies.get("session_token")?.value;

  // Protect customer dashboard and profile
  if (pathname.startsWith("/dashboard") && !sessionToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Protect admin routes (full auth check happens in admin layout)
  if (pathname.startsWith("/admin") && !sessionToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect logged-in users away from auth pages
  if ((pathname === "/login" || pathname === "/register") && sessionToken) {
    const redirect = searchParams.get("redirect");
    if (redirect && redirect.startsWith("/")) {
      return NextResponse.redirect(new URL(redirect, request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Brand override — for previews and localhost only. On the real linkedvelocity.com /
  // linkedreps.io domains the host always decides (this block is skipped), so SEO and
  // production behaviour are unaffected. Elsewhere, `?brand=linkedreps` themes the whole
  // session (via a request header for this render + a cookie to persist across pages).
  const host = normHost(request.headers.get("host"));
  if (!CANONICAL_HOSTS.has(host)) {
    const paramBrand = searchParams.get("brand");
    const cookieBrand = request.cookies.get("brand_override")?.value;
    const override =
      paramBrand && VALID_BRANDS.has(paramBrand)
        ? paramBrand
        : cookieBrand && VALID_BRANDS.has(cookieBrand)
          ? cookieBrand
          : null;
    if (override) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-brand-override", override);
      const res = NextResponse.next({ request: { headers: requestHeaders } });
      if (paramBrand && VALID_BRANDS.has(paramBrand)) {
        res.cookies.set("brand_override", paramBrand, { path: "/", sameSite: "lax" });
      }
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run on all pages (so the brand override can apply on marketing routes too), but skip
  // API, Next internals and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
