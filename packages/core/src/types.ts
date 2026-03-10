export interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  fromEmail: string;
  receivedAt: string;
  bodyPreview: string;
  importance: string;
  isRead: boolean;
}

export interface SlackMessage {
  id: string;
  channelId: string;
  channelName: string;
  text: string;
  from: string;
  fromUserId: string;
  timestamp: string;
  threadTs?: string;
  isDM: boolean;
}

export type PriorityLevel = "P1" | "P2" | "P3" | "P4";

export interface Task {
  title: string;
  source: "email" | "slack";
  senderName: string;
  priority: PriorityLevel;
  deadline?: string;
  reason: string;
}

export interface DigestResult {
  dailySummary: string;
  tasks: Task[];
  emailsAnalyzed: number;
  slackMessagesAnalyzed: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
}
