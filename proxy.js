import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy(req) {
    const { pathname } = req.nextUrl;
    const { token } = req.nextauth;

    if (pathname.startsWith("/admin")) {
      const adminEmails = process.env.ADMIN_EMAILS
        ?.split(",")
        .map((e) => e.trim()) || [];
      if (!token?.email || !adminEmails.includes(token.email)) {
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
