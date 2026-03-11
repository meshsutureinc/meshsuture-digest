"use client";

interface Task {
  title: string;
  source: "email" | "slack";
  senderName: string;
  priority: "P1" | "P2" | "P3" | "P4";
  deadline?: string;
  reason: string;
}

interface DigestResult {
  dailySummary: string;
  tasks: Task[];
  emailsAnalyzed: number;
  slackMessagesAnalyzed: number;
  sentViaEmail: boolean;
  sentViaSlack: boolean;
}

const PRIORITY_CONFIG = {
  P1: { color: "bg-red-600", label: "URGENT", border: "border-l-red-500" },
  P2: {
    color: "bg-orange-500",
    label: "IMPORTANT",
    border: "border-l-orange-400",
  },
  P3: { color: "bg-msi-cyan", label: "ROUTINE", border: "border-l-msi-cyan" },
  P4: { color: "bg-msi-gray", label: "LOW", border: "border-l-msi-gray" },
};

const PRIORITY_TITLES: Record<string, string> = {
  P1: "Urgent & Important",
  P2: "Important, Not Urgent",
  P3: "Urgent, Not Important",
  P4: "Neither Urgent nor Important",
};

function TaskCard({ task }: { task: Task }) {
  const config = PRIORITY_CONFIG[task.priority];

  return (
    <div
      className={`rounded-xl border-l-4 bg-white p-4 shadow-sm ${config.border}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide text-white ${config.color}`}
        >
          {task.priority}
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium text-msi-dark">{task.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-msi-gray">
            <span>
              {task.source === "email" ? "Email" : "Slack"} from{" "}
              {task.senderName}
            </span>
            {task.deadline && (
              <span className="text-red-600">Due: {task.deadline}</span>
            )}
          </div>
          <p className="mt-1 text-xs italic text-msi-gray">{task.reason}</p>
        </div>
      </div>
    </div>
  );
}

export function DigestPreview({ digest }: { digest: DigestResult }) {
  const tasksByPriority: Record<string, Task[]> = {
    P1: [],
    P2: [],
    P3: [],
    P4: [],
  };

  for (const task of digest.tasks) {
    tasksByPriority[task.priority]?.push(task);
  }

  return (
    <div className="space-y-6">
      {/* Delivery status */}
      <div className="flex gap-3">
        {digest.sentViaEmail && (
          <span className="rounded-full bg-msi-pale-cyan px-3 py-1 text-xs font-medium text-msi-navy">
            Sent via Email
          </span>
        )}
        {digest.sentViaSlack && (
          <span className="rounded-full bg-msi-pale-cyan px-3 py-1 text-xs font-medium text-msi-navy">
            Sent via Slack
          </span>
        )}
      </div>

      {/* Summary */}
      <div className="rounded-xl border-l-4 border-l-msi-cyan bg-msi-pale-cyan p-4">
        <p className="text-sm font-semibold text-msi-navy">Daily Overview</p>
        <p className="mt-1 text-sm text-msi-dark">{digest.dailySummary}</p>
      </div>

      {/* Tasks by priority */}
      {(["P1", "P2", "P3", "P4"] as const).map((priority) => {
        const tasks = tasksByPriority[priority];
        if (tasks.length === 0) return null;

        return (
          <div key={priority}>
            <h3 className="mb-2 text-sm font-semibold text-msi-navy">
              {priority}: {PRIORITY_TITLES[priority]} ({tasks.length})
            </h3>
            <div className="space-y-2">
              {tasks.map((task, i) => (
                <TaskCard key={i} task={task} />
              ))}
            </div>
          </div>
        );
      })}

      {digest.tasks.length === 0 && (
        <p className="text-center text-sm text-msi-gray">
          No actionable tasks found. You're all clear!
        </p>
      )}

      {/* Stats */}
      <div className="text-center text-xs text-msi-gray">
        Analyzed {digest.emailsAnalyzed} email
        {digest.emailsAnalyzed !== 1 ? "s" : ""} and{" "}
        {digest.slackMessagesAnalyzed} Slack message
        {digest.slackMessagesAnalyzed !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
