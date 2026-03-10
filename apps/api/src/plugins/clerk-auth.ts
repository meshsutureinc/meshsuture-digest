import { createClerkClient, verifyToken } from "@clerk/backend";
import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "@meshsuture/db";

const secretKey = process.env.CLERK_SECRET_KEY!;
console.log(`[clerk-auth] CLERK_SECRET_KEY at module load: ${secretKey ? `present (${secretKey.slice(0, 7)}...)` : "MISSING"}`);

const clerk = createClerkClient({
  secretKey,
});

export interface AuthenticatedUser {
  userId: string;
  clerkId: string;
  email: string;
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  console.log(`[clerk-auth] Authorization header: ${authHeader ? `"${authHeader.slice(0, 30)}..."` : "MISSING"}`);

  if (!authHeader?.startsWith("Bearer ")) {
    reply.code(401).send({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  console.log(`[clerk-auth] Token length: ${token.length}, prefix: ${token.slice(0, 20)}...`);

  try {
    console.log(`[clerk-auth] Calling verifyToken()...`);
    const payload = await verifyToken(token, { secretKey });
    console.log(`[clerk-auth] verifyToken succeeded, sub: ${payload.sub}, iss: ${(payload as any).iss}, exp: ${payload.exp}`);

    if (!payload.sub) {
      reply.code(401).send({ error: "Invalid token" });
      return;
    }

    // Fetch the Clerk user to get the email
    const clerkUser = await clerk.users.getUser(payload.sub);
    const email = clerkUser.emailAddresses?.[0]?.emailAddress;
    console.log(`[clerk-auth] Clerk user fetched, email: ${email}`);

    if (!email?.endsWith("@meshsuture.com")) {
      reply.code(403).send({ error: "Only @meshsuture.com emails are allowed" });
      return;
    }

    // Upsert user in our DB
    const user = await prisma.user.upsert({
      where: { clerkId: payload.sub },
      update: { email, name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null },
      create: {
        clerkId: payload.sub,
        email,
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null,
      },
    });

    (request as any).user = {
      userId: user.id,
      clerkId: user.clerkId,
      email: user.email,
    } satisfies AuthenticatedUser;
  } catch (err: any) {
    console.error(`[clerk-auth] ERROR in verifyToken:`, {
      name: err?.name,
      message: err?.message,
      code: err?.code,
      status: err?.status,
      clerkError: err?.errors,
      stack: err?.stack?.split("\n").slice(0, 5).join("\n"),
    });
    reply.code(401).send({ error: "Invalid or expired token" });
  }
}
