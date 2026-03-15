import { eq, and } from "drizzle-orm";
import { getDb } from "../db/client";
import { notifications, incidents, incidentEvents, slackInstallations } from "../db/schema";
import { sendSlackDM, buildIncidentBlocks } from "../services/slack";
import { publishNtfy } from "../services/ntfy";
import { decryptSecret } from "../lib/crypto";
import { enqueueNotifications } from "../services/notify";
import type { NotificationMessage, EscalationCheck, QueueMessage, Env } from "../lib/types";
import { SEVERITY_EMOJI } from "../lib/constants";

/** Look up and decrypt bot token for an org */
async function getBotToken(
  db: ReturnType<typeof getDb>,
  orgId: string,
  encryptionKey: string
): Promise<string | null> {
  const [installation] = await db
    .select()
    .from(slackInstallations)
    .where(eq(slackInstallations.orgId, orgId));
  if (!installation) return null;
  return decryptSecret(installation.botToken, encryptionKey);
}

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
        const [incident] = await db
          .select()
          .from(incidents)
          .where(eq(incidents.id, check.incidentId));

        if (incident && incident.status === "active") {
          await enqueueNotifications(
            db,
            env.NOTIFICATION_QUEUE,
            check.incidentId,
            check.orgId,
            check.escalateToTeamId,
            `[ESCALATED] ${check.title}`,
            `No acknowledgment after 15 minutes. Escalating to full team.`,
            check.severity,
            check.incidentUrl
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

    // Look up bot token once for this batch of notifications
    let botToken: string | null = null;
    if (notifList.length > 0) {
      botToken = await getBotToken(db, notifList[0].orgId, env.ENCRYPTION_KEY);
    }

    for (const notif of notifList) {
      try {
        if (notif.channel === "slack_dm" && notif.slackUserId && botToken) {
          const blocks = buildIncidentBlocks(
            notif.title,
            notif.body,
            notif.severity,
            notif.incidentUrl,
            notif.incidentId
          );
          const emoji = SEVERITY_EMOJI[notif.severity] || "ℹ️";
          await sendSlackDM(
            botToken,
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
