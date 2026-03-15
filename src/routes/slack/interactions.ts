import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { Env } from "../../lib/types";
import { slackVerify } from "../../middleware/slack-verify";
import { getDb } from "../../db/client";
import { members, incidents, teams } from "../../db/schema";
import {
  acknowledgeIncident,
  resolveIncident,
  createIncident,
} from "../../services/incident";
import { decryptSecret } from "../../lib/crypto";
import { SEVERITY_EMOJI } from "../../lib/constants";
import { handleTeamCreated, handleMembersSelected } from "./setup-wizard";

const slackInteractions = new Hono<Env>();

slackInteractions.use("/*", slackVerify);

slackInteractions.post("/", async (c) => {
  const rawBody = c.get("rawBody");
  const params = new URLSearchParams(rawBody);
  const payloadStr = params.get("payload");
  if (!payloadStr) return c.json({ error: "No payload" }, 400);

  const payload = JSON.parse(payloadStr);
  const installation = c.get("slackInstallation");
  const db = getDb(c.env.DB);

  // ─── Modal submissions (setup wizard) ─────────────────
  if (payload.type === "view_submission") {
    const callbackId = payload.view?.callback_id;
    const metadata = JSON.parse(payload.view?.private_metadata || "{}");
    const botToken = await decryptSecret(
      installation.botToken,
      c.env.ENCRYPTION_KEY
    );

    if (callbackId === "setup_wizard_team") {
      const teamName =
        payload.view.state.values.team_name.value.value;

      return c.json(
        await handleTeamCreated(
          botToken,
          payload.view.id,
          metadata.orgId,
          teamName,
          db
        )
      );
    }

    if (callbackId === "setup_wizard_members") {
      const selectedUsers: string[] =
        payload.view.state.values.team_members.value.selected_users || [];

      if (selectedUsers.length === 0) {
        return c.json({
          response_action: "errors",
          errors: { team_members: "Select at least one team member." },
        });
      }

      return c.json(
        await handleMembersSelected(
          botToken,
          metadata.orgId,
          metadata.teamId,
          metadata.teamName,
          selectedUsers,
          payload.user.id,
          db
        )
      );
    }

    if (callbackId === "fire_incident") {
      const teamId =
        payload.view.state.values.team.value.selected_option?.value;
      const severity =
        payload.view.state.values.severity.value.selected_option?.value;
      const title =
        payload.view.state.values.title.value.value;

      if (!teamId || !severity || !title) {
        return c.json({
          response_action: "errors",
          errors: { title: "All fields are required." },
        });
      }

      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, teamId));

      const incident = await createIncident(
        db,
        c.env.NOTIFICATION_QUEUE,
        c.env.APP_URL,
        {
          orgId: metadata.orgId,
          teamId,
          severity: severity as "fire" | "warning" | "info",
          title,
          source: "slack",
          createdBy: payload.user.id,
          botToken,
        }
      );

      const emoji = SEVERITY_EMOJI[severity] || "ℹ️";
      const teamName = team?.name || teamId;

      // Post the incident to the user's current channel via chat.postMessage
      // Since we're in a modal we don't have a channel context, so DM the user
      // with the incident and ack/resolve buttons
      const { sendSlackDM } = await import("../../services/slack");
      await sendSlackDM(botToken, payload.user.id, `${emoji} *${title}*\nTeam: *${teamName}* | <${c.env.APP_URL}/app/incidents/${incident.id}|View in dashboard>`);

      return c.json({
        response_action: "update",
        view: {
          type: "modal",
          callback_id: "fire_done",
          title: { type: "plain_text", text: "Incident triggered" },
          close: { type: "plain_text", text: "Done" },
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `${emoji} *${title}*\n\nTeam *${teamName}* has been notified. Members will receive Slack DMs and ntfy push notifications.\n\n<${c.env.APP_URL}/app/incidents/${incident.id}|View in dashboard>`,
              },
            },
          ],
        },
      });
    }

    return c.json({ ok: true });
  }

  // ─── Button actions (incident ack/resolve) ────────────
  const action = payload.actions?.[0];
  if (!action) return c.json({ ok: true });

  const incidentId = action.value;
  const slackUserId = payload.user?.id || "";
  const orgId = installation.orgId;

  // Resolve actor from Slack user ID
  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.slackUserId, slackUserId));
  const actorId = member?.userId || slackUserId;

  // Get the incident for context
  const [incident] = await db
    .select()
    .from(incidents)
    .where(eq(incidents.id, incidentId));

  if (!incident) {
    return c.json({
      replace_original: false,
      response_type: "ephemeral",
      text: "Incident not found.",
    });
  }

  const emoji =
    incident.severity === "fire"
      ? "🔥"
      : incident.severity === "warning"
        ? "⚠️"
        : "ℹ️";

  if (action.action_id === "ack_incident") {
    await acknowledgeIncident(db, orgId, incidentId, actorId);

    return c.json({
      replace_original: true,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `${emoji} *${incident.title}*\nTeam: *${incident.teamId}*`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Resolve" },
              style: "primary",
              action_id: "resolve_incident",
              value: incidentId,
            },
          ],
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Acknowledged by <@${slackUserId}> | <${c.env.APP_URL}/app/incidents/${incidentId}|View in dashboard>`,
            },
          ],
        },
      ],
      text: `${emoji} ${incident.title} — acknowledged by <@${slackUserId}>`,
    });
  }

  if (action.action_id === "resolve_incident") {
    await resolveIncident(db, orgId, incidentId, actorId);

    return c.json({
      replace_original: true,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `~${emoji} *${incident.title}*~`,
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Resolved by <@${slackUserId}> | <${c.env.APP_URL}/app/incidents/${incidentId}|View in dashboard>`,
            },
          ],
        },
      ],
      text: `${emoji} ${incident.title} — resolved by <@${slackUserId}>`,
    });
  }

  return c.json({ ok: true });
});

export { slackInteractions };
