# yawpr Setup Guide

## Prerequisites
- [Cloudflare account](https://dash.cloudflare.com) with Workers paid plan
- [Slack workspace](https://api.slack.com/apps) where you can create apps
- Node.js 18+

## 1. Set Secrets

```bash
npx wrangler secret put BETTER_AUTH_SECRET    # Random 32+ char string
npx wrangler secret put ENCRYPTION_KEY        # Another random 32+ char string
```

## 2. Create a Slack App

Go to https://api.slack.com/apps → **Create New App** → **From an app manifest** → paste `slack-app-manifest.json`.

Replace URLs if not using `yawpr.dev`.

## 3. Set Slack Secrets

```bash
npx wrangler secret put SLACK_CLIENT_ID       # Basic Information → Client ID
npx wrangler secret put SLACK_CLIENT_SECRET    # Basic Information → Client Secret
```

## 4. Deploy

```bash
npm run db:migrate:remote
npm run deploy
```

## 5. First-Time Setup

1. Visit yawpr.dev → Sign in with Slack
2. Name your group (e.g. "Michigan Team")
3. Settings → Connect Slack (installs the bot)
4. In Slack: `/yawp setup` to create your first team

That's it. Your team members never need to visit the website.

## Optional: Stripe

```bash
npx wrangler secret put STRIPE_SECRET_KEY     # sk_live_... or sk_test_...
npx wrangler secret put STRIPE_PRICE_ID       # price_...
```

## Local Development

```bash
cp .dev.vars.example .dev.vars
npm run db:migrate
npm run dev
```
