import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import type { Env } from "../../lib/types";
import { getDb } from "../../db/client";
import { onCallSchedules, teamMembers } from "../../db/schema";
import { getOnCall } from "../../services/oncall";

const schedulesApi = new Hono<Env>();

const createScheduleSchema = z.object({
  teamId: z.string().min(1),
  memberId: z.string().min(1),
  startTime: z.string().transform((s) => new Date(s)),
  endTime: z.string().transform((s) => new Date(s)),
});

// List schedules for a team
schedulesApi.get("/team/:teamId", async (c) => {
  const db = getDb(c.env.DB);
  const schedules = await db
    .select({
      schedule: onCallSchedules,
      member: teamMembers,
    })
    .from(onCallSchedules)
    .innerJoin(teamMembers, eq(onCallSchedules.memberId, teamMembers.id))
    .where(eq(onCallSchedules.teamId, c.req.param("teamId")));
  return c.json(schedules);
});

// Get who's currently on-call
schedulesApi.get("/team/:teamId/current", async (c) => {
  const db = getDb(c.env.DB);
  const onCall = await getOnCall(db, c.req.param("teamId"));
  if (!onCall) return c.json({ onCall: null });
  return c.json({ onCall });
});

// Create schedule entry
schedulesApi.post("/", zValidator("json", createScheduleSchema), async (c) => {
  const db = getDb(c.env.DB);
  const data = c.req.valid("json");
  const [schedule] = await db
    .insert(onCallSchedules)
    .values(data)
    .returning();
  return c.json(schedule, 201);
});

// Delete schedule entry
schedulesApi.delete("/:id", async (c) => {
  const db = getDb(c.env.DB);
  await db
    .delete(onCallSchedules)
    .where(eq(onCallSchedules.id, c.req.param("id")));
  return c.json({ ok: true });
});

export { schedulesApi };
