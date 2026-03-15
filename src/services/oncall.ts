import { and, lte, gte, eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { schedules, members } from "../db/schema";

/** Find who's currently on-call for a given team within an org */
export async function getOnCall(
  db: Database,
  orgId: string,
  teamId: string
) {
  const now = new Date();

  const results = await db
    .select({
      schedule: schedules,
      member: members,
    })
    .from(schedules)
    .innerJoin(members, eq(schedules.memberId, members.id))
    .where(
      and(
        eq(schedules.orgId, orgId),
        eq(schedules.teamId, teamId),
        lte(schedules.startTime, now),
        gte(schedules.endTime, now)
      )
    )
    .limit(1);

  return results[0] ?? null;
}
