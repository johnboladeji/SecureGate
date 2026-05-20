import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

/**
 * Middleware runs on every matched request BEFORE the page renders.
 * We use NextAuth's withAuth to:
 *   1. Verify the JWT cookie signature using NEXTAUTH_SECRET
 *   2. Reject unauthenticated requests with a redirect to /login
 *   3. Add an extra check that emailVerified is set
 *
 * Defense in depth: this is the OUTER gate. The dashboard page itself ALSO
 * checks the session server-side. If middleware is bypassed somehow
 * (config typo, framework bug), the page-level check still holds.
 */
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard');

    // Token exists (signature was valid) but emailVerified is missing/null.
    // Send them to login with an error message they can act on.
    if (isOnDashboard && token && !token.emailVerified) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'Please verify your email before signing in.');
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Returning false here triggers a redirect to the configured signIn page (/login)
      // BEFORE the middleware function above even runs. The token argument is the
      // decoded JWT from the cookie, or null if the cookie is missing/invalid.
      authorized: ({ token }) => Boolean(token),
    },
    pages: {
      signIn: '/login',
    },
  },
);

// Only run middleware on these paths. Listing API routes here would interfere with
// NextAuth's own callback URLs — keep it scoped to user-facing protected pages.
export const config = {
  matcher: ['/dashboard/:path*'],
};
