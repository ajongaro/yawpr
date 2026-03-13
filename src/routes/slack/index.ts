import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { Env } from "../../lib/types";
import { slackVerify } from "../../middleware/slack-verify";
import { getDb } from "../../db/client";
import { teams, teamMembers } from "../../db/schema";
import { createAlert, acknowledgeAlert, resolveAlert } from "../../services/alert";

const slackRoutes = new Hono<Env>();

// All Slack routes need signature verification
slackRoutes.use("/*", slackVerify);

/**
 * Slash command handler: /fire <severity> @<team> <title>
 * Example: /fire fire @backend Database is down
 */
slackRoutes.post("/commands", async (c) => {
  const rawBody = c.get("rawBody" as never) as string;
  const params = new URLSearchParams(rawBody);
  const text = params.get("text") || "";
  const userId = params.get("user_id") || "";

  // Parse: <severity> <team-name> <title>
  const match = text.match(/^(fire|info)\s+@?(\S+)\s+(.+)$/i);
  if (!match) {
    return c.json({
      response_type: "ephemeral",
      text: "Usage: `/fire <fire|info> @<team-name> <title>`\nExample: `/fire fire @backend Database is down`",
    });
  }

  const [, severity, teamName, title] = match;
  const db = getDb(c.env.DB);

  // Find the team
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.name, teamName.toLowerCase()));

  if (!team) {
    return c.json({
      response_type: "ephemeral",
      text: `Team "${teamName}" not found. Create it in the dashboard first.`,
    });
  }

  // Create the alert (async notifications handled via queue)
  const alert = await createAlert(
    db,
    c.env.NOTIFICATION_QUEUE,
    c.env.APP_URL,
    {
      teamId: team.id,
      severity: severity.toLowerCase() as "fire" | "info",
      title,
      source: "slack",
      createdBy: userId,
    }
  );

  const emoji = severity.toLowerCase() === "fire" ? "🔥" : "ℹ️";

  return c.json({
    response_type: "in_channel",
    text: `${emoji} Alert created for team *${teamName}*: ${title}\n<${c.env.APP_URL}/alerts/${alert.id}|View in Dashboard>`,
  });
});

/**
 * Interactive message handler (button clicks: Acknowledge, Resolve)
 */
slackRoutes.post("/interactions", async (c) => {
  const rawBody = c.get("rawBody" as never) as string;
  const params = new URLSearchParams(rawBody);
  const payloadStr = params.get("payload");
  if (!payloadStr) return c.json({ error: "No payload" }, 400);

  const payload = JSON.parse(payloadStr);
  const action = payload.actions?.[0];
  if (!action) return c.json({ error: "No action" }, 400);

  const alertId = action.value;
  const slackUserId = payload.user?.id || "";
  const db = getDb(c.env.DB);

  // Find the user's member ID from their Slack ID
  const [member] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.slackUserId, slackUserId));
  const actorId = member?.userId || slackUserId;

  if (action.action_id === "ack_alert") {
    await acknowledgeAlert(db, alertId, actorId);
    return c.json({
      replace_original: true,
      text: `✅ Alert acknowledged by <@${slackUserId}>`,
    });
  }

  if (action.action_id === "resolve_alert") {
    await resolveAlert(db, alertId, actorId);
    return c.json({
      replace_original: true,
      text: `🔧 Alert resolved by <@${slackUserId}>`,
    });
  }

  return c.json({ ok: true });
});

export { slackRoutes };
