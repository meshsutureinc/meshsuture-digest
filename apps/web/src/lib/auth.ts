import { createClerkClient, verifyToken } from "@clerk/backend";
import { prisma } from "@meshsuture/db";
import { NextRequest, NextResponse } from "next/server";

export interface AuthenticatedUser {
  userId: string;
  clerkId: string;
  email: string;
}

function getSecretKey(): string {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) {
    throw new Error("CLERK_SECRET_KEY is not set");
  }
  return key;
}

function getClerkClient() {
  return createClerkClient({ secretKey: getSecretKey() });
}

function getAuthorizedParties(): string[] {
  const parties = [
    "http://localhost:3000",
    "https://dailydigest.meshsuture.com",
  ];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl && !parties.includes(appUrl)) {
    parties.push(appUrl);
  }
  return parties;
}

export async function authenticateRequest(
  request: NextRequest
): Promise<AuthenticatedUser | NextResponse> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    console.error("[auth] No Bearer token in authorization header");
    return NextResponse.json(
      { error: "Missing or invalid authorization header" },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);
  const secretKey = getSecretKey();
  const authorizedParties = getAuthorizedParties();

  // Step 1: Verify the Clerk JWT
  let payload;
  try {
    payload = await verifyToken(token, {
      secretKey,
      authorizedParties,
    });
    console.log("[auth] verifyToken succeeded, sub:", payload.sub);
  } catch (err: any) {
    console.error("[auth] Clerk token verification FAILED:", {
      errorName: err?.name,
      errorMessage: err?.message,
      errorReason: err?.reason,
    });
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }

  if (!payload.sub) {
    console.error("[auth] Token verified but no sub claim");
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Step 2: Fetch Clerk user profile
  let email: string | undefined;
  let userName: string | null = null;
  try {
    const clerk = getClerkClient();
    const clerkUser = await clerk.users.getUser(payload.sub);
    email = clerkUser.emailAddresses?.[0]?.emailAddress;
    userName =
      `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
      null;
    console.log("[auth] Clerk user fetched, email:", email);
  } catch (err: any) {
    console.error("[auth] Clerk API getUser FAILED:", err?.message);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 502 }
    );
  }

  if (!email?.endsWith("@meshsuture.com")) {
    console.error("[auth] Email domain rejected:", email);
    return NextResponse.json(
      { error: "Only @meshsuture.com emails are allowed" },
      { status: 403 }
    );
  }

  // Step 3: Upsert user in database
  try {
    const user = await prisma.user.upsert({
      where: { clerkId: payload.sub },
      update: { email, name: userName },
      create: { clerkId: payload.sub, email, name: userName },
    });

    console.log("[auth] User authenticated:", user.id);
    return { userId: user.id, clerkId: user.clerkId, email: user.email };
  } catch (err: any) {
    console.error("[auth] Database error during user upsert:", {
      errorMessage: err?.message,
      errorCode: err?.code,
    });
    return NextResponse.json(
      { error: "Database connection failed" },
      { status: 503 }
    );
  }
}

/**
 * Authenticate from a query-param token (used in OAuth initiation redirects).
 */
export async function authenticateFromQuery(
  request: NextRequest
): Promise<AuthenticatedUser | NextResponse> {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    console.error("[auth] No token query parameter found in URL");
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  console.log("[auth] authenticateFromQuery: token length", token.length);
  const authedRequest = new NextRequest(request.url, {
    headers: new Headers({ authorization: `Bearer ${token}` }),
  });
  return authenticateRequest(authedRequest);
}
