# yawpr

Dev team alerting — Slack-first, with push notifications that bypass Do Not Disturb.

## How It Works

1. Someone types `/yawp fire @backend Database is down` in Slack
2. Yawpr finds everyone on the `backend` team
3. Each member gets a Slack DM with Acknowledge/Resolve buttons **and** an ntfy.sh push notification
4. Fire-severity alerts bypass Do Not Disturb — no one needs Slack open 24/7

## Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono with JSX (SSR)
- **Database**: Cloudflare D1 (SQLite) + Drizzle ORM
- **Auth**: Better Auth (Slack OAuth)
- **Async**: Cloudflare Queues (notification fan-out)
- **Notifications**: Slack Web API + [ntfy.sh](https://ntfy.sh)
- **Payments**: Stripe Checkout

## Slack Bot

Everything runs through `/yawp`:

```
/yawp                              Show all commands
/yawp setup                       Create a team (wizard modal)
/yawp teams                       List all teams
/yawp team @backend               Manage team (add/remove members, rename, delete)
/yawp fire                        Trigger incident (modal with team picker + severity)
/yawp fire @backend DB is down    Quick-fire shortcut
/yawp status                      Active incidents
/yawp history                     Recent incident history
```

## Features

- **Slack-first** — setup, team management, scheduling, and incidents all through the `/yawp` bot
- **Dual-channel alerts** — Slack DMs with interactive buttons + ntfy.sh push notifications
- **Modal wizards** — team setup, incident triggering, on-call scheduling all use Slack modals
- **Auto-generated ntfy topics** — each member gets a unique, private push notification topic
- **On-call via teams** — create an `@oncall` team, move people in/out as needed
- **Webhook ingestion** — CloudWatch, Datadog, or generic JSON webhooks auto-create incidents
- **Auto-join** — first user creates the org, everyone else auto-joins on sign-in
- **Audit log** — every incident action (created, acknowledged, resolved, commented) is recorded

## Development

```bash
npm install
cp .dev.vars.example .dev.vars   # Fill in Slack credentials + auth secret
npm run db:migrate               # Apply D1 migrations locally
npm run dev                      # Start dev server
```

## Deployment

```bash
npm run deploy
```

See [SETUP.md](SETUP.md) for Slack app configuration and secret management.
