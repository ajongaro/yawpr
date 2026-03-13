import { eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { alerts, alertEvents } from "../db/schema";
import { enqueueNotifications } from "./notification";
import type { AlertSeverity, AlertSource } from "../lib/types";

type CreateAlertInput = {
  teamId: string;
  severity: AlertSeverity;
  title: string;
  description?: string;
  source: AlertSource;
  createdBy?: string;
};

export async function createAlert(
  db: Database,
  queue: Queue,
  appUrl: string,
  input: CreateAlertInput
) {
  const [alert] = await db
    .insert(alerts)
    .values({
      teamId: input.teamId,
      severity: input.severity,
      title: input.title,
      description: input.description,
      source: input.source,
      createdBy: input.createdBy,
    })
    .returning();

  // Audit log
  await db.insert(alertEvents).values({
    alertId: alert.id,
    eventType: "created",
    actorId: input.createdBy,
    message: `Alert created via ${input.source}`,
  });

  // Fan out notifications
  const alertUrl = `${appUrl}/alerts/${alert.id}`;
  await enqueueNotifications(
    db,
    queue,
    alert.id,
    input.teamId,
    input.title,
    input.description || "",
    input.severity,
    alertUrl
  );

  return alert;
}

export async function acknowledgeAlert(
  db: Database,
  alertId: string,
  actorId: string
) {
  const [updated] = await db
    .update(alerts)
    .set({ status: "acknowledged", acknowledgedAt: new Date() })
    .where(eq(alerts.id, alertId))
    .returning();

  await db.insert(alertEvents).values({
    alertId,
    eventType: "acknowledged",
    actorId,
    message: "Alert acknowledged",
  });

  return updated;
}

export async function resolveAlert(
  db: Database,
  alertId: string,
  actorId: string,
  message?: string
) {
  const [updated] = await db
    .update(alerts)
    .set({ status: "resolved", resolvedAt: new Date() })
    .where(eq(alerts.id, alertId))
    .returning();

  await db.insert(alertEvents).values({
    alertId,
    eventType: "resolved",
    actorId,
    message: message || "Alert resolved",
  });

  return updated;
}

export async function addComment(
  db: Database,
  alertId: string,
  actorId: string,
  message: string
) {
  await db.insert(alertEvents).values({
    alertId,
    eventType: "comment",
    actorId,
    message,
  });
}
