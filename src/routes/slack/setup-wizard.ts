import { eq, and } from "drizzle-orm";
import { getDb } from "../../db/client";
import { teams, members } from "../../db/schema";
import { generateNtfyTopic } from "../../lib/crypto";
import { sendSlackDM } from "../../services/slack";

// ─── Step 1: Open the "Create a team" modal ──────────────

export async function openSetupWizard(
  botToken: string,
  triggerId: string,
  orgId: string
) {
  const view = {
    type: "modal" as const,
    callback_id: "setup_wizard_team",
    private_metadata: JSON.stringify({ orgId }),
    title: { type: "plain_text" as const, text: "Set up a team" },
    submit: { type: "plain_text" as const, text: "Next" },
    close: { type: "plain_text" as const, text: "Cancel" },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Let's create an on-call team. This takes about 30 seconds.",
        },
      },
      { type: "divider" },
      {
        type: "input",
        block_id: "team_name",
        label: { type: "plain_text" as const, text: "Team name" },
        element: {
          type: "plain_text_input",
          action_id: "value",
          placeholder: {
            type: "plain_text" as const,
            text: 'e.g. "Backend" or "Platform"',
          },
        },
      },
    ],
  };

  const res = await fetch("https://slack.com/api/views.open", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ trigger_id: triggerId, view }),
  });
  const data = (await res.json()) as any;
  if (!data.ok) throw new Error(`views.open failed: ${data.error}`);
}

// ─── Step 2: Handle team creation, show member picker ────

export async function handleTeamCreated(
  botToken: string,
  viewId: string,
  orgId: string,
  teamName: string,
  db: ReturnType<typeof getDb>
) {
  const slug = teamName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Check for duplicate slug
  const [existing] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.orgId, orgId), eq(teams.slug, slug)));

  if (existing) {
    return {
      response_action: "errors" as const,
      errors: {
        team_name: `A team with slug "${slug}" already exists. Pick a different name.`,
      },
    };
  }

  const [team] = await db
    .insert(teams)
    .values({ orgId, name: teamName, slug })
    .returning();

  // Update the modal to step 2: pick members
  return {
    response_action: "update" as const,
    view: {
      type: "modal" as const,
      callback_id: "setup_wizard_members",
      private_metadata: JSON.stringify({ orgId, teamId: team.id, teamName }),
      title: { type: "plain_text" as const, text: "Add team members" },
      submit: { type: "plain_text" as const, text: "Done" },
      close: { type: "plain_text" as const, text: "Cancel" },
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Team *${teamName}* created! Now pick who's on this team.`,
          },
        },
        { type: "divider" },
        {
          type: "input",
          block_id: "team_members",
          label: { type: "plain_text" as const, text: "Team members" },
          element: {
            type: "multi_users_select",
            action_id: "value",
            placeholder: {
              type: "plain_text" as const,
              text: "Select people...",
            },
          },
        },
      ],
    },
  };
}

// ─── Step 3: Create members, send summary DM ────────────

export async function handleMembersSelected(
  botToken: string,
  orgId: string,
  teamId: string,
  teamName: string,
  selectedUserIds: string[],
  setupUserId: string,
  db: ReturnType<typeof getDb>
) {
  // Look up each selected user's display name from Slack
  const memberResults: { displayName: string; slackUserId: string; ntfyTopic: string }[] = [];

  for (const slackUserId of selectedUserIds) {
    const res = await fetch("https://slack.com/api/users.info", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user: slackUserId }),
    });
    const data = (await res.json()) as any;
    const displayName =
      data.user?.profile?.display_name ||
      data.user?.real_name ||
      data.user?.name ||
      slackUserId;

    const ntfyTopic = generateNtfyTopic();

    await db.insert(members).values({
      orgId,
      teamId,
      displayName,
      slackUserId,
      ntfyTopic,
    });

    memberResults.push({ displayName, slackUserId, ntfyTopic });
  }

  // DM the person who ran setup with a summary
  const topicLines = memberResults
    .map((m) => `• <@${m.slackUserId}> → \`${m.ntfyTopic}\``)
    .join("\n");

  await sendSlackDM(
    botToken,
    setupUserId,
    `Team *${teamName}* is ready! Here are the ntfy topics for each member:\n\n${topicLines}\n\nEach person should subscribe to their topic in the <https://ntfy.sh|ntfy app> to get push notifications.`
  );

  // Return an updated view showing success
  return {
    response_action: "update" as const,
    view: {
      type: "modal" as const,
      callback_id: "setup_wizard_done",
      title: { type: "plain_text" as const, text: "All set!" },
      close: { type: "plain_text" as const, text: "Done" },
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Team *${teamName}* is ready with ${memberResults.length} member${memberResults.length === 1 ? "" : "s"}.\n\nI've sent you a DM with everyone's ntfy topics.\n\nTo trigger an incident:\n\`/yawp fire @${teamName.toLowerCase().replace(/[^a-z0-9]+/g, "-")} Something is on fire\``,
          },
        },
      ],
    },
  };
}
