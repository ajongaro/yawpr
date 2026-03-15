import { Hono } from "hono";
import { eq, and, desc, ne } from "drizzle-orm";
import type { Env } from "../../lib/types";
import { slackVerify } from "../../middleware/slack-verify";
import { getDb } from "../../db/client";
import { teams, members, incidents } from "../../db/schema";
import { createIncident } from "../../services/incident";
import { decryptSecret } from "../../lib/crypto";
import { SEVERITY_EMOJI } from "../../lib/constants";
import { openSetupWizard, openFireModal } from "./setup-wizard";
import { openTeamManageModal, openHistoryModal } from "./modals";

const slackCommands = new Hono<Env>();

slackCommands.use("/*", slackVerify);

slackCommands.post("/", async (c) => {
  const rawBody = c.get("rawBody");
  const params = new URLSearchParams(rawBody);
  const text = (params.get("text") || "").trim();
  const userId = params.get("user_id") || "";
  const triggerId = params.get("trigger_id") || "";

  const installation = c.get("slackInstallation");
  const orgId = installation.orgId;
  const db = getDb(c.env.DB);

  const getBotToken = () =>
    decryptSecret(installation.botToken, c.env.ENCRYPTION_KEY);

  // Split into subcommand + args
  const parts = text.split(/\s+/);
  const subcommand = (parts[0] || "").toLowerCase();

  // ─── /yawp (no args) — help ─────────────────────────────
  if (!text) {
    return c.json({
      response_type: "ephemeral",
      text: [
        "*Yawpr Commands:*",
        "",
        "*Setup & Teams*",
        "`/yawp setup` — Create a new team (wizard)",
        "`/yawp teams` — List all teams",
        "`/yawp team @slug` — Manage team (add/remove members, rename, delete)",
        "",
        "*Incidents*",
        "`/yawp fire` — Trigger an incident (opens form)",
        "`/yawp fire @slug <message>` — Quick-fire an incident",
        "`/yawp status` — Show active incidents",
        "`/yawp history` — Recent incident history",
        "",
        "*Account*",
        "`/yawp mytopic` — DM yourself your ntfy push notification topic",
      ].join("\n"),
    });
  }

  // ─── /yawp setup — wizard modal ─────────────────────────
  if (subcommand === "setup") {
    const botToken = await getBotToken();
    await openSetupWizard(botToken, triggerId, orgId);
    return c.json({
      response_type: "ephemeral",
      text: "Opening setup wizard...",
    });
  }

  // ─── /yawp mytopic — DM yourself your ntfy topic ────────
  if (subcommand === "mytopic") {
    const [member] = await db
      .select()
      .from(members)
      .where(
        and(eq(members.orgId, orgId), eq(members.slackUserId, userId))
      )
      .limit(1);

    if (!member?.ntfyTopic) {
      return c.json({
        response_type: "ephemeral",
        text: "You don't have an ntfy topic yet. Ask your team admin to add you to a team.",
      });
    }

    const botToken = await getBotToken();
    const { sendSlackDM } = await import("../../services/slack");
    await sendSlackDM(
      botToken,
      userId,
      `Your ntfy topic: \`${member.ntfyTopic}\`\n\nSubscribe to this in the <https://ntfy.sh|ntfy app> to get push notifications.`
    );

    return c.json({
      response_type: "ephemeral",
      text: "Check your DMs — I sent you your ntfy topic.",
    });
  }

  // ─── /yawp fire|warning|info (no args) — open fire modal ─
  if (
    ["fire", "warning", "info"].includes(subcommand) &&
    parts.length === 1
  ) {
    const botToken = await getBotToken();
    await openFireModal(botToken, triggerId, orgId, subcommand, db);
    return c.json({
      response_type: "ephemeral",
      text: "Opening incident form...",
    });
  }

  // ─── /yawp teams — list all teams ───────────────────────
  if (subcommand === "teams") {
    const allTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.orgId, orgId));

    if (allTeams.length === 0) {
      return c.json({
        response_type: "ephemeral",
        text: "No teams yet. Run `/yawp setup` to create one.",
      });
    }

    const lines = allTeams.map((t) => `• *${t.name}* (\`@${t.slug}\`)`);
    return c.json({
      response_type: "ephemeral",
      text: `*Your teams:*\n${lines.join("\n")}`,
    });
  }

  // ─── /yawp team @slug — open team management modal ─────
  if (subcommand === "team") {
    const teamSlug = (parts[1] || "").replace(/^@/, "").toLowerCase();
    if (!teamSlug) {
      return c.json({
        response_type: "ephemeral",
        text: "Usage: `/yawp team @<slug>`\nRun `/yawp teams` to see all teams.",
      });
    }

    const [team] = await db
      .select()
      .from(teams)
      .where(and(eq(teams.orgId, orgId), eq(teams.slug, teamSlug)));

    if (!team) {
      return c.json({
        response_type: "ephemeral",
        text: `Team \`@${teamSlug}\` not found. Run \`/yawp teams\` to see available teams.`,
      });
    }

    const botToken = await getBotToken();
    await openTeamManageModal(botToken, triggerId, orgId, team.id, db);
    return c.json({
      response_type: "ephemeral",
      text: `Opening *${team.name}* management...`,
    });
  }

  // ─── /yawp status — active incidents ────────────────────
  if (subcommand === "status") {
    const active = await db
      .select({
        incident: incidents,
        team: teams,
      })
      .from(incidents)
      .innerJoin(teams, eq(incidents.teamId, teams.id))
      .where(
        and(
          eq(incidents.orgId, orgId),
          ne(incidents.status, "resolved")
        )
      )
      .orderBy(desc(incidents.createdAt))
      .limit(10);

    if (active.length === 0) {
      return c.json({
        response_type: "ephemeral",
        text: "No active incidents. All clear!",
      });
    }

    const lines = active.map((r) => {
      const emoji = SEVERITY_EMOJI[r.incident.severity] || "ℹ️";
      const status =
        r.incident.status === "acknowledged" ? "ack'd" : r.incident.status;
      return `${emoji} *${r.incident.title}* — @${r.team.slug} [${status}]`;
    });

    return c.json({
      response_type: "ephemeral",
      text: `*Active incidents:*\n${lines.join("\n")}`,
    });
  }

  // ─── /yawp history — incident history modal ─────────────
  if (subcommand === "history") {
    const botToken = await getBotToken();
    await openHistoryModal(botToken, triggerId, orgId, c.env.APP_URL, db);
    return c.json({
      response_type: "ephemeral",
      text: "Opening incident history...",
    });
  }

  // ─── /yawp <severity> @team <message> — trigger incident
  const incidentMatch = text.match(
    /^(fire|warning|info)\s+@?(\S+)\s+(.+)$/i
  );
  if (incidentMatch) {
    const [, severity, teamSlug, title] = incidentMatch;
    const [team] = await db
      .select()
      .from(teams)
      .where(
        and(eq(teams.orgId, orgId), eq(teams.slug, teamSlug.toLowerCase()))
      );

    if (!team) {
      return c.json({
        response_type: "ephemeral",
        text: `Team \`@${teamSlug}\` not found. Run \`/yawp teams\` to see available teams.`,
      });
    }

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
      }
    );

    const emoji = SEVERITY_EMOJI[severity.toLowerCase()] || "ℹ️";

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
  }

  // ─── Unrecognized — show help hint ──────────────────────
  return c.json({
    response_type: "ephemeral",
    text: `Unknown command. Run \`/yawp\` to see all available commands.`,
  });
});

export { slackCommands };
