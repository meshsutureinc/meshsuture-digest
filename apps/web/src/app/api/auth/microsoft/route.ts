import { NextRequest, NextResponse } from "next/server";
import { config } from "@meshsuture/config";
import { getAuthorizationUrl } from "@meshsuture/core/src/email-fetcher/index.js";
import { authenticateFromQuery } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const result = await authenticateFromQuery(request);
  if (result instanceof NextResponse) return result;

  const url = getAuthorizationUrl(config.azure.redirectUri);
  const state = Buffer.from(
    JSON.stringify({ userId: result.userId })
  ).toString("base64url");

  return NextResponse.redirect(`${url}&state=${state}`);
}
