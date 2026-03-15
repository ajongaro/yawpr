import { eq, and } from "drizzle-orm";
import { getDb } from "../db/client";
import { notifications, incidents, incidentEvents } from "../db/schema";
import { sendSlackDM, buildIncidentBlocks } from "../services/slack";
import { publishNtfy } from "../services/ntfy";
import { enqueueNotifications } from "../services/notify";
import type { NotificationMessage, EscalationCheck, QueueMessage, Env } from "../lib/types";
import { SEVERITY_EMOJI } from "../lib/constants";

export async function handleNotificationQueue(
  batch: MessageBatch<QueueMessage>,
  env: Env["Bindings"]
) {
  const db = getDb(env.DB);

  for (const message of batch.messages) {
    const body = message.body;

    // ─── Escalation check ─────────────────────────────
    if (!Array.isArray(body) && body.type === "escalation_check") {
      const check = body as EscalationCheck;
      try {
        // Look up the incident — only escalate if still unacknowledged
        const [incident] = await db
          .select()
          .from(incidents)
          .where(eq(incidents.id, check.incidentId));

        if (incident && incident.status === "active") {
          // Escalate: send notifications to the escalation team
          await enqueueNotifications(
            db,
            env.NOTIFICATION_QUEUE,
            check.incidentId,
            check.orgId,
            check.escalateToTeamId,
            `[ESCALATED] ${check.title}`,
            `No acknowledgment after 15 minutes. Escalating to full team.`,
            check.severity,
            check.incidentUrl,
            check.botToken
          );

          await db.insert(incidentEvents).values({
            incidentId: check.incidentId,
            eventType: "escalated",
            message: "Auto-escalated after 15 minutes with no acknowledgment",
          });
        }
      } catch (err) {
        console.error("Escalation check failed:", err);
      }

      message.ack();
      continue;
    }

    // ─── Notification messages ────────────────────────
    const notifList = body as NotificationMessage[];

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
