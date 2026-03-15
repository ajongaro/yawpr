# yawpr Setup Guide

## Prerequisites
- [Cloudflare account](https://dash.cloudflare.com) with Workers paid plan (needed for Queues)
- [Slack workspace](https://api.slack.com/apps) where you can create apps
- Node.js 18+

## 1. Set the Better Auth Secret

Generate a random secret and set it:

```bash
npx wrangler secret put BETTER_AUTH_SECRET
# Paste a random 32+ character string (e.g. from `openssl rand -hex 32`)
```

## 2. Create a Slack App

1. Go to https://api.slack.com/apps and click **Create New App** → **From scratch**
2. Name it `yawpr` and select your workspace

### OAuth & Permissions
Under **OAuth & Permissions**:
- Add redirect URL: `https://yawpr.aongaro.workers.dev/api/auth/callback/slack`
- Add Bot Token Scopes:
  - `chat:write` — send DMs
  - `users:read` — read user info
  - `users:read.email` — read user emails
  - `im:write` — open DM channels

### Slash Commands
Under **Slash Commands**, create:
- Command: `/fire`
- Request URL: `https://yawpr.aongaro.workers.dev/slack/commands`
- Description: `Trigger a fire alert`
- Usage hint: `<fire|info> @<team-name> <title>`

### Interactivity
Under **Interactivity & Shortcuts**:
- Toggle **On**
- Request URL: `https://yawpr.aongaro.workers.dev/slack/interactions`

### Install to Workspace
- Go to **Install App** and click **Install to Workspace**
- Copy the **Bot User OAuth Token** (starts with `xoxb-`)

## 3. Set Slack Secrets

```bash
npx wrangler secret put SLACK_CLIENT_ID
# Paste from Basic Information → App Credentials → Client ID

npx wrangler secret put SLACK_CLIENT_SECRET
# Paste from Basic Information → App Credentials → Client Secret

npx wrangler secret put SLACK_SIGNING_SECRET
# Paste from Basic Information → App Credentials → Signing Secret

npx wrangler secret put SLACK_BOT_TOKEN
# Paste the xoxb- token from Install App
```

## 4. Set ntfy.sh Base URL (optional)

Only needed if you're using a self-hosted ntfy instance:

```bash
npx wrangler secret put NTFY_BASE_URL
# Default is https://ntfy.sh if not set
```

## 5. Redeploy

After setting secrets, redeploy to pick them up:

```bash
npm run deploy
```

## 6. Verify

1. Visit https://yawpr.aongaro.workers.dev — you should see the login page
2. Click "Sign in with Slack" — complete the OAuth flow
3. Create a team, add members with Slack user IDs and/or ntfy topics
4. Set up an on-call schedule
5. Trigger a test alert from the web dashboard
6. Try `/fire info @your-team Test alert` in Slack

## Local Development

```bash
# Copy .dev.vars.example and fill in your secrets
cp .dev.vars.example .dev.vars

# Apply migrations locally
npm run db:migrate

# Start dev server
npm run dev
```

## ntfy.sh Setup for Devs

Each team member who wants push notifications:

1. Install the [ntfy app](https://ntfy.sh) on their phone/desktop
2. Subscribe to their team's topic (e.g. `yawpr-backend`)
3. Add their personal ntfy topic in the team member settings

Severity mapping:
- **fire** → Priority 5 (urgent, bypasses Do Not Disturb)
- **info** → Priority 3 (default)

## Architecture Notes

- Single Cloudflare Worker handles both HTTP (`fetch`) and queue processing (`queue`)
- Slack slash commands must respond within 3 seconds — alert notifications are queued asynchronously via Cloudflare Queues
- All alert state changes are recorded in the `alert_events` table (append-only audit log)
- Better Auth manages user sessions with Slack as the OAuth provider
