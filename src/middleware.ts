import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { COOKIE_NAME } from "@/lib/auth/session";
import createIntlMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "@/i18n/config";

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

// Routes that don't require auth
const publicPaths = ["/login", "/api/auth/login"];

// Role-based route prefixes
const roleRoutes: Record<string, string[]> = {
  super_admin: ["/owner", "/admin", "/operator", "/auditor"],
  admin: ["/admin", "/operator"],
  operator: ["/operator"],
  auditor: ["/auditor"],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let API routes (except auth) and static files pass
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Strip locale prefix for path checks
  const localeRegex = new RegExp(`^/(${locales.join("|")})`);
  const pathnameWithoutLocale = pathname.replace(localeRegex, "") || "/";

  // Public paths bypass auth
  if (publicPaths.some((p) => pathnameWithoutLocale.startsWith(p))) {
    return intlMiddleware(request);
  }

  // Check auth token
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  if (!session) {
    const locale = pathname.match(localeRegex)?.[1] ?? defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  // If user hits root /[locale], redirect to their role dashboard
  if (pathnameWithoutLocale === "/" || pathnameWithoutLocale === "") {
    const locale = session.preferredLocale ?? defaultLocale;
    const dashboardPath = getRoleDashboard(session.role);
    return NextResponse.redirect(
      new URL(`/${locale}${dashboardPath}`, request.url)
    );
  }

  // Check role-based access
  const requestedSection = Object.keys(roleRoutes).find((role) =>
    roleRoutes[role].some((prefix) =>
      pathnameWithoutLocale.startsWith(prefix)
    )
  );

  if (requestedSection) {
    const allowedSections = roleRoutes[session.role] ?? [];
    const sectionPrefix = Object.values(roleRoutes)
      .flat()
      .find((prefix) => pathnameWithoutLocale.startsWith(prefix));

    if (sectionPrefix && !allowedSections.includes(sectionPrefix)) {
      const locale = session.preferredLocale ?? defaultLocale;
      const dashboardPath = getRoleDashboard(session.role);
      return NextResponse.redirect(
        new URL(`/${locale}${dashboardPath}`, request.url)
      );
    }
  }

  return intlMiddleware(request);
}

function getRoleDashboard(role: string): string {
  switch (role) {
    case "super_admin":
      return "/owner";
    case "admin":
      return "/admin";
    case "operator":
      return "/operator";
    case "auditor":
      return "/auditor";
    default:
      return "/operator";
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
