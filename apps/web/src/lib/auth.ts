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

/**
 * Decode JWT payload without verification, for diagnostic logging only.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(payload);
  } catch {
    return null;
  }
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

  // Log diagnostics (redact sensitive values)
  const claims = decodeJwtPayload(token);
  console.log("[auth] Token diagnostics:", {
    tokenLength: token.length,
    tokenPrefix: token.slice(0, 20) + "...",
    secretKeyPrefix: secretKey.slice(0, 7) + "...",
    authorizedParties,
    jwtClaims: claims
      ? {
          iss: claims.iss,
          azp: claims.azp,
          sub: claims.sub,
          exp: claims.exp,
          nbf: claims.nbf,
          iat: claims.iat,
        }
      : "FAILED_TO_DECODE",
  });

  try {
    const payload = await verifyToken(token, {
      secretKey,
      authorizedParties,
    });
    console.log("[auth] verifyToken succeeded, sub:", payload.sub);

    if (!payload.sub) {
      console.error("[auth] Token verified but no sub claim");
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const clerk = getClerkClient();
    const clerkUser = await clerk.users.getUser(payload.sub);
    const email = clerkUser.emailAddresses?.[0]?.emailAddress;
    console.log("[auth] Clerk user fetched, email:", email);

    if (!email?.endsWith("@meshsuture.com")) {
      console.error("[auth] Email domain rejected:", email);
      return NextResponse.json(
        { error: "Only @meshsuture.com emails are allowed" },
        { status: 403 }
      );
    }

    const user = await prisma.user.upsert({
      where: { clerkId: payload.sub },
      update: {
        email,
        name:
          `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
          null,
      },
      create: {
        clerkId: payload.sub,
        email,
        name:
          `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
          null,
      },
    });

    console.log("[auth] User authenticated:", user.id);
    return { userId: user.id, clerkId: user.clerkId, email: user.email };
  } catch (err: any) {
    console.error("[auth] Token verification FAILED:", {
      errorName: err?.name,
      errorMessage: err?.message,
      errorCode: err?.code,
      errorStatus: err?.status,
      errorReason: err?.reason,
      clerkErrors: err?.errors,
      stack: err?.stack?.split("\n").slice(0, 5).join("\n"),
    });
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
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
