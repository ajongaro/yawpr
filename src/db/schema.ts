import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ─── Teams ───────────────────────────────────────────────
export const teams = sqliteTable("teams", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slackChannelId: text("slack_channel_id"),
  ntfyTopic: text("ntfy_topic"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ─── Team Members ────────────────────────────────────────
export const teamMembers = sqliteTable("team_members", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id),
  userId: text("user_id").notNull(),
  slackUserId: text("slack_user_id"),
  ntfyTopic: text("ntfy_topic"),
  role: text("role", { enum: ["admin", "member"] })
    .notNull()
    .default("member"),
});

// ─── On-Call Schedules ───────────────────────────────────
export const onCallSchedules = sqliteTable("on_call_schedules", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id),
  memberId: text("member_id")
    .notNull()
    .references(() => teamMembers.id),
  startTime: integer("start_time", { mode: "timestamp" }).notNull(),
  endTime: integer("end_time", { mode: "timestamp" }).notNull(),
});

// ─── Alerts ──────────────────────────────────────────────
export const alerts = sqliteTable("alerts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id),
  severity: text("severity", { enum: ["fire", "info"] })
    .notNull()
    .default("info"),
  title: text("title").notNull(),
  description: text("description"),
  source: text("source", { enum: ["slack", "web"] })
    .notNull()
    .default("web"),
  status: text("status", { enum: ["active", "acknowledged", "resolved"] })
    .notNull()
    .default("active"),
  createdBy: text("created_by"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  acknowledgedAt: integer("acknowledged_at", { mode: "timestamp" }),
  resolvedAt: integer("resolved_at", { mode: "timestamp" }),
});

// ─── Alert Events (audit log) ────────────────────────────
export const alertEvents = sqliteTable("alert_events", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  alertId: text("alert_id")
    .notNull()
    .references(() => alerts.id),
  eventType: text("event_type", {
    enum: ["created", "acknowledged", "resolved", "escalated", "comment"],
  }).notNull(),
  actorId: text("actor_id"),
  message: text("message"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ─── Notification Log ────────────────────────────────────
export const notificationLog = sqliteTable("notification_log", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  alertId: text("alert_id")
    .notNull()
    .references(() => alerts.id),
  recipientId: text("recipient_id").notNull(),
  channel: text("channel", { enum: ["slack_dm", "ntfy"] }).notNull(),
  status: text("status", { enum: ["queued", "sent", "failed"] })
    .notNull()
    .default("queued"),
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
