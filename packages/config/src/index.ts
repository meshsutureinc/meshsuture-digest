const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const config = {
  azure: {
    clientId: process.env.AZURE_CLIENT_ID!,
    clientSecret: process.env.AZURE_CLIENT_SECRET!,
    tenantId: process.env.AZURE_TENANT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    scopes: ["Mail.Read", "Mail.Send", "User.Read", "offline_access"],
    redirectUri: `${appUrl}/api/auth/microsoft/callback`,
  },
  slack: {
    clientId: process.env.SLACK_CLIENT_ID!,
    clientSecret: process.env.SLACK_CLIENT_SECRET!,
    signingSecret: process.env.SLACK_SIGNING_SECRET!,
    botToken: process.env.SLACK_BOT_TOKEN!,
    botScopes: [
      "channels:history",
      "channels:read",
      "groups:history",
      "groups:read",
      "im:history",
      "im:read",
      "mpim:history",
      "mpim:read",
      "users:read",
      "chat:write",
      "im:write",
    ],
    redirectUri: `${appUrl}/api/auth/slack/callback`,
  },
  app: {
    url: appUrl,
  },
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },
} as const;
