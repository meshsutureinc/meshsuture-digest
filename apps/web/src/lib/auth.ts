import { createClerkClient, verifyToken } from "@clerk/backend";
import { prisma } from "@meshsuture/db";
import { NextRequest, NextResponse } from "next/server";

const secretKey = process.env.CLERK_SECRET_KEY!;

const clerk = createClerkClient({ secretKey });

export interface AuthenticatedUser {
  userId: string;
  clerkId: string;
  email: string;
}

export async function authenticateRequest(
  request: NextRequest
): Promise<AuthenticatedUser | NextResponse> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid authorization header" },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyToken(token, { secretKey });

    if (!payload.sub) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const clerkUser = await clerk.users.getUser(payload.sub);
    const email = clerkUser.emailAddresses?.[0]?.emailAddress;

    if (!email?.endsWith("@meshsuture.com")) {
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

    return { userId: user.id, clerkId: user.clerkId, email: user.email };
  } catch {
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
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  const fakeRequest = new NextRequest(request.url, {
    headers: new Headers({ authorization: `Bearer ${token}` }),
  });
  return authenticateRequest(fakeRequest);
}
