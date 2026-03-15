import { eq, and } from "drizzle-orm";
import { getDb } from "../db/client";
import { notifications } from "../db/schema";
import { sendSlackDM, buildIncidentBlocks } from "../services/slack";
import { publishNtfy } from "../services/ntfy";
import type { NotificationMessage, Env } from "../lib/types";
import { SEVERITY_EMOJI } from "../lib/constants";

export async function handleNotificationQueue(
  batch: MessageBatch<NotificationMessage[]>,
  env: Env["Bindings"]
) {
  const db = getDb(env.DB);

  for (const message of batch.messages) {
    const notifList = message.body;

    for (const notif of notifList) {
      try {
        if (notif.channel === "slack_dm" && notif.slackUserId && notif.botToken) {
          const blocks = buildIncidentBlocks(
            notif.title,
            notif.body,
            notif.severity,
            notif.incidentUrl,
            notif.incidentId
          );
          const emoji = SEVERITY_EMOJI[notif.severity] || "ℹ️";
          await sendSlackDM(
            notif.botToken,
            notif.slackUserId,
            `${emoji} ${notif.title}: ${notif.body}`,
            blocks
          );
        } else if (notif.channel === "ntfy" && notif.ntfyTopic) {
          await publishNtfy(
            env.NTFY_BASE_URL || "https://ntfy.sh",
            notif.ntfyTopic,
            notif.title,
            notif.body,
            notif.severity,
            notif.incidentUrl
          );
        }

        // Mark as sent
        await db
          .update(notifications)
          .set({ status: "sent", sentAt: new Date() })
          .where(
            and(
              eq(notifications.incidentId, notif.incidentId),
              eq(notifications.recipientId, notif.recipientId),
              eq(notifications.channel, notif.channel)
            )
          );
      } catch (err) {
        console.error(`Notification failed:`, err);

        await db
          .update(notifications)
          .set({
            status: "failed",
            errorMessage:
              err instanceof Error ? err.message : "Unknown error",
          })
          .where(
            and(
              eq(notifications.incidentId, notif.incidentId),
              eq(notifications.recipientId, notif.recipientId),
              eq(notifications.channel, notif.channel)
            )
          );
      }
    }

    message.ack();
  }
}
