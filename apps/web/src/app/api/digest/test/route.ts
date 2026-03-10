import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { runDigestForUser } from "@/lib/digest-service";

export async function POST(request: NextRequest) {
  const result = await authenticateRequest(request);
  if (result instanceof NextResponse) return result;

  try {
    const digest = await runDigestForUser(result.userId);
    return NextResponse.json(digest);
  } catch (err: any) {
    console.error("Test digest failed:", err);
    return NextResponse.json(
      { error: "Failed to generate test digest", message: err.message },
      { status: 500 }
    );
  }
}
