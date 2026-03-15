# yawpr Setup Guide

## Prerequisites
- [Cloudflare account](https://dash.cloudflare.com) with Workers paid plan (needed for Queues)
- [Slack workspace](https://api.slack.com/apps) where you can create apps
- Node.js 18+

## 1. Set Secrets

```bash
npx wrangler secret put BETTER_AUTH_SECRET
# Paste a random 32+ character string (e.g. from `openssl rand -hex 32`)

npx wrangler secret put ENCRYPTION_KEY
# Another random 32+ character string for encrypting stored tokens
```

## 2. Create a Slack App

1. Go to https://api.slack.com/apps and click **Create New App** → **From an app manifest**
2. Select your workspace and paste the contents of `slack-app-manifest.json`
3. Replace the URLs if you're using a different domain than `yawpr.dev`

Or create manually:

### OAuth & Permissions
Under **OAuth & Permissions**:
- Add redirect URLs:
  - `https://yawpr.dev/api/auth/callback/slack`
  - `https://yawpr.dev/slack/oauth/callback`
- Bot Token Scopes: `chat:write`, `commands`, `im:write`, `users:read`, `channels:read`, `groups:read`
- User Token Scopes: `openid`, `profile`, `email`

### Slash Commands
Under **Slash Commands**, create:
- Command: `/yawp`
- Request URL: `https://yawpr.dev/slack/commands`
- Description: `Yawpr — team alerting`
- Usage hint: `fire @backend DB is down`

### Interactivity
Under **Interactivity & Shortcuts**:
- Toggle **On**
- Request URL: `https://yawpr.dev/slack/interactions`

## 3. Set Slack Secrets

```bash
npx wrangler secret put SLACK_CLIENT_ID
# Basic Information → App Credentials → Client ID

npx wrangler secret put SLACK_CLIENT_SECRET
# Basic Information → App Credentials → Client Secret
```

## 4. Set Stripe Secrets (optional)

Only needed if you want the $1M/mo checkout button to work:

```bash
npx wrangler secret put STRIPE_SECRET_KEY
# Your Stripe secret key (sk_live_... or sk_test_...)

npx wrangler secret put STRIPE_PRICE_ID
# The Stripe Price ID for the $1M/mo product
```

## 5. Deploy

```bash
npm run db:migrate:remote   # Apply D1 migrations
npm run deploy              # Deploy to Cloudflare Workers
```

## 6. Verify

1. Visit https://yawpr.dev — you should see the landing page
2. Click "Sign in with Slack" — complete the OAuth flow
3. First user: create the organization (name + slug)
4. From Settings, connect the Slack app to your workspace
5. In Slack, type `/yawp setup` to create your first team
6. Try `/yawp fire` to trigger a test incident

## Local Development

```bash
cp .dev.vars.example .dev.vars   # Fill in your secrets
npm run db:migrate               # Apply migrations locally
npm run dev                      # Start dev server
```

## ntfy.sh Setup

When members are added to a team (via `/yawp setup` or `/yawp team @slug` → Add Members), they automatically get a DM with:
1. A unique, auto-generated ntfy topic
2. Instructions to install the ntfy app and subscribe

No manual configuration needed. Fire-severity alerts bypass Do Not Disturb.

## Architecture Notes

- Single Cloudflare Worker handles HTTP (`fetch`) and queue processing (`queue`)
- Slack slash commands respond within 3 seconds — notifications are queued via Cloudflare Queues
- All incident state changes are recorded in the `incident_events` table (append-only audit log)
- Better Auth manages user sessions with Slack as the OAuth provider
- ntfy topics are auto-generated per member (`yawpr-<random hex>`) for privacy
