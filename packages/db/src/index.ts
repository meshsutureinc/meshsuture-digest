import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export { PrismaClient, Prisma } from "@prisma/client";

// Model types (type-only, no runtime value)
export type {
  User,
  Digest,
  MicrosoftToken,
  SlackToken,
} from ".prisma/client";

// Enum types + runtime values
export {
  NotificationPreference,
  SummaryWindowPreset,
} from ".prisma/client";
