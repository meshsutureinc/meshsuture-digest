import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@meshsuture/db";
import { authenticateRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const result = await authenticateRequest(request);
  if (result instanceof NextResponse) return result;

  const [msToken, slackToken] = await Promise.all([
    prisma.microsoftToken.findUnique({ where: { userId: result.userId } }),
    prisma.slackToken.findUnique({ where: { userId: result.userId } }),
  ]);

  return NextResponse.json({
    microsoft: {
      connected: !!msToken,
      expiresAt: msToken?.expiresAt || null,
    },
    slack: {
      connected: !!slackToken,
      teamName: slackToken?.teamName || null,
    },
  });
}
