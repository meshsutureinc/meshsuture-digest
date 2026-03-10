# MeshSuture Daily Digest

AI-powered daily digest that reads Outlook emails and Slack messages, extracts actionable tasks using Claude AI, and delivers a prioritized action list via email and/or Slack DM.

## Quick Start

```bash
# Start infrastructure
docker compose up -d

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Start all services in dev mode
npm run dev
```

## Project Structure

- `apps/web` - Next.js 14 frontend (port 3000)
- `apps/api` - Fastify API server (port 3001)
- `packages/core` - Shared business logic (email fetcher, Slack fetcher, AI pipeline, renderers, encryption)
- `packages/db` - Prisma schema and database client
- `packages/config` - Shared configuration
- `workers/digest-worker` - BullMQ worker for scheduled digest delivery

## Key Commands

```bash
npm run dev:web       # Frontend only
npm run dev:api       # API only
npm run dev:worker    # Worker only
npm run db:studio     # Open Prisma Studio
npm run db:push       # Push schema changes without migration
```

## Environment

Copy `.env.example` to `.env` and fill in all values. Required services:
- PostgreSQL (port 5432) - via docker compose
- Redis (port 6379) - via docker compose
- Clerk account with @meshsuture.com domain restriction
- Azure AD app registration (single tenant)
- Slack app with bot scopes
- Anthropic API key

## Architecture

1. Clerk authenticates users (restricted to @meshsuture.com)
2. Users connect Microsoft 365 and Slack via OAuth
3. OAuth tokens encrypted with AES-256-GCM at rest
4. BullMQ schedules digest jobs weekdays at 7 AM Central
5. AI pipeline: Haiku filters noise -> Sonnet extracts/prioritizes tasks
6. Delivery via Microsoft Graph (sendMail) and/or Slack (chat.postMessage)
