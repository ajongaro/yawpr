import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
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
import { getOrCreateNtfyTopic } from "../../services/ntfy-topic";
import { SEVERITY_EMOJI } from "../../lib/constants";
import { handleTeamCreated, handleMembersSelected } from "./setup-wizard";
import { sendSlackDM } from "../../services/slack";
import {
  openAddMembersModal,
  openRemoveMemberModal,
  openSetEscalationModal,
  openRenameTeamModal,
  openDeleteTeamModal,
} from "./modals";

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
          installation.orgId,
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
          installation.orgId,
          metadata.teamId,
          metadata.teamName,
          selectedUsers,
          payload.user.id,
          db
        )
      );
    }

    // ─── Add members submission ────────────────────────
    if (callbackId === "team_add_members_submit") {
      const selectedUsers: string[] =
        payload.view.state.values.new_members.value.selected_users || [];

      if (selectedUsers.length === 0) {
        return c.json({
          response_action: "errors",
          errors: { new_members: "Select at least one person." },
        });
      }

      const added: string[] = [];
      for (const slackUserId of selectedUsers) {
        // Skip if already a member
        const [existing] = await db
          .select()
          .from(members)
          .where(
            and(
              eq(members.orgId, installation.orgId),
              eq(members.teamId, metadata.teamId),
              eq(members.slackUserId, slackUserId)
            )
          );
        if (existing) continue;

        // Look up display name
        const userRes = await fetch("https://slack.com/api/users.info", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ user: slackUserId }),
        });
        const userData = (await userRes.json()) as any;
        const displayName =
          userData.user?.profile?.display_name ||
          userData.user?.real_name ||
          userData.user?.name ||
          slackUserId;

        const ntfyTopic = await getOrCreateNtfyTopic(db, slackUserId);
        await db.insert(members).values({
          orgId: installation.orgId,
          teamId: metadata.teamId,
          displayName,
          slackUserId,
          ntfyTopic,
        });

        // DM them
        await sendSlackDM(
          botToken,
          slackUserId,
          `You've been added to a Yawpr team! To get push notifications:\n\n*Setup:*\n1. Download the *ntfy app*: <https://ntfy.sh|ntfy.sh>\n2. Subscribe to your topic: \`${ntfyTopic}\`\n\n*Enable DND bypass:*\n• *iPhone*: Settings → ntfy → Notifications → turn on *Time Sensitive Notifications*\n• *Android*: Settings → Apps → ntfy → Notifications → set to *Urgent*, then allow ntfy in Do Not Disturb exceptions\n\nWithout this step, fire alerts won't wake you up.`
        );

        added.push(`<@${slackUserId}>`);
      }

      return c.json({
        response_action: "update",
        view: {
          type: "modal",
          title: { type: "plain_text", text: "Members added" },
          close: { type: "plain_text", text: "Done" },
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: added.length > 0
                  ? `Added ${added.join(", ")}. Each person was DM'd with ntfy setup instructions.`
                  : "All selected people were already on the team.",
              },
            },
          ],
        },
      });
    }

    // ─── Remove member submission ────────────────────────
    if (callbackId === "team_remove_member_submit") {
      const memberId =
        payload.view.state.values.member_to_remove.value.selected_option?.value;

      if (!memberId) {
        return c.json({
          response_action: "errors",
          errors: { member_to_remove: "Select a member to remove." },
        });
      }

      await db.delete(members).where(
        and(eq(members.id, memberId), eq(members.orgId, installation.orgId))
      );

      return c.json({
        response_action: "update",
        view: {
          type: "modal",
          title: { type: "plain_text", text: "Member removed" },
          close: { type: "plain_text", text: "Done" },
          blocks: [
            {
              type: "section",
              text: { type: "mrkdwn", text: "Member has been removed from the team." },
            },
          ],
        },
      });
    }

    // ─── Rename team submission ──────────────────────────
    // ─── Set escalation submission ─────────────────────
    if (callbackId === "team_set_escalation_submit") {
      const targetId =
        payload.view.state.values.escalation_target.value.selected_option?.value;

      await db
        .update(teams)
        .set({
          escalateToTeamId: targetId === "none" ? null : targetId,
        })
        .where(
          and(eq(teams.id, metadata.teamId), eq(teams.orgId, installation.orgId))
        );

      const label = targetId === "none" ? "disabled" : "configured";

      return c.json({
        response_action: "update",
        view: {
          type: "modal",
          title: { type: "plain_text", text: "Escalation updated" },
          close: { type: "plain_text", text: "Done" },
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: targetId === "none"
                  ? "Auto-escalation has been disabled for this team."
                  : `Auto-escalation ${label}. Unacknowledged incidents will escalate after 15 minutes.`,
              },
            },
          ],
        },
      });
    }

    // ─── Rename team submission ──────────────────────────
    if (callbackId === "team_rename_submit") {
      const newName = payload.view.state.values.new_name.value.value;
      if (!newName) {
        return c.json({
          response_action: "errors",
          errors: { new_name: "Name is required." },
        });
      }

      const newSlug = newName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      await db
        .update(teams)
        .set({ name: newName, slug: newSlug })
        .where(
          and(eq(teams.id, metadata.teamId), eq(teams.orgId, installation.orgId))
        );

      return c.json({
        response_action: "update",
        view: {
          type: "modal",
          title: { type: "plain_text", text: "Team renamed" },
          close: { type: "plain_text", text: "Done" },
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `Team renamed to *${newName}* (\`@${newSlug}\`).`,
              },
            },
          ],
        },
      });
    }

    // ─── Delete team submission ──────────────────────────
    if (callbackId === "team_delete_submit") {
      // Delete members, then team
      await db
        .delete(members)
        .where(
          and(
            eq(members.orgId, installation.orgId),
            eq(members.teamId, metadata.teamId)
          )
        );
      await db
        .delete(teams)
        .where(
          and(eq(teams.id, metadata.teamId), eq(teams.orgId, installation.orgId))
        );

      return c.json({
        response_action: "update",
        view: {
          type: "modal",
          title: { type: "plain_text", text: "Team deleted" },
          close: { type: "plain_text", text: "Done" },
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `Team *${metadata.teamName}* has been deleted.`,
              },
            },
          ],
        },
      });
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
          orgId: installation.orgId,
          teamId,
          severity: severity as "fire" | "warning" | "info",
          title,
          source: "slack",
          createdBy: payload.user.id,
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

  // ─── Button actions from team manage modal ─────────────
  if (payload.type === "block_actions") {
    const action = payload.actions?.[0];
    if (!action) return c.json({ ok: true });

    const teamManageActions = [
      "team_add_members",
      "team_remove_member",
      "team_set_escalation",
      "team_rename",
      "team_delete",
    ];

    if (teamManageActions.includes(action.action_id)) {
      const metadata = JSON.parse(payload.view?.private_metadata || "{}");
      const botToken = await decryptSecret(
        installation.botToken,
        c.env.ENCRYPTION_KEY
      );
      const triggerId = payload.trigger_id;

      if (action.action_id === "team_add_members") {
        await openAddMembersModal(botToken, triggerId, installation.orgId, metadata.teamId);
      } else if (action.action_id === "team_remove_member") {
        await openRemoveMemberModal(botToken, triggerId, installation.orgId, metadata.teamId, db);
      } else if (action.action_id === "team_set_escalation") {
        await openSetEscalationModal(botToken, triggerId, installation.orgId, metadata.teamId, db);
      } else if (action.action_id === "team_rename") {
        await openRenameTeamModal(botToken, triggerId, installation.orgId, metadata.teamId, db);
      } else if (action.action_id === "team_delete") {
        await openDeleteTeamModal(botToken, triggerId, installation.orgId, metadata.teamId, db);
      }

      return c.json({ ok: true });
    }
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
