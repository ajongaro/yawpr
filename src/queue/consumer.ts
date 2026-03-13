import { eq, and } from "drizzle-orm";
import { getDb } from "../db/client";
import { notificationLog } from "../db/schema";
import { sendSlackDM, buildAlertBlocks } from "../services/slack";
import { publishNtfy } from "../services/ntfy";
import type { NotificationMessage, Env } from "../lib/types";

export async function handleNotificationQueue(
  batch: MessageBatch<NotificationMessage[]>,
  env: Env["Bindings"]
) {
  const db = getDb(env.DB);

  for (const message of batch.messages) {
    const notifications = message.body;

    for (const notif of notifications) {
      try {
        if (notif.channel === "slack_dm" && notif.slackUserId) {
          const blocks = buildAlertBlocks(
            notif.title,
            notif.body,
            notif.severity,
            notif.alertUrl,
            notif.alertId
          );
          await sendSlackDM(
            env.SLACK_BOT_TOKEN,
            notif.slackUserId,
            `${notif.severity === "fire" ? "🔥" : "ℹ️"} ${notif.title}: ${notif.body}`,
            blocks
          );
        } else if (notif.channel === "ntfy" && notif.ntfyTopic) {
          await publishNtfy(
            env.NTFY_BASE_URL || "https://ntfy.sh",
            notif.ntfyTopic,
            notif.title,
            notif.body,
            notif.severity,
            notif.alertUrl
          );
        }

        // Mark as sent
        await db
          .update(notificationLog)
          .set({ status: "sent" })
          .where(
            and(
              eq(notificationLog.alertId, notif.alertId),
              eq(notificationLog.recipientId, notif.recipientId),
              eq(notificationLog.channel, notif.channel)
            )
          );
      } catch (err) {
        console.error(`Notification failed:`, err);

        // Mark as failed
        await db
          .update(notificationLog)
          .set({
            status: "failed",
            errorMessage:
              err instanceof Error ? err.message : "Unknown error",
          })
          .where(
            and(
              eq(notificationLog.alertId, notif.alertId),
              eq(notificationLog.recipientId, notif.recipientId),
              eq(notificationLog.channel, notif.channel)
            )
          );
      }
    }

    message.ack();
  }
}
