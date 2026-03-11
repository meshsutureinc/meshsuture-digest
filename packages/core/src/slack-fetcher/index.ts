import { WebClient } from "@slack/web-api";
import { decrypt } from "../encryption/index";
import type { SlackMessage, TimeRange } from "../types";

export function getSlackClient(encryptedBotToken: string): WebClient {
  const token = decrypt(encryptedBotToken);
  return new WebClient(token);
}

export async function fetchSlackMessages(
  encryptedBotToken: string,
  slackUserId: string,
  timeRange: TimeRange
): Promise<SlackMessage[]> {
  const client = getSlackClient(encryptedBotToken);
  const allMessages: SlackMessage[] = [];

  const startTs = (timeRange.start.getTime() / 1000).toString();
  const endTs = (timeRange.end.getTime() / 1000).toString();

  // Build a user ID -> display name map
  const userMap = new Map<string, string>();
  try {
    const usersResult = await client.users.list({ limit: 500 });
    for (const member of usersResult.members || []) {
      if (member.id && (member.real_name || member.name)) {
        userMap.set(member.id, member.real_name || member.name || "Unknown");
      }
    }
  } catch {
    // Proceed without user names if this fails
  }

  // Fetch all conversations user is part of
  const convResult = await client.users.conversations({
    user: slackUserId,
    types: "public_channel,private_channel,mpim,im",
    limit: 200,
  });

  const channels = convResult.channels || [];

  for (const channel of channels) {
    if (!channel.id) continue;

    try {
      const historyResult = await client.conversations.history({
        channel: channel.id,
        oldest: startTs,
        latest: endTs,
        limit: 100,
      });

      for (const msg of historyResult.messages || []) {
        if (!msg.text || msg.subtype === "channel_join" || msg.subtype === "channel_leave") {
          continue;
        }

        // Skip bot messages and the user's own messages
        if (msg.bot_id || msg.user === slackUserId) continue;

        const isDM = channel.is_im === true;
        const channelName = isDM
          ? `DM with ${userMap.get(msg.user || "") || "someone"}`
          : channel.name || "unknown-channel";

        allMessages.push({
          id: msg.ts || "",
          channelId: channel.id,
          channelName,
          text: (msg.text || "").substring(0, 1000),
          from: userMap.get(msg.user || "") || msg.user || "Unknown",
          fromUserId: msg.user || "",
          timestamp: msg.ts || "",
          threadTs: msg.thread_ts,
          isDM,
        });
      }
    } catch {
      // Skip channels we can't read (permissions, archived, etc.)
      continue;
    }
  }

  return allMessages;
}

export async function lookupSlackUserId(
  encryptedBotToken: string,
  email: string
): Promise<string | null> {
  const client = getSlackClient(encryptedBotToken);
  try {
    console.log("[Slack] Looking up user by email:", email);
    const result = await client.users.lookupByEmail({ email });
    console.log("[Slack] lookupByEmail result:", result.user?.id, result.user?.name);
    return result.user?.id || null;
  } catch (err: any) {
    console.error("[Slack] lookupByEmail failed:", err?.data?.error || err?.message || err);
    return null;
  }
}

export async function sendSlackDM(
  encryptedBotToken: string,
  slackUserId: string,
  blocks: any[],
  text: string
): Promise<void> {
  const client = getSlackClient(encryptedBotToken);

  // Open a DM channel with the user
  const dmResult = await client.conversations.open({
    users: slackUserId,
  });

  const channelId = dmResult.channel?.id;
  if (!channelId) {
    throw new Error("Failed to open DM channel with user");
  }

  await client.chat.postMessage({
    channel: channelId,
    blocks,
    text, // Fallback text for notifications
  });
}
