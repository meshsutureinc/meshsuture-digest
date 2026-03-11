import { NextRequest, NextResponse } from "next/server";
import {
  prisma,
  type NotificationPreference,
  type DataSourcePreference,
  type SummaryWindowPreset,
} from "@meshsuture/db";
import { authenticateRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const result = await authenticateRequest(request);
  if (result instanceof NextResponse) return result;

  const user = await prisma.user.findUnique({
    where: { id: result.userId },
    include: {
      microsoftToken: { select: { id: true } },
      slackToken: { select: { id: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    notificationPreference: user.notificationPreference,
    dataSourcePreference: user.dataSourcePreference,
    summaryWindowPreset: user.summaryWindowPreset,
    summaryStartTime: user.summaryStartTime,
    summaryEndTime: user.summaryEndTime,
    hasMicrosoft: !!user.microsoftToken,
    hasSlack: !!user.slackToken,
  });
}

export async function PUT(request: NextRequest) {
  const result = await authenticateRequest(request);
  if (result instanceof NextResponse) return result;

  const body = (await request.json()) as {
    notificationPreference?: NotificationPreference;
    dataSourcePreference?: DataSourcePreference;
    summaryWindowPreset?: SummaryWindowPreset;
    summaryStartTime?: string;
    summaryEndTime?: string;
  };

  const user = await prisma.user.findUnique({
    where: { id: result.userId },
    include: {
      microsoftToken: { select: { id: true } },
      slackToken: { select: { id: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (body.notificationPreference) {
    const pref = body.notificationPreference;
    if (
      (pref === "EMAIL_ONLY" || pref === "BOTH") &&
      !user.microsoftToken
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot enable email notifications without connecting Microsoft 365",
        },
        { status: 400 }
      );
    }
    if (
      (pref === "SLACK_ONLY" || pref === "BOTH") &&
      !user.slackToken
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot enable Slack notifications without connecting Slack",
        },
        { status: 400 }
      );
    }
  }

  if (body.summaryWindowPreset === "CUSTOM") {
    if (!body.summaryStartTime || !body.summaryEndTime) {
      return NextResponse.json(
        { error: "Custom preset requires both start and end times" },
        { status: 400 }
      );
    }
    const start = new Date(body.summaryStartTime);
    const end = new Date(body.summaryEndTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }
    if (end <= start) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }
    const maxRange = 7 * 24 * 60 * 60 * 1000;
    if (end.getTime() - start.getTime() > maxRange) {
      return NextResponse.json(
        { error: "Date range cannot exceed 7 days" },
        { status: 400 }
      );
    }
  }

  const updateData: any = {};
  if (body.notificationPreference) {
    updateData.notificationPreference = body.notificationPreference;
  }
  if (body.dataSourcePreference) {
    updateData.dataSourcePreference = body.dataSourcePreference;
  }
  if (body.summaryWindowPreset) {
    updateData.summaryWindowPreset = body.summaryWindowPreset;
  }
  if (body.summaryStartTime !== undefined) {
    updateData.summaryStartTime = body.summaryStartTime;
  }
  if (body.summaryEndTime !== undefined) {
    updateData.summaryEndTime = body.summaryEndTime;
  }

  const updated = await prisma.user.update({
    where: { id: result.userId },
    data: updateData,
  });

  return NextResponse.json({
    notificationPreference: updated.notificationPreference,
    dataSourcePreference: updated.dataSourcePreference,
    summaryWindowPreset: updated.summaryWindowPreset,
    summaryStartTime: updated.summaryStartTime,
    summaryEndTime: updated.summaryEndTime,
  });
}
