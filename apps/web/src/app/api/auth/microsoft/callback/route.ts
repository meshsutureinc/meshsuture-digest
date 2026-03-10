import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@meshsuture/db";
import { encrypt } from "@meshsuture/core";
import { config } from "@meshsuture/config";
import { exchangeCodeForTokens } from "@meshsuture/core/src/email-fetcher/index.js";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const appUrl = config.app.url;

  if (!code || !state) {
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=microsoft_auth_failed`
    );
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

    return NextResponse.redirect(
      `${appUrl}/dashboard?connected=microsoft`
    );
  } catch (err) {
    console.error("Microsoft OAuth callback failed:", err);
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=microsoft_auth_failed`
    );
  }
}
