import { NextResponse } from "next/server";

import { auth } from "@/auth";

export default auth((req) => {
  const loggedIn = !!req.auth;
  const path = req.nextUrl.pathname;
  const isDashboard = path.startsWith("/dashboard");
  const isAuthPage = path === "/signin" || path === "/signup";

  if (isDashboard && !loggedIn) {
    const signIn = new URL("/signin", req.nextUrl.origin);
    signIn.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(signIn);
  }

  if (isAuthPage && loggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/signin", "/signup"],
};
