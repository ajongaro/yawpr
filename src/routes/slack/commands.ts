import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import type { Env } from "../../lib/types";
import { slackVerify } from "../../middleware/slack-verify";
import { getDb } from "../../db/client";
import { teams } from "../../db/schema";
import { createIncident } from "../../services/incident";
import { decryptSecret } from "../../lib/crypto";
import { SEVERITY_EMOJI } from "../../lib/constants";

const slackCommands = new Hono<Env>();

slackCommands.use("/*", slackVerify);

slackCommands.post("/", async (c) => {
  const rawBody = c.get("rawBody");
  const params = new URLSearchParams(rawBody);
  const text = params.get("text") || "";
  const userId = params.get("user_id") || "";

  const installation = c.get("slackInstallation");
  const orgId = installation.orgId;

  // Parse: <severity> <team-slug> <title>
  const match = text.match(/^(fire|warning|info)\s+@?(\S+)\s+(.+)$/i);
  if (!match) {
    return c.json({
      response_type: "ephemeral",
      text: "Usage: `/yawp <fire|warning|info> @<team-slug> <message>`\nExample: `/yawp fire @backend Check Slack — DB is down`",
    });
  }

  const [, severity, teamSlug, title] = match;
  const db = getDb(c.env.DB);

  const [team] = await db
    .select()
    .from(teams)
    .where(
      and(eq(teams.orgId, orgId), eq(teams.slug, teamSlug.toLowerCase()))
    );

  if (!team) {
    return c.json({
      response_type: "ephemeral",
      text: `Team "${teamSlug}" not found. Create it at ${c.env.APP_URL}/app/teams first.`,
    });
  }

  const botToken = await decryptSecret(
    installation.botToken,
    c.env.ENCRYPTION_KEY
  );

  const incident = await createIncident(
    db,
    c.env.NOTIFICATION_QUEUE,
    c.env.APP_URL,
    {
      orgId,
      teamId: team.id,
      severity: severity.toLowerCase() as "fire" | "warning" | "info",
      title,
      source: "slack",
      createdBy: userId,
      botToken,
    }
  );

  const emoji = SEVERITY_EMOJI[severity.toLowerCase()] || "ℹ️";

  // Post a rich message in the channel with ack/resolve buttons
  return c.json({
    response_type: "in_channel",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${emoji} *${title}*\nTeam: *${team.name}* | Triggered by <@${userId}>`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Acknowledge" },
            style: "primary",
            action_id: "ack_incident",
            value: incident.id,
          },
          {
            type: "button",
            text: { type: "plain_text", text: "Resolve" },
            action_id: "resolve_incident",
            value: incident.id,
          },
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Status: *active* | <${c.env.APP_URL}/app/incidents/${incident.id}|View in dashboard>`,
          },
        ],
      },
    ],
    text: `${emoji} ${title} — team ${team.name}`,
  });
});

export { slackCommands };
