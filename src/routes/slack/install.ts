import { Hono } from "hono";
import type { Env } from "../../lib/types";
import { authGuard } from "../../middleware/auth";
import { getDb } from "../../db/client";
import { slackInstallations } from "../../db/schema";
import { buildInstallUrl, exchangeCode } from "../../lib/slack-oauth";
import { encryptSecret } from "../../lib/crypto";

const slackInstall = new Hono<Env>();

// Protected — user must be logged in and have an active org
slackInstall.use("/*", authGuard);

/** Redirect to Slack OAuth install page */
slackInstall.get("/install", (c) => {
  const orgId = c.get("orgId");
  const redirectUri = `${c.env.APP_URL}/slack/oauth/callback`;
  const state = orgId; // Pass orgId through OAuth state
  const url = buildInstallUrl(c.env.SLACK_CLIENT_ID, redirectUri, state);
  return c.redirect(url);
});

/** Handle Slack OAuth callback */
slackInstall.get("/oauth/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");

  if (error) {
    return c.redirect(`/app/settings?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return c.redirect("/app/settings?error=missing_code");
  }

  const orgId = c.get("orgId");
  if (state !== orgId) {
    return c.redirect("/app/settings?error=state_mismatch");
  }

  const redirectUri = `${c.env.APP_URL}/slack/oauth/callback`;

  try {
    const result = await exchangeCode(
      c.env.SLACK_CLIENT_ID,
      c.env.SLACK_CLIENT_SECRET,
      code,
      redirectUri
    );

    const db = getDb(c.env.DB);
    const user = c.get("user");

    // Encrypt the bot token (signing secret comes from the Slack app config,
    // not from OAuth — we'll use a placeholder that the admin sets)
    const encryptedBotToken = await encryptSecret(
      result.access_token,
      c.env.ENCRYPTION_KEY
    );

    // Upsert: if this org already has this Slack team connected, update it
    await db
      .insert(slackInstallations)
      .values({
        orgId,
        slackTeamId: result.team.id,
        slackTeamName: result.team.name,
        botToken: encryptedBotToken,
        botUserId: result.bot_user_id,
        // Signing secret must be configured separately (from Slack app settings)
        signingSecret: await encryptSecret("placeholder", c.env.ENCRYPTION_KEY),
        installedBy: user.id,
      })
      .onConflictDoUpdate({
        target: [slackInstallations.orgId, slackInstallations.slackTeamId],
        set: {
          botToken: encryptedBotToken,
          botUserId: result.bot_user_id,
          slackTeamName: result.team.name,
          installedBy: user.id,
          installedAt: new Date(),
        },
      });

    return c.redirect("/app/settings?slack=connected");
  } catch (err) {
    console.error("Slack OAuth error:", err);
    const msg =
      err instanceof Error ? err.message : "Unknown error";
    return c.redirect(`/app/settings?error=${encodeURIComponent(msg)}`);
  }
});

export { slackInstall };
