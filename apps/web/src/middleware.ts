import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    const session = await auth();
    if (!session.userId) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
  }
  // Return nothing for all other routes — let clerkMiddleware handle
  // session syncing, __clerk_synced callbacks, and cookie management
});

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - Static files (_next, images, etc.)
     * - API routes (handled by their own auth)
     */
    "/((?!_next|api/|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
