import type { FastifyInstance } from "fastify";
import { prisma, type NotificationPreference, type SummaryWindowPreset } from "@meshsuture/db";
import { requireAuth } from "../plugins/clerk-auth.js";
import type { AuthenticatedUser } from "../plugins/clerk-auth.js";

export async function preferencesRoutes(app: FastifyInstance) {
  // Get user preferences
  app.get(
    "/preferences",
    { preHandler: requireAuth },
    async (request) => {
      const { userId } = (request as any).user as AuthenticatedUser;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          microsoftToken: { select: { id: true } },
          slackToken: { select: { id: true } },
        },
      });

      if (!user) {
        return { error: "User not found" };
      }

      return {
        notificationPreference: user.notificationPreference,
        summaryWindowPreset: user.summaryWindowPreset,
        summaryStartTime: user.summaryStartTime,
        summaryEndTime: user.summaryEndTime,
        hasMicrosoft: !!user.microsoftToken,
        hasSlack: !!user.slackToken,
      };
    }
  );

  // Update notification preference
  app.put(
    "/preferences",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = (request as any).user as AuthenticatedUser;
      const body = request.body as {
        notificationPreference?: NotificationPreference;
        summaryWindowPreset?: SummaryWindowPreset;
        summaryStartTime?: string;
        summaryEndTime?: string;
      };

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          microsoftToken: { select: { id: true } },
          slackToken: { select: { id: true } },
        },
      });

      if (!user) {
        reply.code(404).send({ error: "User not found" });
        return;
      }

      // Validate notification preference against connected services
      if (body.notificationPreference) {
        const pref = body.notificationPreference;
        if (
          (pref === "EMAIL_ONLY" || pref === "BOTH") &&
          !user.microsoftToken
        ) {
          reply.code(400).send({
            error:
              "Cannot enable email notifications without connecting Microsoft 365",
          });
          return;
        }
        if (
          (pref === "SLACK_ONLY" || pref === "BOTH") &&
          !user.slackToken
        ) {
          reply.code(400).send({
            error:
              "Cannot enable Slack notifications without connecting Slack",
          });
          return;
        }
      }

      // Validate custom date range
      if (body.summaryWindowPreset === "CUSTOM") {
        if (!body.summaryStartTime || !body.summaryEndTime) {
          reply.code(400).send({
            error: "Custom preset requires both start and end times",
          });
          return;
        }
        const start = new Date(body.summaryStartTime);
        const end = new Date(body.summaryEndTime);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          reply.code(400).send({ error: "Invalid date format" });
          return;
        }
        if (end <= start) {
          reply.code(400).send({ error: "End time must be after start time" });
          return;
        }
        const maxRange = 7 * 24 * 60 * 60 * 1000;
        if (end.getTime() - start.getTime() > maxRange) {
          reply.code(400).send({
            error: "Date range cannot exceed 7 days",
          });
          return;
        }
      }

      const updateData: any = {};
      if (body.notificationPreference) {
        updateData.notificationPreference = body.notificationPreference;
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
        where: { id: userId },
        data: updateData,
      });

      return {
        notificationPreference: updated.notificationPreference,
        summaryWindowPreset: updated.summaryWindowPreset,
        summaryStartTime: updated.summaryStartTime,
        summaryEndTime: updated.summaryEndTime,
      };
    }
  );
}
