import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import type { Env } from "../../lib/types";
import { getDb } from "../../db/client";
import { incidents, incidentEvents, slackInstallations } from "../../db/schema";
import {
  createIncident,
  acknowledgeIncident,
  resolveIncident,
  addComment,
} from "../../services/incident";
import { decryptSecret } from "../../lib/crypto";
import { checkIncidentLimit } from "../../middleware/limits";

const incidentsApi = new Hono<Env>();

const createIncidentSchema = z.object({
  teamId: z.string().min(1),
  severity: z.enum(["fire", "warning", "info"]).default("info"),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

const commentSchema = z.object({
  message: z.string().min(1).max(2000),
});

// List incidents (org-scoped)
incidentsApi.get("/", async (c) => {
  const db = getDb(c.env.DB);
  const orgId = c.get("orgId");
  const status = c.req.query("status");
  const teamId = c.req.query("teamId");

  const conditions = [eq(incidents.orgId, orgId)];
  if (status) conditions.push(eq(incidents.status, status as any));
  if (teamId) conditions.push(eq(incidents.teamId, teamId));

  const results = await db
    .select()
    .from(incidents)
    .where(and(...conditions))
    .orderBy(desc(incidents.createdAt))
    .limit(100);

  return c.json(results);
});

// Get incident detail
incidentsApi.get("/:id", async (c) => {
  const db = getDb(c.env.DB);
  const orgId = c.get("orgId");
  const [incident] = await db
    .select()
    .from(incidents)
    .where(
      and(eq(incidents.id, c.req.param("id")), eq(incidents.orgId, orgId))
    );
  if (!incident) return c.json({ error: "Incident not found" }, 404);
  return c.json(incident);
});

// Get incident events
incidentsApi.get("/:id/events", async (c) => {
  const db = getDb(c.env.DB);
  const events = await db
    .select()
    .from(incidentEvents)
    .where(eq(incidentEvents.incidentId, c.req.param("id")))
    .orderBy(incidentEvents.createdAt);
  return c.json(events);
});

// Create incident
incidentsApi.post(
  "/",
  zValidator("json", createIncidentSchema),
  async (c) => {
    const db = getDb(c.env.DB);
    const orgId = c.get("orgId");
    const data = c.req.valid("json");
    const user = c.get("user");

    // Check quota
    const limit = await checkIncidentLimit(db, orgId);
    if (!limit.allowed) {
      return c.json(
        {
          error: `Monthly incident limit reached (${limit.current}/${limit.max})`,
        },
        402
      );
    }

    // Get bot token if Slack is connected
    let botToken: string | undefined;
    const [installation] = await db
      .select()
      .from(slackInstallations)
      .where(eq(slackInstallations.orgId, orgId));
    if (installation) {
      botToken = await decryptSecret(
        installation.botToken,
        c.env.ENCRYPTION_KEY
      );
    }

    const incident = await createIncident(
      db,
      c.env.NOTIFICATION_QUEUE,
      c.env.APP_URL,
      {
        ...data,
        orgId,
        source: "web",
        createdBy: user?.id,
        botToken,
      }
    );

    return c.json(incident, 201);
  }
);

// Acknowledge incident
incidentsApi.post("/:id/acknowledge", async (c) => {
  const db = getDb(c.env.DB);
  const orgId = c.get("orgId");
  const user = c.get("user");
  const incident = await acknowledgeIncident(
    db,
    orgId,
    c.req.param("id"),
    user?.id
  );
  return c.json(incident);
});

// Resolve incident
incidentsApi.post("/:id/resolve", async (c) => {
  const db = getDb(c.env.DB);
  const orgId = c.get("orgId");
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const incident = await resolveIncident(
    db,
    orgId,
    c.req.param("id"),
    user?.id,
    body.message
  );
  return c.json(incident);
});

// Add comment
incidentsApi.post(
  "/:id/comment",
  zValidator("json", commentSchema),
  async (c) => {
    const db = getDb(c.env.DB);
    const user = c.get("user");
    const { message } = c.req.valid("json");
    await addComment(db, c.req.param("id"), user?.id, message);
    return c.json({ ok: true });
  }
);

export { incidentsApi };
