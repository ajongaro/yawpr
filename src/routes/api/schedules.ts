import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import type { Env } from "../../lib/types";
import { getDb } from "../../db/client";
import { schedules, members } from "../../db/schema";
import { getOnCall } from "../../services/oncall";

const schedulesApi = new Hono<Env>();

const createScheduleSchema = z.object({
  teamId: z.string().min(1),
  memberId: z.string().min(1),
  startTime: z.string().transform((s) => new Date(s)),
  endTime: z.string().transform((s) => new Date(s)),
});

// List schedules for a team (org-scoped)
schedulesApi.get("/team/:teamId", async (c) => {
  const db = getDb(c.env.DB);
  const orgId = c.get("orgId");
  const teamSchedules = await db
    .select({
      schedule: schedules,
      member: members,
    })
    .from(schedules)
    .innerJoin(members, eq(schedules.memberId, members.id))
    .where(
      and(
        eq(schedules.orgId, orgId),
        eq(schedules.teamId, c.req.param("teamId"))
      )
    );
  return c.json(teamSchedules);
});

// Get who's currently on-call
schedulesApi.get("/team/:teamId/current", async (c) => {
  const db = getDb(c.env.DB);
  const orgId = c.get("orgId");
  const onCall = await getOnCall(db, orgId, c.req.param("teamId"));
  if (!onCall) return c.json({ onCall: null });
  return c.json({ onCall });
});

// Create schedule entry
schedulesApi.post(
  "/",
  zValidator("json", createScheduleSchema),
  async (c) => {
    const db = getDb(c.env.DB);
    const orgId = c.get("orgId");
    const data = c.req.valid("json");
    const [schedule] = await db
      .insert(schedules)
      .values({ ...data, orgId })
      .returning();
    return c.json(schedule, 201);
  }
);

// Delete schedule entry
schedulesApi.delete("/:id", async (c) => {
  const db = getDb(c.env.DB);
  const orgId = c.get("orgId");
  await db
    .delete(schedules)
    .where(
      and(eq(schedules.id, c.req.param("id")), eq(schedules.orgId, orgId))
    );
  return c.json({ ok: true });
});

export { schedulesApi };
