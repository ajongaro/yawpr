import { and, lte, gte, eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { onCallSchedules, teamMembers } from "../db/schema";

/** Find who's currently on-call for a given team */
export async function getOnCall(db: Database, teamId: string) {
  const now = new Date();

  const results = await db
    .select({
      schedule: onCallSchedules,
      member: teamMembers,
    })
    .from(onCallSchedules)
    .innerJoin(teamMembers, eq(onCallSchedules.memberId, teamMembers.id))
    .where(
      and(
        eq(onCallSchedules.teamId, teamId),
        lte(onCallSchedules.startTime, now),
        gte(onCallSchedules.endTime, now)
      )
    )
    .limit(1);

  return results[0] ?? null;
}
