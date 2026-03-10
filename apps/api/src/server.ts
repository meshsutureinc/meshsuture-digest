import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { authRoutes } from "./routes/auth.js";
import { preferencesRoutes } from "./routes/preferences.js";
import { digestRoutes } from "./routes/digest.js";
import { healthRoutes } from "./routes/health.js";

// Log Clerk env status at startup
console.log(
  `[startup] CLERK_SECRET_KEY: ${process.env.CLERK_SECRET_KEY ? `loaded (${process.env.CLERK_SECRET_KEY.slice(0, 7)}...)` : "MISSING"}`
);

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  credentials: true,
});

// Register routes
await app.register(healthRoutes, { prefix: "/api" });
await app.register(authRoutes, { prefix: "/auth" });
await app.register(preferencesRoutes, { prefix: "/api" });
await app.register(digestRoutes, { prefix: "/api" });

const port = parseInt(process.env.API_PORT || "3001", 10);

try {
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`API server running on port ${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
