import { eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { members, notifications } from "../db/schema";
import type { NotificationMessage, IncidentSeverity } from "../lib/types";

/** Fan out notifications for an incident to all team members */
export async function enqueueNotifications(
  db: Database,
  queue: Queue,
  incidentId: string,
  orgId: string,
  teamId: string,
  title: string,
  description: string,
  severity: IncidentSeverity,
  incidentUrl: string
) {
  const teamMembers = await db
    .select()
    .from(members)
    .where(eq(members.teamId, teamId));

  const messages: NotificationMessage[] = [];

  for (const member of teamMembers) {
    // Slack DM if member has a Slack user ID
    if (member.slackUserId) {
      messages.push({
        incidentId,
        orgId,
        recipientId: member.id,
        channel: "slack_dm",
        slackUserId: member.slackUserId,
        title,
        body: description || title,
        severity,
        incidentUrl,
      });

      await db.insert(notifications).values({
        orgId,
        incidentId,
        recipientId: member.id,
        channel: "slack_dm",
        status: "queued",
      });
    }

    // ntfy if member has a personal topic
    if (member.ntfyTopic) {
      messages.push({
        incidentId,
        orgId,
        recipientId: member.id,
        channel: "ntfy",
        ntfyTopic: member.ntfyTopic,
        title,
        body: description || title,
        severity,
        incidentUrl,
      });

      await db.insert(notifications).values({
        orgId,
        incidentId,
        recipientId: member.id,
        channel: "ntfy",
        status: "queued",
      });
    }
  }

  if (messages.length > 0) {
    await queue.send(messages);
  }

  return messages.length;
}
