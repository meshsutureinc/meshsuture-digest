import { NextRequest, NextResponse } from "next/server";
import { config } from "@meshsuture/config";
import { authenticateFromQuery } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const result = await authenticateFromQuery(request);
  if (result instanceof NextResponse) return result;

  const state = Buffer.from(
    JSON.stringify({ userId: result.userId })
  ).toString("base64url");

  const params = new URLSearchParams({
    client_id: config.slack.clientId,
    scope: config.slack.botScopes.join(","),
    redirect_uri: config.slack.redirectUri,
    state,
  });

  return NextResponse.redirect(
    `https://slack.com/oauth/v2/authorize?${params.toString()}`
  );
}
