import { eq, and } from "drizzle-orm";
import type { Database } from "../db/client";
import { incidents, incidentEvents, teams } from "../db/schema";
import { enqueueNotifications } from "./notify";
import type { IncidentSeverity, IncidentSource, EscalationCheck } from "../lib/types";

type CreateIncidentInput = {
  orgId: string;
  teamId: string;
  severity: IncidentSeverity;
  title: string;
  description?: string;
  source: IncidentSource;
  createdBy?: string;
};

export async function createIncident(
  db: Database,
  queue: Queue,
  appUrl: string,
  input: CreateIncidentInput
) {
  const [incident] = await db
    .insert(incidents)
    .values({
      orgId: input.orgId,
      teamId: input.teamId,
      severity: input.severity,
      title: input.title,
      description: input.description,
      source: input.source,
      createdBy: input.createdBy,
    })
    .returning();

  await db.insert(incidentEvents).values({
    incidentId: incident.id,
    eventType: "created",
    actorId: input.createdBy,
    message: `Incident created via ${input.source}`,
  });

  const incidentUrl = `${appUrl}/app/incidents/${incident.id}`;
  await enqueueNotifications(
    db,
    queue,
    incident.id,
    input.orgId,
    input.teamId,
    input.title,
    input.description || "",
    input.severity,
    incidentUrl
  );

  // If the team has an escalation target, schedule an escalation check
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, input.teamId));

  if (team?.escalateToTeamId) {
    const escalation: EscalationCheck = {
      type: "escalation_check",
      incidentId: incident.id,
      orgId: input.orgId,
      escalateToTeamId: team.escalateToTeamId,
      title: input.title,
      severity: input.severity,
      incidentUrl,
    };
    await queue.send(escalation, { delaySeconds: 900 });
  }

  return incident;
}

export async function acknowledgeIncident(
  db: Database,
  orgId: string,
  incidentId: string,
  actorId: string
) {
  const [updated] = await db
    .update(incidents)
    .set({
      status: "acknowledged",
      acknowledgedAt: new Date(),
      acknowledgedBy: actorId,
    })
    .where(and(eq(incidents.id, incidentId), eq(incidents.orgId, orgId)))
    .returning();

  await db.insert(incidentEvents).values({
    incidentId,
    eventType: "acknowledged",
    actorId,
    message: "Incident acknowledged",
  });

  return updated;
}

export async function resolveIncident(
  db: Database,
  orgId: string,
  incidentId: string,
  actorId: string,
  message?: string
) {
  const [updated] = await db
    .update(incidents)
    .set({
      status: "resolved",
      resolvedAt: new Date(),
      resolvedBy: actorId,
    })
    .where(and(eq(incidents.id, incidentId), eq(incidents.orgId, orgId)))
    .returning();

  await db.insert(incidentEvents).values({
    incidentId,
    eventType: "resolved",
    actorId,
    message: message || "Incident resolved",
  });

  return updated;
}

export async function addComment(
  db: Database,
  incidentId: string,
  actorId: string,
  message: string
) {
  await db.insert(incidentEvents).values({
    incidentId,
    eventType: "comment",
    actorId,
    message,
  });
}
