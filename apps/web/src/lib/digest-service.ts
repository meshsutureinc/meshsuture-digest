import { prisma } from "@meshsuture/db";
import {
  decrypt,
  encrypt,
  fetchEmails,
  sendEmailViaMSGraph,
  refreshAccessToken,
  fetchSlackMessages,
  sendSlackDM,
  runAIPipeline,
  renderEmailDigest,
  renderSlackDigest,
  computeTimeRange,
} from "@meshsuture/core";
import type { DigestResult, EmailMessage, SlackMessage } from "@meshsuture/core";

export async function runDigestForUser(
  userId: string
): Promise<DigestResult & { sentViaEmail: boolean; sentViaSlack: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      microsoftToken: true,
      slackToken: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const timeRange = computeTimeRange(
    user.summaryWindowPreset,
    user.summaryStartTime,
    user.summaryEndTime
  );

  let emails: EmailMessage[] = [];
  let slackMessages: SlackMessage[] = [];

  if (user.microsoftToken) {
    let accessToken: string;

    if (user.microsoftToken.expiresAt < new Date()) {
      try {
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
      } catch (err) {
        console.error("Failed to refresh Microsoft token:", err);
        throw new Error(
          "Microsoft token expired. Please reconnect your Microsoft 365 account."
        );
      }
    } else {
      accessToken = decrypt(user.microsoftToken.encryptedAccessToken);
    }

    emails = await fetchEmails(accessToken, timeRange);
  }

  if (user.slackToken && user.slackToken.slackUserId) {
    slackMessages = await fetchSlackMessages(
      user.slackToken.encryptedBotToken,
      user.slackToken.slackUserId,
      timeRange
    );
  }

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
  console.log("[Digest] Notification preference:", pref);
  console.log("[Digest] Has Microsoft token:", !!user.microsoftToken);
  console.log("[Digest] Has Slack token:", !!user.slackToken);
  console.log("[Digest] Slack user ID:", user.slackToken?.slackUserId);

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

      const htmlEmail = renderEmailDigest(digestResult, dateStr);
      await sendEmailViaMSGraph(
        accessToken,
        user.email,
        `MeshSuture Daily Digest - ${dateStr}`,
        htmlEmail
      );
      sentViaEmail = true;
    } catch (err) {
      console.error("Failed to send email digest:", err);
    }
  }

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
      console.error("Failed to send Slack digest:", err);
    }
  }

  const todayKey = new Date().toISOString().split("T")[0];
  await prisma.digest.upsert({
    where: {
      userId_date: { userId, date: todayKey },
    },
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
      date: todayKey,
      summary: digestResult.dailySummary,
      tasksJson: JSON.stringify(digestResult.tasks),
      emailsAnalyzed: digestResult.emailsAnalyzed,
      slackAnalyzed: digestResult.slackMessagesAnalyzed,
      sentViaEmail,
      sentViaSlack,
    },
  });

  return {
    ...digestResult,
    sentViaEmail,
    sentViaSlack,
  };
}
