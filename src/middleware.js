import NextAuth from 'next-auth';

import { authConfig } from '../auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth(async function middleware(req) {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const publicPaths = ['/login'];

  const isPublic = publicPaths.some((path) => pathname.startsWith(path));

  if (!isPublic && !isLoggedIn) {
    const loginUrl = new URL('/login', req.url);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
