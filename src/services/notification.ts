import { eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { teamMembers, notificationLog } from "../db/schema";
import type { NotificationMessage, AlertSeverity } from "../lib/types";

/** Fan out notifications for an alert to all team members */
export async function enqueueNotifications(
  db: Database,
  queue: Queue,
  alertId: string,
  teamId: string,
  title: string,
  description: string,
  severity: AlertSeverity,
  alertUrl: string
) {
  // Get all members of the team
  const members = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));

  const messages: NotificationMessage[] = [];

  for (const member of members) {
    // Slack DM if member has a Slack user ID
    if (member.slackUserId) {
      const msg: NotificationMessage = {
        alertId,
        recipientId: member.id,
        channel: "slack_dm",
        slackUserId: member.slackUserId,
        title,
        body: description || title,
        severity,
        alertUrl,
      };
      messages.push(msg);

      // Log as queued
      await db.insert(notificationLog).values({
        alertId,
        recipientId: member.id,
        channel: "slack_dm",
        status: "queued",
      });
    }

    // ntfy if member has a personal topic, or fall back to team topic
    const topic = member.ntfyTopic;
    if (topic) {
      const msg: NotificationMessage = {
        alertId,
        recipientId: member.id,
        channel: "ntfy",
        ntfyTopic: topic,
        title,
        body: description || title,
        severity,
        alertUrl,
      };
      messages.push(msg);

      await db.insert(notificationLog).values({
        alertId,
        recipientId: member.id,
        channel: "ntfy",
        status: "queued",
      });
    }
  }

  // Send all messages to the queue in a batch
  if (messages.length > 0) {
    await queue.send(messages);
  }

  return messages.length;
}
