import type { FastifyInstance } from "fastify";
import { prisma } from "@meshsuture/db";
import { requireAuth } from "../plugins/clerk-auth.js";
import type { AuthenticatedUser } from "../plugins/clerk-auth.js";
import { runDigestForUser } from "../services/digest-service.js";

export async function digestRoutes(app: FastifyInstance) {
  // Trigger a test digest for the current user
  app.post(
    "/digest/test",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { userId } = (request as any).user as AuthenticatedUser;

      try {
        const result = await runDigestForUser(userId);
        return result;
      } catch (err: any) {
        request.log.error(err, "Test digest failed");
        reply.code(500).send({
          error: "Failed to generate test digest",
          message: err.message,
        });
      }
    }
  );

  // Get past digests
  app.get(
    "/digests",
    { preHandler: requireAuth },
    async (request) => {
      const { userId } = (request as any).user as AuthenticatedUser;

      const digests = await prisma.digest.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
      });

      return digests.map((d) => ({
        id: d.id,
        date: d.date,
        summary: d.summary,
        tasks: JSON.parse(d.tasksJson),
        emailsAnalyzed: d.emailsAnalyzed,
        slackAnalyzed: d.slackAnalyzed,
        sentViaEmail: d.sentViaEmail,
        sentViaSlack: d.sentViaSlack,
        createdAt: d.createdAt,
      }));
    }
  );
}
