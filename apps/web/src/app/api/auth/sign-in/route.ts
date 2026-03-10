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

    const clerk = getClerkClient();

    // Step 1: Find user by email
    const users = await clerk.users.getUserList({
      emailAddress: [email],
    });

    if (users.totalCount === 0) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const user = users.data[0];

    // Step 2: Verify password server-side
    try {
      const { verified } = await clerk.users.verifyPassword({
        userId: user.id,
        password,
      });

      if (!verified) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Step 3: Create a sign-in token (bypasses client trust / captcha)
    const signInToken = await clerk.signInTokens.createSignInToken({
      userId: user.id,
      expiresInSeconds: 60,
    });

    return NextResponse.json({ token: signInToken.token });
  } catch (err: any) {
    console.error("[sign-in API] Error:", err);
    return NextResponse.json(
      { error: "Sign-in failed" },
      { status: 500 }
    );
  }
}
