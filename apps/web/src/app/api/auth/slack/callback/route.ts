import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@meshsuture/db";
import { encrypt } from "@meshsuture/core";
import { config } from "@meshsuture/config";
import { lookupSlackUserId } from "@meshsuture/core/src/slack-fetcher/index.js";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const appUrl = config.app.url;

  if (!code || !state) {
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=slack_auth_failed`
    );
  }

  try {
    const { userId } = JSON.parse(
      Buffer.from(state, "base64url").toString()
    );

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
    const userAccessToken =
      tokenData.authed_user?.access_token || botToken;

    const encryptedBotToken = encrypt(botToken);

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

    return NextResponse.redirect(
      `${appUrl}/dashboard?connected=slack`
    );
  } catch (err) {
    console.error("Slack OAuth callback failed:", err);
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=slack_auth_failed`
    );
  }
}
