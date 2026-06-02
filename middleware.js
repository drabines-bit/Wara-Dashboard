import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const { token } = req.nextauth;

    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim()) || [];
    const viewerEmails = process.env.VIEWER_EMAILS?.split(",").map(e => e.trim()) || [];
    const allowedEmails = [...adminEmails, ...viewerEmails];

    // Si el email no está en ninguna lista autorizada → sin acceso
    if (!token?.email || !allowedEmails.includes(token.email)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    // Rutas de admin → solo adminEmails
    if (pathname.startsWith("/admin")) {
      if (!adminEmails.includes(token.email)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: { authorized: ({ token }) => !!token },
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
