import type { DigestResult, Task } from "../types.js";

const PRIORITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  P1: { bg: "#DC2626", text: "#FFFFFF", label: "URGENT" },
  P2: { bg: "#F97316", text: "#FFFFFF", label: "IMPORTANT" },
  P3: { bg: "#3B82F6", text: "#FFFFFF", label: "ROUTINE" },
  P4: { bg: "#9CA3AF", text: "#FFFFFF", label: "LOW" },
};

const PRIORITY_TITLES: Record<string, string> = {
  P1: "Urgent & Important",
  P2: "Important, Not Urgent",
  P3: "Urgent, Not Important",
  P4: "Neither Urgent nor Important",
};

function sourceIcon(source: "email" | "slack"): string {
  return source === "email" ? "&#9993;" : "&#128172;";
}

function renderTask(task: Task): string {
  const priority = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.P3;
  const deadlineHtml = task.deadline
    ? `<span style="color:#DC2626;font-size:12px;margin-left:8px;">&#128197; ${task.deadline}</span>`
    : "";

  return `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #E5E7EB;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="background:${priority.bg};color:${priority.text};font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;letter-spacing:0.5px;">${task.priority}</span>
          <span style="font-size:15px;color:#111827;font-weight:500;">${task.title}</span>
          ${deadlineHtml}
        </div>
        <div style="margin-top:4px;font-size:13px;color:#6B7280;">
          ${sourceIcon(task.source)} ${task.senderName} &middot; <em>${task.reason}</em>
        </div>
      </td>
    </tr>`;
}

function renderPrioritySection(
  priority: string,
  tasks: Task[]
): string {
  if (tasks.length === 0) return "";

  const info = PRIORITY_COLORS[priority] || PRIORITY_COLORS.P3;
  const title = PRIORITY_TITLES[priority] || priority;

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:8px 16px;background:${info.bg};border-radius:8px 8px 0 0;">
          <span style="color:${info.text};font-size:14px;font-weight:700;">${priority}: ${title}</span>
          <span style="color:${info.text};opacity:0.8;font-size:13px;margin-left:8px;">(${tasks.length} task${tasks.length > 1 ? "s" : ""})</span>
        </td>
      </tr>
      ${tasks.map(renderTask).join("")}
    </table>`;
}

export function renderEmailDigest(
  digest: DigestResult,
  date: string
): string {
  const tasksByPriority: Record<string, Task[]> = {
    P1: [],
    P2: [],
    P3: [],
    P4: [],
  };

  for (const task of digest.tasks) {
    tasksByPriority[task.priority]?.push(task);
  }

  const prioritySections = ["P1", "P2", "P3", "P4"]
    .map((p) => renderPrioritySection(p, tasksByPriority[p]))
    .join("");

  const noTasks =
    digest.tasks.length === 0
      ? `<p style="text-align:center;color:#6B7280;padding:32px;">No actionable tasks found. You're all clear!</p>`
      : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MeshSuture Daily Digest - ${date}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1E40AF,#7C3AED);padding:32px 24px;text-align:center;">
              <h1 style="margin:0;color:#FFFFFF;font-size:24px;font-weight:700;">MeshSuture Daily Digest</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">${date}</p>
            </td>
          </tr>

          <!-- Daily Summary -->
          <tr>
            <td style="padding:24px;">
              <div style="background:#EFF6FF;border-left:4px solid #3B82F6;padding:16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
                <p style="margin:0;font-size:14px;color:#1E40AF;font-weight:600;">Daily Overview</p>
                <p style="margin:8px 0 0;font-size:14px;color:#374151;line-height:1.5;">${digest.dailySummary}</p>
              </div>

              <!-- Tasks -->
              ${prioritySections}
              ${noTasks}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 24px;background:#F9FAFB;border-top:1px solid #E5E7EB;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;">
                Analyzed ${digest.emailsAnalyzed} email${digest.emailsAnalyzed !== 1 ? "s" : ""} and ${digest.slackMessagesAnalyzed} Slack message${digest.slackMessagesAnalyzed !== 1 ? "s" : ""}
              </p>
              <p style="margin:4px 0 0;font-size:11px;color:#D1D5DB;">
                MeshSuture Daily Digest &middot; Powered by AI
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
