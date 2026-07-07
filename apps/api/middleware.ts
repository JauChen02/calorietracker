import { clerkMiddleware } from "@clerk/nextjs/server";

// Registers Clerk context for all routes so auth() and currentUser() work
// in route handlers. Individual routes are responsible for enforcing auth.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Run on all paths except Next.js static assets
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
