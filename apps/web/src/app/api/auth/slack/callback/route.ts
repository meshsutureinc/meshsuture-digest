import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@meshsuture/db";
import { encrypt } from "@meshsuture/core";
import { config } from "@meshsuture/config";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const appUrl = config.app.url;

  if (!code || !state) {
    console.error("[Slack OAuth] Missing code or state param", {
      hasCode: !!code,
      hasState: !!state,
    });
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=slack_missing_params`
    );
  }

  let userId: string;
  try {
    const decoded = JSON.parse(
      Buffer.from(state, "base64url").toString()
    );
    userId = decoded.userId;
    console.log("[Slack OAuth] Decoded state for user:", userId);
  } catch (err) {
    console.error("[Slack OAuth] Failed to decode state:", err);
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=slack_invalid_state`
    );
  }

  let tokenData: any;
  try {
    console.log("[Slack OAuth] Exchanging code for tokens...");
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

    tokenData = await tokenResponse.json();
    console.log("[Slack OAuth] Token response ok:", tokenData.ok, "error:", tokenData.error);

    if (!tokenData.ok) {
      throw new Error(`Slack API error: ${tokenData.error}`);
    }
  } catch (err) {
    console.error("[Slack OAuth] Token exchange failed:", err);
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=slack_token_exchange_failed`
    );
  }

  const botToken = tokenData.access_token;
  const teamId = tokenData.team?.id || "";
  const teamName = tokenData.team?.name || "";
  const userAccessToken =
    tokenData.authed_user?.access_token || botToken;

  let encryptedBotToken: string;
  let encryptedUserToken: string;
  try {
    console.log("[Slack OAuth] Encrypting tokens...");
    encryptedBotToken = encrypt(botToken);
    encryptedUserToken = encrypt(userAccessToken);
    console.log("[Slack OAuth] Encryption successful");
  } catch (err) {
    console.error("[Slack OAuth] Encryption failed:", err);
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=slack_encryption_failed`
    );
  }

  // Get the Slack user ID directly from the OAuth response
  const slackUserId: string | null = tokenData.authed_user?.id || null;
  console.log("[Slack OAuth] Slack user ID from OAuth response:", slackUserId);

  try {
    console.log("[Slack OAuth] Upserting token to database...");
    await prisma.slackToken.upsert({
      where: { userId },
      update: {
        encryptedAccessToken: encryptedUserToken,
        encryptedBotToken: encryptedBotToken,
        teamId,
        teamName,
        slackUserId,
      },
      create: {
        userId,
        encryptedAccessToken: encryptedUserToken,
        encryptedBotToken: encryptedBotToken,
        teamId,
        teamName,
        slackUserId,
      },
    });
    console.log("[Slack OAuth] Database upsert successful");
  } catch (err) {
    console.error("[Slack OAuth] Database upsert failed:", err);
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=slack_db_failed`
    );
  }

  return NextResponse.redirect(
    `${appUrl}/dashboard?connected=slack`
  );
}
