import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import type { Env } from "../../lib/types";
import { getDb } from "../../db/client";
import { teams, teamMembers } from "../../db/schema";

const teamsApi = new Hono<Env>();

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  slackChannelId: z.string().optional(),
  ntfyTopic: z.string().optional(),
});

const addMemberSchema = z.object({
  userId: z.string().min(1),
  slackUserId: z.string().optional(),
  ntfyTopic: z.string().optional(),
  role: z.enum(["admin", "member"]).default("member"),
});

// List teams
teamsApi.get("/", async (c) => {
  const db = getDb(c.env.DB);
  const allTeams = await db.select().from(teams);
  return c.json(allTeams);
});

// Get team by ID
teamsApi.get("/:id", async (c) => {
  const db = getDb(c.env.DB);
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, c.req.param("id")));
  if (!team) return c.json({ error: "Team not found" }, 404);
  return c.json(team);
});

// Create team
teamsApi.post("/", zValidator("json", createTeamSchema), async (c) => {
  const db = getDb(c.env.DB);
  const data = c.req.valid("json");
  const [team] = await db.insert(teams).values(data).returning();
  return c.json(team, 201);
});

// Update team
teamsApi.put("/:id", zValidator("json", createTeamSchema.partial()), async (c) => {
  const db = getDb(c.env.DB);
  const data = c.req.valid("json");
  const [team] = await db
    .update(teams)
    .set(data)
    .where(eq(teams.id, c.req.param("id")))
    .returning();
  if (!team) return c.json({ error: "Team not found" }, 404);
  return c.json(team);
});

// Delete team
teamsApi.delete("/:id", async (c) => {
  const db = getDb(c.env.DB);
  await db.delete(teams).where(eq(teams.id, c.req.param("id")));
  return c.json({ ok: true });
});

// ─── Members ─────────────────────────────────────────────

// List team members
teamsApi.get("/:id/members", async (c) => {
  const db = getDb(c.env.DB);
  const members = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.teamId, c.req.param("id")));
  return c.json(members);
});

// Add member to team
teamsApi.post(
  "/:id/members",
  zValidator("json", addMemberSchema),
  async (c) => {
    const db = getDb(c.env.DB);
    const data = c.req.valid("json");
    const [member] = await db
      .insert(teamMembers)
      .values({ ...data, teamId: c.req.param("id") })
      .returning();
    return c.json(member, 201);
  }
);

// Remove member
teamsApi.delete("/:teamId/members/:memberId", async (c) => {
  const db = getDb(c.env.DB);
  await db
    .delete(teamMembers)
    .where(eq(teamMembers.id, c.req.param("memberId")));
  return c.json({ ok: true });
});

export { teamsApi };
