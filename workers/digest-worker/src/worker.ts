import { Worker, Queue } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "@meshsuture/db";
import { decrypt, encrypt } from "@meshsuture/core";
import {
  fetchEmails,
  sendEmailViaMSGraph,
  refreshAccessToken,
} from "@meshsuture/core/src/email-fetcher/index.js";
import {
  fetchSlackMessages,
  sendSlackDM,
} from "@meshsuture/core/src/slack-fetcher/index.js";
import { runAIPipeline } from "@meshsuture/core/src/ai-pipeline/index.js";
import { renderEmailDigest } from "@meshsuture/core/src/digest-renderer/email.js";
import { renderSlackDigest } from "@meshsuture/core/src/digest-renderer/slack.js";
import { computeTimeRange } from "@meshsuture/core/src/time-range.js";
import type { EmailMessage, SlackMessage } from "@meshsuture/core";

const QUEUE_NAME = "daily-digest";
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

const digestQueue = new Queue(QUEUE_NAME, { connection });

// Process digest jobs
const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const { userId } = job.data;
    const today = new Date().toISOString().split("T")[0];
    const idempotencyKey = `digest:${userId}:${today}`;

    // Check idempotency
    const alreadySent = await connection.get(idempotencyKey);
    if (alreadySent) {
      console.log(
        `Digest already sent for user ${userId} on ${today}, skipping`
      );
      return { skipped: true };
    }

    console.log(`Processing digest for user ${userId}`);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        microsoftToken: true,
        slackToken: true,
      },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Compute time range
    const timeRange = computeTimeRange(
      user.summaryWindowPreset,
      user.summaryStartTime,
      user.summaryEndTime
    );

    let emails: EmailMessage[] = [];
    let slackMessages: SlackMessage[] = [];

    // Fetch emails
    if (user.microsoftToken) {
      let accessToken: string;
      if (user.microsoftToken.expiresAt < new Date()) {
        const refreshed = await refreshAccessToken(
          user.microsoftToken.encryptedRefreshToken
        );
        await prisma.microsoftToken.update({
          where: { id: user.microsoftToken.id },
          data: {
            encryptedAccessToken: encrypt(refreshed.accessToken),
            encryptedRefreshToken: encrypt(refreshed.refreshToken),
            expiresAt: refreshed.expiresAt,
          },
        });
        accessToken = refreshed.accessToken;
      } else {
        accessToken = decrypt(user.microsoftToken.encryptedAccessToken);
      }
      emails = await fetchEmails(accessToken, timeRange);
    }

    // Fetch Slack
    if (user.slackToken?.slackUserId) {
      slackMessages = await fetchSlackMessages(
        user.slackToken.encryptedBotToken,
        user.slackToken.slackUserId,
        timeRange
      );
    }

    // AI pipeline
    const digestResult = await runAIPipeline(emails, slackMessages);

    const dateStr = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "America/Chicago",
    });

    let sentViaEmail = false;
    let sentViaSlack = false;
    const pref = user.notificationPreference;

    // Send email
    if (
      (pref === "EMAIL_ONLY" || pref === "BOTH") &&
      user.microsoftToken
    ) {
      try {
        let accessToken: string;
        if (user.microsoftToken.expiresAt < new Date()) {
          const refreshed = await refreshAccessToken(
            user.microsoftToken.encryptedRefreshToken
          );
          accessToken = refreshed.accessToken;
        } else {
          accessToken = decrypt(user.microsoftToken.encryptedAccessToken);
        }
        const html = renderEmailDigest(digestResult, dateStr);
        await sendEmailViaMSGraph(
          accessToken,
          user.email,
          `MeshSuture Daily Digest - ${dateStr}`,
          html
        );
        sentViaEmail = true;
      } catch (err) {
        console.error(`Email delivery failed for ${userId}:`, err);
      }
    }

    // Send Slack DM
    if (
      (pref === "SLACK_ONLY" || pref === "BOTH") &&
      user.slackToken?.slackUserId
    ) {
      try {
        const { blocks, text } = renderSlackDigest(digestResult, dateStr);
        await sendSlackDM(
          user.slackToken.encryptedBotToken,
          user.slackToken.slackUserId,
          blocks,
          text
        );
        sentViaSlack = true;
      } catch (err) {
        console.error(`Slack delivery failed for ${userId}:`, err);
      }
    }

    // Save digest
    await prisma.digest.upsert({
      where: { userId_date: { userId, date: today } },
      update: {
        summary: digestResult.dailySummary,
        tasksJson: JSON.stringify(digestResult.tasks),
        emailsAnalyzed: digestResult.emailsAnalyzed,
        slackAnalyzed: digestResult.slackMessagesAnalyzed,
        sentViaEmail,
        sentViaSlack,
      },
      create: {
        userId,
        date: today,
        summary: digestResult.dailySummary,
        tasksJson: JSON.stringify(digestResult.tasks),
        emailsAnalyzed: digestResult.emailsAnalyzed,
        slackAnalyzed: digestResult.slackMessagesAnalyzed,
        sentViaEmail,
        sentViaSlack,
      },
    });

    // Set idempotency key (25-hour TTL)
    await connection.set(idempotencyKey, "1", "EX", 25 * 60 * 60);

    console.log(
      `Digest delivered for ${userId}: email=${sentViaEmail}, slack=${sentViaSlack}`
    );

    return { sentViaEmail, sentViaSlack, tasksFound: digestResult.tasks.length };
  },
  {
    connection,
    concurrency: 3,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

// Schedule jobs for all users
async function scheduleAllUsers() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { microsoftToken: { isNot: null } },
        { slackToken: { isNot: null } },
      ],
    },
  });

  // Remove all existing repeatable jobs
  const repeatableJobs = await digestQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await digestQueue.removeRepeatableByKey(job.key);
  }

  // Create a repeatable job for each user: weekdays at 7 AM Central
  for (const user of users) {
    await digestQueue.add(
      `digest-${user.id}`,
      { userId: user.id },
      {
        repeat: {
          pattern: "0 7 * * 1-5", // Mon-Fri at 7:00 AM
          tz: "America/Chicago",
        },
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 60000, // 1 minute initial delay
        },
      }
    );
    console.log(`Scheduled digest for user ${user.id} (${user.email})`);
  }

  console.log(`Scheduled ${users.length} user digest jobs`);
}

// Initial schedule setup
scheduleAllUsers().catch(console.error);

// Re-schedule every hour to pick up new users
setInterval(
  () => {
    scheduleAllUsers().catch(console.error);
  },
  60 * 60 * 1000
);

console.log("Digest worker started");

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down worker...");
  await worker.close();
  await connection.quit();
  process.exit(0);
});
