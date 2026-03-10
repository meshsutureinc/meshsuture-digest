import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@meshsuture/db";
import { authenticateRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const result = await authenticateRequest(request);
  if (result instanceof NextResponse) return result;

  const digests = await prisma.digest.findMany({
    where: { userId: result.userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json(
    digests.map((d) => ({
      id: d.id,
      date: d.date,
      summary: d.summary,
      tasks: JSON.parse(d.tasksJson),
      emailsAnalyzed: d.emailsAnalyzed,
      slackAnalyzed: d.slackAnalyzed,
      sentViaEmail: d.sentViaEmail,
      sentViaSlack: d.sentViaSlack,
      createdAt: d.createdAt,
    }))
  );
}
