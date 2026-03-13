import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import type { Env } from "../../lib/types";
import { getDb } from "../../db/client";
import { alerts, alertEvents } from "../../db/schema";
import {
  createAlert,
  acknowledgeAlert,
  resolveAlert,
  addComment,
} from "../../services/alert";

const alertsApi = new Hono<Env>();

const createAlertSchema = z.object({
  teamId: z.string().min(1),
  severity: z.enum(["fire", "info"]).default("info"),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

const commentSchema = z.object({
  message: z.string().min(1).max(2000),
});

// List alerts (with optional status filter)
alertsApi.get("/", async (c) => {
  const db = getDb(c.env.DB);
  const status = c.req.query("status");
  const teamId = c.req.query("teamId");

  let query = db.select().from(alerts).orderBy(desc(alerts.createdAt));

  // Apply filters via where clauses
  const conditions = [];
  if (status) conditions.push(eq(alerts.status, status as any));
  if (teamId) conditions.push(eq(alerts.teamId, teamId));

  if (conditions.length > 0) {
    const { and } = await import("drizzle-orm");
    query = query.where(and(...conditions)) as any;
  }

  const results = await query.limit(100);
  return c.json(results);
});

// Get alert detail
alertsApi.get("/:id", async (c) => {
  const db = getDb(c.env.DB);
  const [alert] = await db
    .select()
    .from(alerts)
    .where(eq(alerts.id, c.req.param("id")));
  if (!alert) return c.json({ error: "Alert not found" }, 404);
  return c.json(alert);
});

// Get alert events (audit log)
alertsApi.get("/:id/events", async (c) => {
  const db = getDb(c.env.DB);
  const events = await db
    .select()
    .from(alertEvents)
    .where(eq(alertEvents.alertId, c.req.param("id")))
    .orderBy(alertEvents.createdAt);
  return c.json(events);
});

// Create alert
alertsApi.post("/", zValidator("json", createAlertSchema), async (c) => {
  const db = getDb(c.env.DB);
  const data = c.req.valid("json");
  const user = c.get("user" as never) as any;

  const alert = await createAlert(db, c.env.NOTIFICATION_QUEUE, c.env.APP_URL, {
    ...data,
    source: "web",
    createdBy: user?.id,
  });

  return c.json(alert, 201);
});

// Acknowledge alert
alertsApi.post("/:id/acknowledge", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("user" as never) as any;
  const alert = await acknowledgeAlert(db, c.req.param("id"), user?.id);
  return c.json(alert);
});

// Resolve alert
alertsApi.post("/:id/resolve", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("user" as never) as any;
  const body = await c.req.json().catch(() => ({}));
  const alert = await resolveAlert(
    db,
    c.req.param("id"),
    user?.id,
    body.message
  );
  return c.json(alert);
});

// Add comment
alertsApi.post(
  "/:id/comment",
  zValidator("json", commentSchema),
  async (c) => {
    const db = getDb(c.env.DB);
    const user = c.get("user" as never) as any;
    const { message } = c.req.valid("json");
    await addComment(db, c.req.param("id"), user?.id, message);
    return c.json({ ok: true });
  }
);

export { alertsApi };
