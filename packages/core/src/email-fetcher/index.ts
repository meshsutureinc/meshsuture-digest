import {
  ConfidentialClientApplication,
  type Configuration,
} from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";
import { decrypt } from "../encryption/index";
import type { EmailMessage, TimeRange } from "../types";

const SCOPES = ["Mail.Read", "Mail.Send", "User.Read", "offline_access"];

function getMsalConfig(): Configuration {
  return {
    auth: {
      clientId: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
      authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    },
  };
}

export function getMsalClient(): ConfidentialClientApplication {
  return new ConfidentialClientApplication(getMsalConfig());
}

export function getAuthorizationUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.AZURE_CLIENT_ID!,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES.join(" "),
    response_mode: "query",
    prompt: "consent",
  });
  return `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  const msalClient = getMsalClient();
  const result = await msalClient.acquireTokenByCode({
    code,
    scopes: SCOPES,
    redirectUri,
  });

  if (!result) {
    throw new Error("Failed to acquire Microsoft token");
  }

  // Extract refresh token from the MSAL cache
  const cache = msalClient.getTokenCache().serialize();
  const cacheData = JSON.parse(cache);
  const refreshTokens = cacheData.RefreshToken || {};
  const refreshTokenEntry = Object.values(refreshTokens)[0] as
    | { secret: string }
    | undefined;

  return {
    accessToken: result.accessToken,
    refreshToken: refreshTokenEntry?.secret || "",
    expiresAt: result.expiresOn || new Date(Date.now() + 3600 * 1000),
  };
}

export async function refreshAccessToken(
  encryptedRefreshToken: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  const refreshToken = decrypt(encryptedRefreshToken);
  const msalClient = getMsalClient();

  // Load refresh token into MSAL cache
  const fakeCache = {
    RefreshToken: {
      key: {
        secret: refreshToken,
        home_account_id: "fake",
        environment: "login.microsoftonline.com",
        credential_type: "RefreshToken",
        client_id: process.env.AZURE_CLIENT_ID!,
      },
    },
    Account: {},
    AccessToken: {},
    IdToken: {},
    AppMetadata: {},
  };

  msalClient.getTokenCache().deserialize(JSON.stringify(fakeCache));

  const result = await msalClient.acquireTokenSilent({
    scopes: SCOPES,
    account: undefined as any,
    forceRefresh: true,
  });

  if (!result) {
    throw new Error("Failed to refresh Microsoft token");
  }

  const cache = msalClient.getTokenCache().serialize();
  const cacheData = JSON.parse(cache);
  const refreshTokens = cacheData.RefreshToken || {};
  const refreshTokenEntry = Object.values(refreshTokens)[0] as
    | { secret: string }
    | undefined;

  return {
    accessToken: result.accessToken,
    refreshToken: refreshTokenEntry?.secret || refreshToken,
    expiresAt: result.expiresOn || new Date(Date.now() + 3600 * 1000),
  };
}

function getGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

export async function fetchEmails(
  accessToken: string,
  timeRange: TimeRange
): Promise<EmailMessage[]> {
  const client = getGraphClient(accessToken);

  const startISO = timeRange.start.toISOString();
  const endISO = timeRange.end.toISOString();

  const response = await client
    .api("/me/messages")
    .filter(
      `receivedDateTime ge ${startISO} and receivedDateTime lt ${endISO}`
    )
    .select(
      "id,subject,from,receivedDateTime,bodyPreview,importance,isRead"
    )
    .orderby("receivedDateTime desc")
    .top(200)
    .get();

  const messages: EmailMessage[] = (response.value || []).map(
    (msg: any) => ({
      id: msg.id,
      subject: msg.subject || "(no subject)",
      from: msg.from?.emailAddress?.name || "Unknown",
      fromEmail: msg.from?.emailAddress?.address || "",
      receivedAt: msg.receivedDateTime,
      bodyPreview: (msg.bodyPreview || "").substring(0, 500),
      importance: msg.importance || "normal",
      isRead: msg.isRead ?? false,
    })
  );

  return messages;
}

export async function sendEmailViaMSGraph(
  accessToken: string,
  toEmail: string,
  subject: string,
  htmlBody: string
): Promise<void> {
  const client = getGraphClient(accessToken);

  await client.api("/me/sendMail").post({
    message: {
      subject,
      body: {
        contentType: "HTML",
        content: htmlBody,
      },
      toRecipients: [
        {
          emailAddress: {
            address: toEmail,
          },
        },
      ],
    },
    saveToSentItems: true,
  });
}
