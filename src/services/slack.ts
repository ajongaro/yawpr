/** Send a Slack DM to a user */
export async function sendSlackDM(
  botToken: string,
  slackUserId: string,
  text: string,
  blocks?: object[]
) {
  // Open a DM channel
  const openRes = await fetch("https://slack.com/api/conversations.open", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ users: slackUserId }),
  });
  const openData = (await openRes.json()) as any;
  if (!openData.ok) {
    throw new Error(`Failed to open DM: ${openData.error}`);
  }

  const channelId = openData.channel.id;

  // Send the message
  const msgRes = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: channelId,
      text,
      ...(blocks ? { blocks } : {}),
    }),
  });
  const msgData = (await msgRes.json()) as any;
  if (!msgData.ok) {
    throw new Error(`Failed to send message: ${msgData.error}`);
  }

  return msgData;
}

/** Build Slack blocks for an alert notification */
export function buildAlertBlocks(
  title: string,
  body: string,
  severity: string,
  alertUrl: string,
  alertId: string
) {
  const emoji = severity === "fire" ? "🔥" : "ℹ️";
  return [
    {
      type: "header",
      text: { type: "plain_text", text: `${emoji} ${title}`, emoji: true },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: body },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "✅ Acknowledge" },
          style: "primary",
          action_id: "ack_alert",
          value: alertId,
        },
        {
          type: "button",
          text: { type: "plain_text", text: "🔧 Resolve" },
          action_id: "resolve_alert",
          value: alertId,
        },
        {
          type: "button",
          text: { type: "plain_text", text: "View in Dashboard" },
          url: alertUrl,
          action_id: "view_alert",
        },
      ],
    },
  ];
}
