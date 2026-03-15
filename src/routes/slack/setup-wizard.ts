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

  // DM each member directly with their ntfy topic and setup instructions
  for (const m of memberResults) {
    await sendSlackDM(
      botToken,
      m.slackUserId,
      `You've been added to Yawpr team *${teamName}*! When incidents hit, you'll get a Slack DM — but to also get push notifications on your phone:\n\n1. Download the *ntfy app*: <https://ntfy.sh|ntfy.sh> (iOS + Android)\n2. Open the app and tap *+* to subscribe\n3. Enter your personal topic: \`${m.ntfyTopic}\`\n\nThat's it — fire-level alerts will bypass Do Not Disturb.`
    );
  }

  // DM the setup user a confirmation
  const memberList = memberResults
    .map((m) => `• <@${m.slackUserId}>`)
    .join("\n");

  await sendSlackDM(
    botToken,
    setupUserId,
    `Team *${teamName}* is set up! I've DM'd each member with their ntfy setup instructions:\n\n${memberList}\n\nTo trigger an incident: \`/yawp fire @${teamName.toLowerCase().replace(/[^a-z0-9]+/g, "-")} Something is on fire\``
  );

  // Return an updated view showing success
  const slug = teamName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
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
            text: `Team *${teamName}* is ready with ${memberResults.length} member${memberResults.length === 1 ? "" : "s"}.\n\nEach person just got a DM with instructions to set up ntfy push notifications on their phone.\n\nTo trigger an incident:\n\`/yawp fire @${slug} Something is on fire\``,
          },
        },
      ],
    },
  };
}

// ─── Fire modal ─────────────────────────────────────────

export async function openFireModal(
  botToken: string,
  triggerId: string,
  orgId: string,
  defaultSeverity?: string,
  db?: ReturnType<typeof getDb>
) {
  // Fetch teams for the dropdown
  const teamList = db
    ? await db.select().from(teams).where(eq(teams.orgId, orgId))
    : [];

  const teamOptions = teamList.map((t) => ({
    text: { type: "plain_text" as const, text: t.name },
    value: t.id,
  }));

  if (teamOptions.length === 0) {
    // No teams — can't fire. Tell them to set up first.
    const res = await fetch("https://slack.com/api/views.open", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        trigger_id: triggerId,
        view: {
          type: "modal",
          title: { type: "plain_text", text: "No teams yet" },
          close: { type: "plain_text", text: "OK" },
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "You need to create a team first.\nRun `/yawp setup` to get started.",
              },
            },
          ],
        },
      }),
    });
    return;
  }

  const severityOptions = [
    { text: { type: "plain_text" as const, text: "🔥 Fire — bypasses DND" }, value: "fire" },
    { text: { type: "plain_text" as const, text: "⚠️ Warning" }, value: "warning" },
    { text: { type: "plain_text" as const, text: "ℹ️ Info" }, value: "info" },
  ];

  const initialSeverity = defaultSeverity && ["fire", "warning", "info"].includes(defaultSeverity)
    ? severityOptions.find((o) => o.value === defaultSeverity)
    : undefined;

  const view = {
    type: "modal" as const,
    callback_id: "fire_incident",
    private_metadata: JSON.stringify({ orgId }),
    title: { type: "plain_text" as const, text: "Trigger an incident" },
    submit: { type: "plain_text" as const, text: "Send it" },
    close: { type: "plain_text" as const, text: "Cancel" },
    blocks: [
      {
        type: "input",
        block_id: "team",
        label: { type: "plain_text" as const, text: "Team" },
        element: {
          type: "static_select",
          action_id: "value",
          placeholder: { type: "plain_text" as const, text: "Select a team..." },
          options: teamOptions,
        },
      },
      {
        type: "input",
        block_id: "severity",
        label: { type: "plain_text" as const, text: "Severity" },
        element: {
          type: "static_select",
          action_id: "value",
          options: severityOptions,
          ...(initialSeverity ? { initial_option: initialSeverity } : {}),
        },
      },
      {
        type: "input",
        block_id: "title",
        label: { type: "plain_text" as const, text: "What's happening?" },
        element: {
          type: "plain_text_input",
          action_id: "value",
          placeholder: { type: "plain_text" as const, text: "DB is down, API returning 500s, etc." },
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
