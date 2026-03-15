# yawpr

Slack-first team alerting with push notifications that bypass Do Not Disturb.

## TL;DR

1. Admin signs in once at yawpr.dev, names the group, connects the Slack bot
2. Admin runs `/yawp setup` in Slack — creates teams, adds members
3. Members get a DM with push notification setup (ntfy app). They never touch the website.
4. `/yawp fire @oncall DB is down` — phones go off
5. No ack in 15 min? Auto-escalates to the full team

## How On-Call Works

No scheduling. Use teams:

- `@michigan-oncall` — whoever is on duty right now
- `@michigan-all` — the full team (escalation target)
- Set escalation: `/yawp team @michigan-oncall` → Set Escalation → `@michigan-all`
- Swap on-call: add/remove members from the on-call team. Their ntfy topic carries over.

## Bot Commands

```
/yawp                            Show all commands
/yawp setup                     Create a team + add members
/yawp teams                     List teams
/yawp team @slug                Manage team (members, escalation, rename, delete)
/yawp fire                      Trigger incident (form)
/yawp fire @team msg            Quick-fire (no form)
/yawp status                    Active incidents
/yawp history                   Recent incidents
```

## Multi-Group Support

Multiple isolated groups can share one Slack workspace. Each group admin creates their own org — Michigan, New Hampshire, etc. Members are automatically scoped to their group. Data is fully isolated.

## Stack

- Cloudflare Workers + D1 + Queues
- Hono with JSX (SSR)
- Better Auth (Slack OAuth)
- Slack Web API + [ntfy.sh](https://ntfy.sh)
- Stripe Checkout

## Development

```bash
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate
npm run dev
```

## Deployment

```bash
npm run db:migrate:remote
npm run deploy
```

See [SETUP.md](SETUP.md) for Slack app configuration and secrets.
