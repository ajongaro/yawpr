# 🔥 mi-fire

Dev team bat signal alerting system. Dual-channel notifications (Slack DMs + ntfy.sh push) with on-call rotation management, triggerable from a Slack slash command or a web dashboard.

## How It Works

1. A fire happens — someone runs `/fire fire @backend Database is down` in Slack (or uses the web dashboard)
2. mi-fire looks up who's on the `backend` team
3. Every team member gets a Slack DM with Acknowledge/Resolve buttons **and** an ntfy.sh push notification on their phone
4. No one needs Slack open 24/7 — ntfy bypasses Do Not Disturb for fire-severity alerts

## Stack

- **Runtime**: Cloudflare Workers (single Worker)
- **Framework**: Hono with JSX (SSR)
- **Database**: Cloudflare D1 (SQLite) + Drizzle ORM
- **Auth**: Better Auth (Slack OAuth)
- **Async**: Cloudflare Queues (notification fan-out)
- **Notifications**: Slack Web API + [ntfy.sh](https://ntfy.sh)

## Features

- **Dual-channel alerts** — Slack DMs with interactive buttons + ntfy.sh push notifications
- **Slash command** — `/fire <fire|info> @<team> <title>` from any Slack channel
- **Web dashboard** — SSR pages for managing teams, schedules, and triggering alerts
- **On-call schedules** — assign rotation windows per team member
- **Audit log** — every alert action (created, acknowledged, resolved, commented) is recorded
- **Severity levels** — `fire` (priority 5, bypasses DND) and `info` (priority 3)
- **Notification tracking** — delivery status logged for every Slack DM and ntfy push

## Project Structure

```
src/
├── index.ts              # Worker entry (fetch + queue handlers)
├── db/
│   ├── schema.ts         # Drizzle tables (6 domain tables)
│   └── client.ts         # D1 connection helper
├── routes/
│   ├── api/              # REST endpoints (alerts, teams, schedules)
│   ├── slack/            # Slash command + interactions
│   ├── auth/             # Better Auth (Slack OAuth)
│   └── dashboard.tsx     # SSR page routes
├── services/
│   ├── alert.ts          # Create, acknowledge, resolve alerts
│   ├── notification.ts   # Queue producer (fan-out)
│   ├── slack.ts          # Slack Web API (DMs, interactive blocks)
│   ├── ntfy.ts           # ntfy.sh HTTP publisher
│   └── oncall.ts         # On-call schedule resolver
├── middleware/
│   ├── auth.ts           # Session guard
│   ├── slack-verify.ts   # HMAC-SHA256 signature verification
│   └── error-handler.ts
├── views/                # Hono JSX components and pages
├── queue/
│   └── consumer.ts       # Processes notification messages
└── lib/
    ├── types.ts          # Env bindings, shared types
    ├── crypto.ts         # Web Crypto helpers
    └── constants.ts
```

## Development

```bash
npm install

# Set up local secrets
cp .dev.vars.example .dev.vars
# Fill in your Slack app credentials and auth secret

# Apply D1 migrations locally
npm run db:migrate

# Start dev server
npm run dev
```

## Deployment

```bash
npm run deploy
```

See [SETUP.md](SETUP.md) for full deployment instructions including Slack app configuration and secret management.

## Slash Command Usage

```
/fire fire @backend Database is down
/fire info @platform Deployment delayed 30 min
```

Format: `/fire <severity> @<team-name> <title>`

## ntfy.sh for Devs

Team members install the [ntfy app](https://ntfy.sh) and subscribe to their team's topic. Fire-severity alerts arrive as urgent notifications that bypass Do Not Disturb.
