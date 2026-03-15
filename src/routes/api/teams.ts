import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import type { Env } from "../../lib/types";
import { getDb } from "../../db/client";
import { teams, members } from "../../db/schema";
import { checkTeamLimit, checkMemberLimit } from "../../middleware/limits";

const teamsApi = new Hono<Env>();

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  slackChannelId: z.string().optional(),
});

const addMemberSchema = z.object({
  displayName: z.string().min(1),
  userId: z.string().optional(),
  slackUserId: z.string().optional(),
  ntfyTopic: z.string().optional(),
  role: z.enum(["admin", "member"]).default("member"),
});

// List teams (org-scoped)
teamsApi.get("/", async (c) => {
  const db = getDb(c.env.DB);
  const orgId = c.get("orgId");
  const allTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.orgId, orgId));
  return c.json(allTeams);
});

// Get team by ID
teamsApi.get("/:id", async (c) => {
  const db = getDb(c.env.DB);
  const orgId = c.get("orgId");
  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, c.req.param("id")), eq(teams.orgId, orgId)));
  if (!team) return c.json({ error: "Team not found" }, 404);
  return c.json(team);
});

// Create team
teamsApi.post("/", zValidator("json", createTeamSchema), async (c) => {
  const db = getDb(c.env.DB);
  const orgId = c.get("orgId");
  const data = c.req.valid("json");

  const limit = await checkTeamLimit(db, orgId);
  if (!limit.allowed) {
    return c.json(
      { error: `Team limit reached (${limit.current}/${limit.max})` },
      402
    );
  }

  const [team] = await db
    .insert(teams)
    .values({ ...data, orgId })
    .returning();
  return c.json(team, 201);
});

// Update team
teamsApi.put(
  "/:id",
  zValidator("json", createTeamSchema.partial()),
  async (c) => {
    const db = getDb(c.env.DB);
    const orgId = c.get("orgId");
    const data = c.req.valid("json");
    const [team] = await db
      .update(teams)
      .set(data)
      .where(and(eq(teams.id, c.req.param("id")), eq(teams.orgId, orgId)))
      .returning();
    if (!team) return c.json({ error: "Team not found" }, 404);
    return c.json(team);
  }
);

// Delete team
teamsApi.delete("/:id", async (c) => {
  const db = getDb(c.env.DB);
  const orgId = c.get("orgId");
  await db
    .delete(teams)
    .where(and(eq(teams.id, c.req.param("id")), eq(teams.orgId, orgId)));
  return c.json({ ok: true });
});

// ─── Members ─────────────────────────────────────────────

// List team members
teamsApi.get("/:id/members", async (c) => {
  const db = getDb(c.env.DB);
  const orgId = c.get("orgId");
  const teamMembers = await db
    .select()
    .from(members)
    .where(
      and(eq(members.teamId, c.req.param("id")), eq(members.orgId, orgId))
    );
  return c.json(teamMembers);
});

// Add member to team
teamsApi.post(
  "/:id/members",
  zValidator("json", addMemberSchema),
  async (c) => {
    const db = getDb(c.env.DB);
    const orgId = c.get("orgId");
    const teamId = c.req.param("id");
    const data = c.req.valid("json");

    const limit = await checkMemberLimit(db, orgId, teamId);
    if (!limit.allowed) {
      return c.json(
        { error: `Member limit reached (${limit.current}/${limit.max})` },
        402
      );
    }

    const [member] = await db
      .insert(members)
      .values({ ...data, orgId, teamId })
      .returning();
    return c.json(member, 201);
  }
);

// Remove member
teamsApi.delete("/:teamId/members/:memberId", async (c) => {
  const db = getDb(c.env.DB);
  const orgId = c.get("orgId");
  await db
    .delete(members)
    .where(
      and(eq(members.id, c.req.param("memberId")), eq(members.orgId, orgId))
    );
  return c.json({ ok: true });
});

export { teamsApi };
