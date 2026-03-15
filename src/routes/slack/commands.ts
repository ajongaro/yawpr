import { Hono } from "hono";
import { eq, and, desc, ne } from "drizzle-orm";
import type { Env } from "../../lib/types";
import { slackVerify } from "../../middleware/slack-verify";
import { getDb } from "../../db/client";
import { teams, members, schedules, incidents } from "../../db/schema";
import { createIncident } from "../../services/incident";
import { decryptSecret, generateNtfyTopic } from "../../lib/crypto";
import { SEVERITY_EMOJI } from "../../lib/constants";
import { getOnCall } from "../../services/oncall";
import { openSetupWizard } from "./setup-wizard";
import { sendSlackDM } from "../../services/slack";

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
        "`/yawp team @slug` — View team details",
        "`/yawp team @slug add @user` — Add someone to a team",
        "`/yawp team @slug remove @user` — Remove someone from a team",
        "",
        "*On-Call*",
        "`/yawp oncall @slug` — Who's on call right now?",
        "`/yawp oncall @slug @user <start> <end>` — Schedule on-call",
        "",
        "*Incidents*",
        "`/yawp fire @slug <message>` — Trigger a fire incident",
        "`/yawp warning @slug <message>` — Trigger a warning",
        "`/yawp info @slug <message>` — Trigger an info alert",
        "`/yawp status` — Show active incidents",
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

  // ─── /yawp team @slug [...] — team management ──────────
  if (subcommand === "team") {
    const teamSlug = (parts[1] || "").replace(/^@/, "").toLowerCase();
    if (!teamSlug) {
      return c.json({
        response_type: "ephemeral",
        text: "Usage: `/yawp team @<slug>` — View team details\nRun `/yawp teams` to see all teams.",
      });
    }

    const [team] = await db
      .select()
      .from(teams)
      .where(
        and(eq(teams.orgId, orgId), eq(teams.slug, teamSlug))
      );

    if (!team) {
      return c.json({
        response_type: "ephemeral",
        text: `Team \`@${teamSlug}\` not found. Run \`/yawp teams\` to see available teams.`,
      });
    }

    const action = (parts[2] || "").toLowerCase();

    // /yawp team @slug add @user
    if (action === "add") {
      const mention = parts[3] || "";
      const slackId = mention.replace(/^<@/, "").replace(/>$/, "").split("|")[0];
      if (!slackId) {
        return c.json({
          response_type: "ephemeral",
          text: "Usage: `/yawp team @slug add @user`",
        });
      }

      // Check if already a member
      const [existing] = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.orgId, orgId),
            eq(members.teamId, team.id),
            eq(members.slackUserId, slackId)
          )
        );

      if (existing) {
        return c.json({
          response_type: "ephemeral",
          text: `<@${slackId}> is already on team *${team.name}*.`,
        });
      }

      // Look up user display name
      const botToken = await getBotToken();
      const userRes = await fetch("https://slack.com/api/users.info", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user: slackId }),
      });
      const userData = (await userRes.json()) as any;
      const displayName =
        userData.user?.profile?.display_name ||
        userData.user?.real_name ||
        userData.user?.name ||
        slackId;

      const ntfyTopic = generateNtfyTopic();

      await db.insert(members).values({
        orgId,
        teamId: team.id,
        displayName,
        slackUserId: slackId,
        ntfyTopic,
      });

      // DM the new member
      await sendSlackDM(
        botToken,
        slackId,
        `You've been added to Yawpr team *${team.name}*! To get push notifications on your phone:\n\n1. Download the *ntfy app*: <https://ntfy.sh|ntfy.sh> (iOS + Android)\n2. Open the app and tap *+* to subscribe\n3. Enter your personal topic: \`${ntfyTopic}\`\n\nFire-level alerts will bypass Do Not Disturb.`
      );

      return c.json({
        response_type: "ephemeral",
        text: `Added <@${slackId}> to team *${team.name}*. They've been DM'd with ntfy setup instructions.`,
      });
    }

    // /yawp team @slug remove @user
    if (action === "remove") {
      const mention = parts[3] || "";
      const slackId = mention.replace(/^<@/, "").replace(/>$/, "").split("|")[0];
      if (!slackId) {
        return c.json({
          response_type: "ephemeral",
          text: "Usage: `/yawp team @slug remove @user`",
        });
      }

      const [member] = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.orgId, orgId),
            eq(members.teamId, team.id),
            eq(members.slackUserId, slackId)
          )
        );

      if (!member) {
        return c.json({
          response_type: "ephemeral",
          text: `<@${slackId}> is not on team *${team.name}*.`,
        });
      }

      // Remove any schedules for this member on this team
      await db
        .delete(schedules)
        .where(
          and(
            eq(schedules.orgId, orgId),
            eq(schedules.teamId, team.id),
            eq(schedules.memberId, member.id)
          )
        );

      await db
        .delete(members)
        .where(eq(members.id, member.id));

      return c.json({
        response_type: "ephemeral",
        text: `Removed <@${slackId}> from team *${team.name}*.`,
      });
    }

    // /yawp team @slug — view team details (no action)
    const teamMembers = await db
      .select()
      .from(members)
      .where(
        and(eq(members.orgId, orgId), eq(members.teamId, team.id))
      );

    const onCall = await getOnCall(db, orgId, team.id);

    const memberLines =
      teamMembers.length > 0
        ? teamMembers
            .map(
              (m) =>
                `• ${m.slackUserId ? `<@${m.slackUserId}>` : m.displayName}${m.role === "admin" ? " _(admin)_" : ""}`
            )
            .join("\n")
        : "_No members yet._";

    const onCallLine = onCall
      ? `Currently on call: ${onCall.member.slackUserId ? `<@${onCall.member.slackUserId}>` : onCall.member.displayName}`
      : "No one currently on call";

    return c.json({
      response_type: "ephemeral",
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: `${team.name} (@${team.slug})` },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Members (${teamMembers.length}):*\n${memberLines}`,
          },
        },
        { type: "divider" },
        {
          type: "section",
          text: { type: "mrkdwn", text: onCallLine },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `\`/yawp team @${team.slug} add @user\` · \`/yawp oncall @${team.slug}\``,
            },
          ],
        },
      ],
      text: `Team ${team.name}: ${teamMembers.length} members. ${onCallLine}`,
    });
  }

  // ─── /yawp oncall @slug [...] — on-call management ─────
  if (subcommand === "oncall") {
    const teamSlug = (parts[1] || "").replace(/^@/, "").toLowerCase();
    if (!teamSlug) {
      return c.json({
        response_type: "ephemeral",
        text: "Usage:\n`/yawp oncall @slug` — Who's on call?\n`/yawp oncall @slug @user <start> <end>` — Schedule on-call\n\nDates: `now`, `tomorrow`, `monday`, or `YYYY-MM-DD`. Times: `9am`, `5pm`, `14:00`.\nExamples:\n`/yawp oncall @backend @jane tomorrow 9am friday 5pm`\n`/yawp oncall @backend @jane now friday 5pm`",
      });
    }

    const [team] = await db
      .select()
      .from(teams)
      .where(
        and(eq(teams.orgId, orgId), eq(teams.slug, teamSlug))
      );

    if (!team) {
      return c.json({
        response_type: "ephemeral",
        text: `Team \`@${teamSlug}\` not found.`,
      });
    }

    // /yawp oncall @slug — just check who's on call
    if (parts.length <= 2) {
      const onCall = await getOnCall(db, orgId, team.id);
      if (!onCall) {
        return c.json({
          response_type: "ephemeral",
          text: `No one is currently on call for *${team.name}*.\nSchedule someone: \`/yawp oncall @${team.slug} @user <start> <end>\``,
        });
      }

      const memberName = onCall.member.slackUserId
        ? `<@${onCall.member.slackUserId}>`
        : onCall.member.displayName;
      const endStr = onCall.schedule.endTime.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

      return c.json({
        response_type: "ephemeral",
        text: `${memberName} is on call for *${team.name}* until ${endStr}.`,
      });
    }

    // /yawp oncall @slug @user <start date> <start time> <end date> <end time>
    const mention = parts[2] || "";
    const slackId = mention.replace(/^<@/, "").replace(/>$/, "").split("|")[0];

    const [member] = await db
      .select()
      .from(members)
      .where(
        and(
          eq(members.orgId, orgId),
          eq(members.teamId, team.id),
          eq(members.slackUserId, slackId)
        )
      );

    if (!member) {
      return c.json({
        response_type: "ephemeral",
        text: `<@${slackId}> is not on team *${team.name}*. Add them first: \`/yawp team @${team.slug} add @user\``,
      });
    }

    // Parse start and end datetimes from remaining args
    const remaining = parts.slice(3).join(" ");
    const startEnd = parseStartEnd(remaining);

    if (!startEnd) {
      return c.json({
        response_type: "ephemeral",
        text: "Couldn't parse the schedule. Try:\n`/yawp oncall @backend @jane tomorrow 9am friday 5pm`\n`/yawp oncall @backend @jane now next monday 9am`\n`/yawp oncall @backend @jane 2026-03-16 09:00 2026-03-20 17:00`",
      });
    }

    const { start, end } = startEnd;

    if (end <= start) {
      return c.json({
        response_type: "ephemeral",
        text: "End time must be after start time.",
      });
    }

    await db.insert(schedules).values({
      orgId,
      teamId: team.id,
      memberId: member.id,
      startTime: start,
      endTime: end,
    });

    const fmtOpts: Intl.DateTimeFormatOptions = {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    };

    return c.json({
      response_type: "ephemeral",
      text: `Scheduled <@${slackId}> on call for *${team.name}*:\n${start.toLocaleString("en-US", fmtOpts)} → ${end.toLocaleString("en-US", fmtOpts)}`,
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

    const botToken = await getBotToken();

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

// ─── Date/time parser ─────────────────────────────────────
// Parses natural-ish date expressions like:
//   "now friday 5pm"
//   "tomorrow 9am friday 5pm"
//   "2026-03-16 09:00 2026-03-20 17:00"
//   "monday 9am wednesday 5pm"

function parseStartEnd(
  input: string
): { start: Date; end: Date } | null {
  const tokens = input.toLowerCase().split(/\s+/);
  if (tokens.length < 2) return null;

  // Try to split tokens into start-group and end-group
  // Strategy: try splitting at each position and see if both halves parse
  for (let i = 1; i < tokens.length; i++) {
    const startTokens = tokens.slice(0, i);
    const endTokens = tokens.slice(i);
    const start = parseDateTime(startTokens);
    const end = parseDateTime(endTokens);
    if (start && end) return { start, end };
  }

  return null;
}

function parseDateTime(tokens: string[]): Date | null {
  if (tokens.length === 0) return null;

  // "now"
  if (tokens.length === 1 && tokens[0] === "now") return new Date();

  let date: Date | null = null;
  let timeStr: string | null = null;

  for (const token of tokens) {
    const parsedTime = parseTime(token);
    if (parsedTime !== null) {
      timeStr = token;
      continue;
    }
    const parsedDate = parseDate(token);
    if (parsedDate) {
      date = parsedDate;
      continue;
    }
    return null; // unrecognized token
  }

  if (!date && !timeStr) return null;

  // Default date to today if only time given
  if (!date) date = new Date();

  if (timeStr) {
    const hours = parseTime(timeStr);
    if (hours !== null) {
      date.setHours(Math.floor(hours), (hours % 1) * 60, 0, 0);
    }
  }

  return date;
}

function parseDate(token: string): Date | null {
  // ISO date: 2026-03-16
  if (/^\d{4}-\d{2}-\d{2}$/.test(token)) {
    const d = new Date(token + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  }

  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  if (token === "today") return today;
  if (token === "tomorrow") {
    today.setDate(today.getDate() + 1);
    return today;
  }

  // Day names: monday, tuesday, etc. → next occurrence
  const days = [
    "sunday", "monday", "tuesday", "wednesday",
    "thursday", "friday", "saturday",
  ];
  const dayIndex = days.indexOf(token);
  if (dayIndex !== -1) {
    const diff = (dayIndex - now.getDay() + 7) % 7 || 7;
    today.setDate(today.getDate() + diff);
    return today;
  }

  // "next monday" etc. handled by caller joining "next" with day
  if (token.startsWith("next")) {
    const day = token.slice(4);
    const di = days.indexOf(day);
    if (di !== -1) {
      const diff = (di - now.getDay() + 7) % 7 || 7;
      today.setDate(today.getDate() + diff);
      return today;
    }
  }

  return null;
}

function parseTime(token: string): number | null {
  // "9am" "5pm" "14:00" "9:30am"
  const ampm = token.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (ampm) {
    let h = parseInt(ampm[1]);
    const m = ampm[2] ? parseInt(ampm[2]) : 0;
    if (ampm[3] === "pm" && h !== 12) h += 12;
    if (ampm[3] === "am" && h === 12) h = 0;
    return h + m / 60;
  }

  const mil = token.match(/^(\d{1,2}):(\d{2})$/);
  if (mil) {
    const h = parseInt(mil[1]);
    const m = parseInt(mil[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return h + m / 60;
  }

  return null;
}

export { slackCommands };
