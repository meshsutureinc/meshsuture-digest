import Anthropic from "@anthropic-ai/sdk";
import type {
  EmailMessage,
  SlackMessage,
  Task,
  DigestResult,
} from "../types";

function getAnthropicClient(): Anthropic {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });
}

interface ClassifiedMessage {
  id: string;
  source: "email" | "slack";
  subject: string;
  from: string;
  content: string;
  receivedAt: string;
}

function formatEmailsForClassification(
  emails: EmailMessage[]
): ClassifiedMessage[] {
  return emails.map((e) => ({
    id: e.id,
    source: "email" as const,
    subject: e.subject,
    from: e.from,
    content: e.bodyPreview,
    receivedAt: e.receivedAt,
  }));
}

function formatSlackForClassification(
  messages: SlackMessage[]
): ClassifiedMessage[] {
  return messages.map((m) => ({
    id: m.id,
    source: "slack" as const,
    subject: m.isDM ? `DM in ${m.channelName}` : `#${m.channelName}`,
    from: m.from,
    content: m.text,
    receivedAt: m.timestamp,
  }));
}

async function filterMessages(
  client: Anthropic,
  messages: ClassifiedMessage[]
): Promise<ClassifiedMessage[]> {
  if (messages.length === 0) return [];

  // Process in batches to stay within context limits
  const BATCH_SIZE = 50;
  const actionable: ClassifiedMessage[] = [];

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);

    const messageList = batch
      .map(
        (m, idx) =>
          `[${idx}] Source: ${m.source} | From: ${m.from} | Subject: ${m.subject}\nContent: ${m.content}`
      )
      .join("\n---\n");

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are a message classifier for a busy professional. Analyze each message and determine if it is ACTIONABLE (requires a response, contains a task, request, or decision needed) or NOISE (newsletters, automated notifications, FYI-only, marketing, system alerts with no action needed).

Return ONLY a JSON array of indices of ACTIONABLE messages. Example: [0, 2, 5]
If none are actionable, return: []

Messages:
${messageList}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    try {
      const match = text.match(/\[[\d,\s]*\]/);
      if (match) {
        const indices: number[] = JSON.parse(match[0]);
        for (const idx of indices) {
          if (idx >= 0 && idx < batch.length) {
            actionable.push(batch[idx]);
          }
        }
      }
    } catch {
      // If parsing fails, include all messages from this batch as a safety fallback
      actionable.push(...batch);
    }
  }

  return actionable;
}

async function extractAndPrioritize(
  client: Anthropic,
  messages: ClassifiedMessage[]
): Promise<DigestResult> {
  if (messages.length === 0) {
    return {
      dailySummary:
        "No actionable messages found in the analyzed period. Enjoy a clear schedule!",
      tasks: [],
      emailsAnalyzed: 0,
      slackMessagesAnalyzed: 0,
    };
  }

  const messageList = messages
    .map(
      (m, idx) =>
        `[${idx}] Source: ${m.source} | From: ${m.from} | Subject: ${m.subject} | Time: ${m.receivedAt}\nContent: ${m.content}`
    )
    .join("\n---\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are a productivity assistant that extracts and prioritizes tasks from messages using the Eisenhower Matrix.

Priority levels:
- P1: Urgent + Important (deadline within 24h, from key stakeholders, blocking others)
- P2: Important, Not Urgent (strategic work, no immediate deadline)
- P3: Urgent, Not Important (quick responses, delegatable, routine)
- P4: Not Urgent, Not Important (optional, low-impact)

Rules:
- Start each task title with a verb (e.g., "Review", "Respond to", "Schedule")
- Deduplicate tasks that appear in both email and Slack (keep the one with more context)
- Limit to top 15 tasks maximum
- Include a 2-3 sentence daily summary at the top

Return ONLY valid JSON in this exact format:
{
  "dailySummary": "2-3 sentence overview of the day ahead",
  "tasks": [
    {
      "title": "Verb-starting task description",
      "source": "email" or "slack",
      "senderName": "Person's name",
      "priority": "P1" or "P2" or "P3" or "P4",
      "deadline": "mentioned deadline or null",
      "reason": "One-line reason for this priority rating"
    }
  ]
}

Messages to analyze:
${messageList}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    // Extract JSON from the response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      dailySummary:
        parsed.dailySummary || "Your daily digest is ready. Review the tasks below.",
      tasks: (parsed.tasks || []).slice(0, 15).map((t: any) => ({
        title: t.title || "Untitled task",
        source: t.source === "slack" ? "slack" : "email",
        senderName: t.senderName || "Unknown",
        priority: ["P1", "P2", "P3", "P4"].includes(t.priority)
          ? t.priority
          : "P3",
        deadline: t.deadline || undefined,
        reason: t.reason || "",
      })),
      emailsAnalyzed: messages.filter((m) => m.source === "email").length,
      slackMessagesAnalyzed: messages.filter((m) => m.source === "slack")
        .length,
    };
  } catch {
    return {
      dailySummary:
        "Unable to fully process messages. Showing a simplified digest.",
      tasks: [],
      emailsAnalyzed: messages.filter((m) => m.source === "email").length,
      slackMessagesAnalyzed: messages.filter((m) => m.source === "slack")
        .length,
    };
  }
}

export async function runAIPipeline(
  emails: EmailMessage[],
  slackMessages: SlackMessage[]
): Promise<DigestResult> {
  const client = getAnthropicClient();

  // Combine and format messages
  const allMessages = [
    ...formatEmailsForClassification(emails),
    ...formatSlackForClassification(slackMessages),
  ];

  // Stage 1: Filter with Haiku
  const actionableMessages = await filterMessages(client, allMessages);

  // Stage 2: Extract & Prioritize with Sonnet
  const result = await extractAndPrioritize(client, actionableMessages);

  result.emailsAnalyzed = emails.length;
  result.slackMessagesAnalyzed = slackMessages.length;

  return result;
}
