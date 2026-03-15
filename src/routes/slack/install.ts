import { Hono } from "hono";
import type { Env } from "../../lib/types";
import { authGuard } from "../../middleware/auth";
import { getDb } from "../../db/client";
import { slackInstallations } from "../../db/schema";
import { buildInstallUrl, exchangeCode } from "../../lib/slack-oauth";
import { encryptSecret } from "../../lib/crypto";
import { getCookie, setCookie } from "hono/cookie";

const slackInstall = new Hono<Env>();

// Protected — user must be logged in and have an active org
slackInstall.use("/*", authGuard);

/** Redirect to Slack OAuth install page */
slackInstall.get("/install", (c) => {
  const orgId = c.get("orgId");
  const redirectUri = `${c.env.APP_URL}/slack/oauth/callback`;

  // Generate a random CSRF nonce and store orgId + nonce in a cookie
  const nonce = crypto.randomUUID();
  const state = `${orgId}:${nonce}`;
  setCookie(c, "slack_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

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

  // Verify state matches the cookie we set
  const savedState = getCookie(c, "slack_oauth_state");
  if (!savedState || state !== savedState) {
    return c.redirect("/app/settings?error=state_mismatch");
  }

  // Clear the cookie
  setCookie(c, "slack_oauth_state", "", { maxAge: 0, path: "/" });

  const orgId = c.get("orgId");
  // Verify the orgId in the state matches the session's active org
  const stateOrgId = state.split(":")[0];
  if (stateOrgId !== orgId) {
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

    const encryptedBotToken = await encryptSecret(
      result.access_token,
      c.env.ENCRYPTION_KEY
    );

    await db
      .insert(slackInstallations)
      .values({
        orgId,
        slackTeamId: result.team.id,
        slackTeamName: result.team.name,
        botToken: encryptedBotToken,
        botUserId: result.bot_user_id,
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
    return c.redirect("/app/settings?error=oauth_failed");
  }
});

export { slackInstall };
