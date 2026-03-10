import type { FastifyInstance } from "fastify";
import { prisma } from "@meshsuture/db";
import { encrypt } from "@meshsuture/core";
import { config } from "@meshsuture/config";
import {
  getAuthorizationUrl,
  exchangeCodeForTokens,
} from "@meshsuture/core/src/email-fetcher/index.js";
import { lookupSlackUserId } from "@meshsuture/core/src/slack-fetcher/index.js";
import { requireAuth } from "../plugins/clerk-auth.js";
import type { AuthenticatedUser } from "../plugins/clerk-auth.js";

export async function authRoutes(app: FastifyInstance) {
  // Microsoft OAuth - initiate (browser redirect, token in query param)
  app.get("/microsoft", async (request, reply) => {
    const { token } = request.query as { token?: string };
    if (!token) {
      reply.code(401).send({ error: "Missing token" });
      return;
    }

    // Temporarily set Authorization header so requireAuth works
    request.headers.authorization = `Bearer ${token}`;
    await requireAuth(request, reply);
    if (reply.sent) return;

    const url = getAuthorizationUrl(config.azure.redirectUri);
    const user = (request as any).user as AuthenticatedUser;

    const state = Buffer.from(
      JSON.stringify({ userId: user.userId })
    ).toString("base64url");

    const fullUrl = `${url}&state=${state}`;
    reply.redirect(fullUrl);
  });

  // Microsoft OAuth - callback
  app.get("/microsoft/callback", async (request, reply) => {
    const { code, state } = request.query as {
      code?: string;
      state?: string;
    };

    if (!code || !state) {
      reply.redirect(
        `${config.app.url}/dashboard?error=microsoft_auth_failed`
      );
      return;
    }

    try {
      const { userId } = JSON.parse(
        Buffer.from(state, "base64url").toString()
      );

      const tokens = await exchangeCodeForTokens(
        code,
        config.azure.redirectUri
      );

      await prisma.microsoftToken.upsert({
        where: { userId },
        update: {
          encryptedAccessToken: encrypt(tokens.accessToken),
          encryptedRefreshToken: encrypt(tokens.refreshToken),
          expiresAt: tokens.expiresAt,
          scopes: config.azure.scopes.join(" "),
        },
        create: {
          userId,
          encryptedAccessToken: encrypt(tokens.accessToken),
          encryptedRefreshToken: encrypt(tokens.refreshToken),
          expiresAt: tokens.expiresAt,
          scopes: config.azure.scopes.join(" "),
        },
      });

      reply.redirect(`${config.app.url}/dashboard?connected=microsoft`);
    } catch (err) {
      request.log.error(err, "Microsoft OAuth callback failed");
      reply.redirect(
        `${config.app.url}/dashboard?error=microsoft_auth_failed`
      );
    }
  });

  // Slack OAuth - initiate (browser redirect, token in query param)
  app.get("/slack", async (request, reply) => {
    const { token } = request.query as { token?: string };
    if (!token) {
      reply.code(401).send({ error: "Missing token" });
      return;
    }

    request.headers.authorization = `Bearer ${token}`;
    await requireAuth(request, reply);
    if (reply.sent) return;

    const user = (request as any).user as AuthenticatedUser;
    const state = Buffer.from(
      JSON.stringify({ userId: user.userId })
    ).toString("base64url");

    const params = new URLSearchParams({
      client_id: config.slack.clientId,
      scope: config.slack.botScopes.join(","),
      redirect_uri: config.slack.redirectUri,
      state,
    });

    reply.redirect(
      `https://slack.com/oauth/v2/authorize?${params.toString()}`
    );
  });

  // Slack OAuth - callback
  app.get("/slack/callback", async (request, reply) => {
    const { code, state } = request.query as {
      code?: string;
      state?: string;
    };

    if (!code || !state) {
      reply.redirect(
        `${config.app.url}/dashboard?error=slack_auth_failed`
      );
      return;
    }

    try {
      const { userId } = JSON.parse(
        Buffer.from(state, "base64url").toString()
      );

      // Exchange code for token
      const tokenResponse = await fetch(
        "https://slack.com/api/oauth.v2.access",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: config.slack.clientId,
            client_secret: config.slack.clientSecret,
            code,
            redirect_uri: config.slack.redirectUri,
          }),
        }
      );

      const tokenData = (await tokenResponse.json()) as any;

      if (!tokenData.ok) {
        throw new Error(`Slack OAuth error: ${tokenData.error}`);
      }

      const botToken = tokenData.access_token;
      const teamId = tokenData.team?.id || "";
      const teamName = tokenData.team?.name || "";
      const userAccessToken = tokenData.authed_user?.access_token || botToken;

      // Encrypt and store tokens
      const encryptedBotToken = encrypt(botToken);

      // Look up the user's Slack ID
      const user = await prisma.user.findUnique({ where: { id: userId } });
      let slackUserId: string | null = null;
      if (user?.email) {
        slackUserId = await lookupSlackUserId(encryptedBotToken, user.email);
      }

      await prisma.slackToken.upsert({
        where: { userId },
        update: {
          encryptedAccessToken: encrypt(userAccessToken),
          encryptedBotToken: encryptedBotToken,
          teamId,
          teamName,
          slackUserId,
        },
        create: {
          userId,
          encryptedAccessToken: encrypt(userAccessToken),
          encryptedBotToken: encryptedBotToken,
          teamId,
          teamName,
          slackUserId,
        },
      });

      reply.redirect(`${config.app.url}/dashboard?connected=slack`);
    } catch (err) {
      request.log.error(err, "Slack OAuth callback failed");
      reply.redirect(
        `${config.app.url}/dashboard?error=slack_auth_failed`
      );
    }
  });

  // Get connection status
  app.get(
    "/status",
    { preHandler: requireAuth },
    async (request) => {
      const user = (request as any).user as AuthenticatedUser;

      const [msToken, slackToken] = await Promise.all([
        prisma.microsoftToken.findUnique({ where: { userId: user.userId } }),
        prisma.slackToken.findUnique({ where: { userId: user.userId } }),
      ]);

      return {
        microsoft: {
          connected: !!msToken,
          expiresAt: msToken?.expiresAt || null,
        },
        slack: {
          connected: !!slackToken,
          teamName: slackToken?.teamName || null,
        },
      };
    }
  );
}
