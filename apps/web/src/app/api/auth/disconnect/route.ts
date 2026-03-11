import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@meshsuture/db";
import { authenticateRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const result = await authenticateRequest(request);
  if (result instanceof NextResponse) return result;

  const { provider } = (await request.json()) as { provider: string };

  if (provider === "microsoft") {
    await prisma.microsoftToken.deleteMany({
      where: { userId: result.userId },
    });
    return NextResponse.json({ disconnected: "microsoft" });
  }

  if (provider === "slack") {
    await prisma.slackToken.deleteMany({
      where: { userId: result.userId },
    });
    return NextResponse.json({ disconnected: "slack" });
  }

  return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
}
