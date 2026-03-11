import { createClerkClient } from "@clerk/backend";
import { NextRequest, NextResponse } from "next/server";

function getClerkClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY is not set");
  return createClerkClient({ secretKey });
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (!email.endsWith("@meshsuture.com")) {
      return NextResponse.json(
        { error: "Only @meshsuture.com email addresses are allowed" },
        { status: 403 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const clerk = getClerkClient();

    // Check if user already exists
    const existing = await clerk.users.getUserList({
      emailAddress: [email],
    });

    if (existing.totalCount > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 }
      );
    }

    // Create the user via Clerk Backend API
    const user = await clerk.users.createUser({
      emailAddress: [email],
      password,
    });

    // Create a sign-in token so the user is immediately logged in
    const signInToken = await clerk.signInTokens.createSignInToken({
      userId: user.id,
      expiresInSeconds: 60,
    });

    return NextResponse.json({ token: signInToken.token });
  } catch (err: any) {
    console.error("[sign-up API] Error:", err);

    // Surface Clerk validation errors (e.g. password too weak)
    const clerkError = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message;
    if (clerkError) {
      return NextResponse.json({ error: clerkError }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Sign-up failed" },
      { status: 500 }
    );
  }
}
