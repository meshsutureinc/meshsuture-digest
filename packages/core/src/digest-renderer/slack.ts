import type { DigestResult, Task } from "../types";

const PRIORITY_COLORS: Record<string, string> = {
  P1: "#DC2626",
  P2: "#F97316",
  P3: "#3B82F6",
  P4: "#9CA3AF",
};

const PRIORITY_LABELS: Record<string, string> = {
  P1: "Urgent & Important",
  P2: "Important, Not Urgent",
  P3: "Urgent, Not Important",
  P4: "Low Priority",
};

function renderTaskLine(task: Task): string {
  const sourceEmoji = task.source === "email" ? ":email:" : ":speech_balloon:";
  const deadline = task.deadline ? ` :calendar: _${task.deadline}_` : "";
  return `${sourceEmoji} *${task.title}*${deadline}\n      From: ${task.senderName} | _${task.reason}_`;
}

export function renderSlackDigest(
  digest: DigestResult,
  date: string
): { blocks: any[]; text: string } {
  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `MeshSuture Daily Digest - ${date}`,
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:crystal_ball: *Daily Overview*\n${digest.dailySummary}`,
      },
    },
    { type: "divider" },
  ];

  const tasksByPriority: Record<string, Task[]> = {
    P1: [],
    P2: [],
    P3: [],
    P4: [],
  };

  for (const task of digest.tasks) {
    tasksByPriority[task.priority]?.push(task);
  }

  for (const priority of ["P1", "P2", "P3", "P4"]) {
    const tasks = tasksByPriority[priority];
    if (tasks.length === 0) continue;

    const label = PRIORITY_LABELS[priority];
    const taskLines = tasks.map(renderTaskLine).join("\n\n");

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${priority}: ${label}* (${tasks.length} task${tasks.length > 1 ? "s" : ""})\n\n${taskLines}`,
      },
    });

    // Add colored sidebar via attachment-style context
    blocks.push({ type: "divider" });
  }

  if (digest.tasks.length === 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: ":white_check_mark: No actionable tasks found. You're all clear!",
      },
    });
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Analyzed ${digest.emailsAnalyzed} email${digest.emailsAnalyzed !== 1 ? "s" : ""} and ${digest.slackMessagesAnalyzed} Slack message${digest.slackMessagesAnalyzed !== 1 ? "s" : ""} | MeshSuture Daily Digest`,
      },
    ],
  });

  const fallbackText = `MeshSuture Daily Digest - ${date}: ${digest.tasks.length} tasks found. ${digest.dailySummary}`;

  return { blocks, text: fallbackText };
}
