import { eq, and, gte } from "drizzle-orm";
import { count } from "drizzle-orm";
import type { Database } from "../db/client";
import { teams, members, incidents, organizations } from "../db/schema";

export async function checkTeamLimit(
  db: Database,
  orgId: string
): Promise<{ allowed: boolean; current: number; max: number }> {
  const [org] = await db
    .select({ maxTeams: organizations.maxTeams })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  const [result] = await db
    .select({ count: count() })
    .from(teams)
    .where(eq(teams.orgId, orgId));

  const current = result.count;
  const max = org?.maxTeams ?? 5;
  return { allowed: current < max, current, max };
}

export async function checkMemberLimit(
  db: Database,
  orgId: string,
  teamId: string
): Promise<{ allowed: boolean; current: number; max: number }> {
  const [org] = await db
    .select({ maxMembersPerTeam: organizations.maxMembersPerTeam })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  const [result] = await db
    .select({ count: count() })
    .from(members)
    .where(and(eq(members.orgId, orgId), eq(members.teamId, teamId)));

  const current = result.count;
  const max = org?.maxMembersPerTeam ?? 20;
  return { allowed: current < max, current, max };
}

export async function checkIncidentLimit(
  db: Database,
  orgId: string
): Promise<{ allowed: boolean; current: number; max: number }> {
  const [org] = await db
    .select({ maxAlertsPerMonth: organizations.maxAlertsPerMonth })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  // Count incidents created this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [result] = await db
    .select({ count: count() })
    .from(incidents)
    .where(
      and(
        eq(incidents.orgId, orgId),
        gte(incidents.createdAt, startOfMonth)
      )
    );

  const current = result.count;
  const max = org?.maxAlertsPerMonth ?? 50;
  return { allowed: current < max, current, max };
}
