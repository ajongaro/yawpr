import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../../db/client";
import {
  teams,
  members,
  incidents,
} from "../../db/schema";

type DB = ReturnType<typeof getDb>;

const pt = (text: string) => ({ type: "plain_text" as const, text });

async function slackApi(botToken: string, method: string, body: object) {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as any;
  if (!data.ok) throw new Error(`${method} failed: ${data.error}`);
  return data;
}

async function openModal(botToken: string, triggerId: string, view: object) {
  await slackApi(botToken, "views.open", { trigger_id: triggerId, view });
}

function meta(data: object) {
  return JSON.stringify(data);
}

// ─── Team management modal ──────────────────────────────

export async function openTeamManageModal(
  botToken: string,
  triggerId: string,
  orgId: string,
  teamId: string,
  db: DB
) {
  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.orgId, orgId), eq(teams.id, teamId)));
  if (!team) return;

  const teamMembers = await db
    .select()
    .from(members)
    .where(and(eq(members.orgId, orgId), eq(members.teamId, teamId)));

  // Look up escalation target name
  let escalationText = "_None — no auto-escalation_";
  if (team.escalateToTeamId) {
    const [escTeam] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, team.escalateToTeamId));
    if (escTeam) escalationText = `@${escTeam.slug}`;
  }

  const memberLines =
    teamMembers.length > 0
      ? teamMembers
          .map((m) => `• ${m.slackUserId ? `<@${m.slackUserId}>` : m.displayName}`)
          .join("\n")
      : "_No members yet._";

  await openModal(botToken, triggerId, {
    type: "modal",
    callback_id: "team_manage_action",
    private_metadata: meta({ orgId, teamId, teamSlug: team.slug }),
    title: pt(team.name),
    close: pt("Close"),
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: `*@${team.slug}* · ${teamMembers.length} members\nEscalates to: ${escalationText}` },
      },
      { type: "divider" },
      {
        type: "section",
        text: { type: "mrkdwn", text: `*Members:*\n${memberLines}` },
      },
      { type: "divider" },
      {
        type: "actions",
        block_id: "team_actions",
        elements: [
          {
            type: "button",
            text: pt("Add Members"),
            action_id: "team_add_members",
            style: "primary",
          },
          {
            type: "button",
            text: pt("Remove Member"),
            action_id: "team_remove_member",
          },
          {
            type: "button",
            text: pt("Set Escalation"),
            action_id: "team_set_escalation",
          },
          {
            type: "button",
            text: pt("Rename Team"),
            action_id: "team_rename",
          },
          {
            type: "button",
            text: pt("Delete Team"),
            action_id: "team_delete",
            style: "danger",
          },
        ],
      },
    ],
  });
}

// ─── Add members modal ──────────────────────────────────

export async function openAddMembersModal(
  botToken: string,
  triggerId: string,
  orgId: string,
  teamId: string
) {
  await openModal(botToken, triggerId, {
    type: "modal",
    callback_id: "team_add_members_submit",
    private_metadata: meta({ orgId, teamId }),
    title: pt("Add members"),
    submit: pt("Add"),
    close: pt("Cancel"),
    blocks: [
      {
        type: "input",
        block_id: "new_members",
        label: pt("Select people to add"),
        element: {
          type: "multi_users_select",
          action_id: "value",
          placeholder: pt("Select people..."),
        },
      },
    ],
  });
}

// ─── Remove member modal ────────────────────────────────

export async function openRemoveMemberModal(
  botToken: string,
  triggerId: string,
  orgId: string,
  teamId: string,
  db: DB
) {
  const teamMembers = await db
    .select()
    .from(members)
    .where(and(eq(members.orgId, orgId), eq(members.teamId, teamId)));

  if (teamMembers.length === 0) {
    await openModal(botToken, triggerId, {
      type: "modal",
      title: pt("No members"),
      close: pt("OK"),
      blocks: [{ type: "section", text: { type: "mrkdwn", text: "This team has no members to remove." } }],
    });
    return;
  }

  const options = teamMembers.map((m) => ({
    text: pt(m.displayName),
    value: m.id,
  }));

  await openModal(botToken, triggerId, {
    type: "modal",
    callback_id: "team_remove_member_submit",
    private_metadata: meta({ orgId, teamId }),
    title: pt("Remove member"),
    submit: pt("Remove"),
    close: pt("Cancel"),
    blocks: [
      {
        type: "input",
        block_id: "member_to_remove",
        label: pt("Who to remove?"),
        element: {
          type: "static_select",
          action_id: "value",
          options,
        },
      },
    ],
  });
}

// ─── Set escalation modal ───────────────────────────────

export async function openSetEscalationModal(
  botToken: string,
  triggerId: string,
  orgId: string,
  teamId: string,
  db: DB
) {
  // Get all other teams as options
  const allTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.orgId, orgId));

  const otherTeams = allTeams.filter((t) => t.id !== teamId);

  const options = [
    { text: pt("None (no auto-escalation)"), value: "none" },
    ...otherTeams.map((t) => ({
      text: pt(`${t.name} (@${t.slug})`),
      value: t.id,
    })),
  ];

  // Find current setting
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId));

  const currentOption = team?.escalateToTeamId
    ? options.find((o) => o.value === team.escalateToTeamId)
    : options[0];

  await openModal(botToken, triggerId, {
    type: "modal",
    callback_id: "team_set_escalation_submit",
    private_metadata: meta({ orgId, teamId }),
    title: pt("Set escalation"),
    submit: pt("Save"),
    close: pt("Cancel"),
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "If an incident isn't acknowledged within *15 minutes*, it auto-escalates to the selected team.",
        },
      },
      {
        type: "input",
        block_id: "escalation_target",
        label: pt("Escalate to"),
        element: {
          type: "static_select",
          action_id: "value",
          options,
          ...(currentOption ? { initial_option: currentOption } : {}),
        },
      },
    ],
  });
}

// ─── Rename team modal ──────────────────────────────────

export async function openRenameTeamModal(
  botToken: string,
  triggerId: string,
  orgId: string,
  teamId: string,
  db: DB
) {
  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.orgId, orgId), eq(teams.id, teamId)));
  if (!team) return;

  await openModal(botToken, triggerId, {
    type: "modal",
    callback_id: "team_rename_submit",
    private_metadata: meta({ orgId, teamId }),
    title: pt("Rename team"),
    submit: pt("Rename"),
    close: pt("Cancel"),
    blocks: [
      {
        type: "input",
        block_id: "new_name",
        label: pt("New team name"),
        element: {
          type: "plain_text_input",
          action_id: "value",
          initial_value: team.name,
        },
      },
    ],
  });
}

// ─── Delete team confirmation ───────────────────────────

export async function openDeleteTeamModal(
  botToken: string,
  triggerId: string,
  orgId: string,
  teamId: string,
  db: DB
) {
  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.orgId, orgId), eq(teams.id, teamId)));
  if (!team) return;

  const memberCount = (
    await db
      .select()
      .from(members)
      .where(and(eq(members.orgId, orgId), eq(members.teamId, teamId)))
  ).length;

  await openModal(botToken, triggerId, {
    type: "modal",
    callback_id: "team_delete_submit",
    private_metadata: meta({ orgId, teamId, teamName: team.name }),
    title: pt("Delete team"),
    submit: pt("Delete permanently"),
    close: pt("Cancel"),
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Are you sure you want to delete *${team.name}*?\n\nThis will remove ${memberCount} member${memberCount !== 1 ? "s" : ""} and cannot be undone.`,
        },
      },
    ],
  });
}

// ─── History modal ──────────────────────────────────────

export async function openHistoryModal(
  botToken: string,
  triggerId: string,
  orgId: string,
  appUrl: string,
  db: DB
) {
  const recent = await db
    .select({ incident: incidents, team: teams })
    .from(incidents)
    .innerJoin(teams, eq(incidents.teamId, teams.id))
    .where(eq(incidents.orgId, orgId))
    .orderBy(desc(incidents.createdAt))
    .limit(15);

  if (recent.length === 0) {
    await openModal(botToken, triggerId, {
      type: "modal",
      title: pt("Incident history"),
      close: pt("OK"),
      blocks: [{ type: "section", text: { type: "mrkdwn", text: "No incidents yet." } }],
    });
    return;
  }

  const emojiMap: Record<string, string> = { fire: "🔥", warning: "⚠️", info: "ℹ️" };
  const statusMap: Record<string, string> = {
    active: "🔴 Active",
    acknowledged: "🟡 Ack'd",
    resolved: "✅ Resolved",
  };

  const lines = recent.map((r) => {
    const e = emojiMap[r.incident.severity] || "ℹ️";
    const s = statusMap[r.incident.status] || r.incident.status;
    const date = r.incident.createdAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return `${e} *${r.incident.title}* — @${r.team.slug} [${s}] _(${date})_`;
  });

  await openModal(botToken, triggerId, {
    type: "modal",
    title: pt("Incident history"),
    close: pt("Close"),
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: lines.join("\n") },
      },
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<${appUrl}/app/incidents|View all in dashboard>`,
        },
      },
    ],
  });
}

