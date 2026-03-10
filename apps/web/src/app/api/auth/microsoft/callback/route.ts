import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@meshsuture/db";
import { encrypt, exchangeCodeForTokens } from "@meshsuture/core";
import { config } from "@meshsuture/config";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const appUrl = config.app.url;

  if (!code || !state) {
    console.error("[Microsoft OAuth] Missing code or state param", {
      hasCode: !!code,
      hasState: !!state,
    });
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=microsoft_missing_params`
    );
  }

  let userId: string;
  try {
    const decoded = JSON.parse(
      Buffer.from(state, "base64url").toString()
    );
    userId = decoded.userId;
    console.log("[Microsoft OAuth] Decoded state for user:", userId);
  } catch (err) {
    console.error("[Microsoft OAuth] Failed to decode state:", err);
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=microsoft_invalid_state`
    );
  }

  let tokens;
  try {
    console.log("[Microsoft OAuth] Exchanging code for tokens...");
    tokens = await exchangeCodeForTokens(code, config.azure.redirectUri);
    console.log("[Microsoft OAuth] Token exchange successful, expires:", tokens.expiresAt);
  } catch (err) {
    console.error("[Microsoft OAuth] Token exchange failed:", err);
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=microsoft_token_exchange_failed`
    );
  }

  let encryptedAccessToken: string;
  let encryptedRefreshToken: string;
  try {
    console.log("[Microsoft OAuth] Encrypting tokens...");
    encryptedAccessToken = encrypt(tokens.accessToken);
    encryptedRefreshToken = encrypt(tokens.refreshToken);
    console.log("[Microsoft OAuth] Encryption successful");
  } catch (err) {
    console.error("[Microsoft OAuth] Encryption failed:", err);
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=microsoft_encryption_failed`
    );
  }

  try {
    console.log("[Microsoft OAuth] Upserting token to database...");
    await prisma.microsoftToken.upsert({
      where: { userId },
      update: {
        encryptedAccessToken,
        encryptedRefreshToken,
        expiresAt: tokens.expiresAt,
        scopes: config.azure.scopes.join(" "),
      },
      create: {
        userId,
        encryptedAccessToken,
        encryptedRefreshToken,
        expiresAt: tokens.expiresAt,
        scopes: config.azure.scopes.join(" "),
      },
    });
    console.log("[Microsoft OAuth] Database upsert successful");
  } catch (err) {
    console.error("[Microsoft OAuth] Database upsert failed:", err);
    return NextResponse.redirect(
      `${appUrl}/dashboard?error=microsoft_db_failed`
    );
  }

  return NextResponse.redirect(
    `${appUrl}/dashboard?connected=microsoft`
  );
}
