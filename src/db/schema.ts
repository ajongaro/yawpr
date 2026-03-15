import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";

// ─── Better Auth tables (required by the framework) ─────

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull(),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  activeOrganizationId: text("activeOrganizationId"),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }),
  updatedAt: integer("updatedAt", { mode: "timestamp" }),
});

export const baOrganization = sqliteTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  logo: text("logo"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  metadata: text("metadata"),
});

export const baMember = sqliteTable("member", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => baOrganization.id),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  role: text("role").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
});

export const invitation = sqliteTable("invitation", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => baOrganization.id),
  email: text("email").notNull(),
  role: text("role"),
  status: text("status").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  inviterId: text("inviterId")
    .notNull()
    .references(() => user.id),
});

// ─── Organizations ──────────────────────────────────────
export const organizations = sqliteTable("organizations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan", { enum: ["free", "pro", "enterprise"] })
    .notNull()
    .default("free"),
  maxTeams: integer("max_teams").default(5),
  maxMembersPerTeam: integer("max_members_per_team").default(20),
  maxAlertsPerMonth: integer("max_alerts_per_month").default(50),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ─── Slack Installations ────────────────────────────────
export const slackInstallations = sqliteTable(
  "slack_installations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id),
    slackTeamId: text("slack_team_id").notNull(),
    slackTeamName: text("slack_team_name"),
    botToken: text("bot_token").notNull(),
    botUserId: text("bot_user_id"),
    signingSecret: text("signing_secret").notNull(),
    installedBy: text("installed_by"),
    installedAt: integer("installed_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("uq_slack_installations_org_team").on(
      table.orgId,
      table.slackTeamId
    ),
    index("idx_slack_installations_team").on(table.slackTeamId),
  ]
);

// ─── Teams ──────────────────────────────────────────────
export const teams = sqliteTable(
  "teams",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    slackChannelId: text("slack_channel_id"),
    escalateToTeamId: text("escalate_to_team_id"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("uq_teams_org_slug").on(table.orgId, table.slug),
  ]
);

// ─── Members ────────────────────────────────────────────
export const members = sqliteTable(
  "members",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id),
    userId: text("user_id"),
    displayName: text("display_name").notNull(),
    slackUserId: text("slack_user_id"),
    ntfyTopic: text("ntfy_topic"),
    pushToken: text("push_token"),
    role: text("role", { enum: ["admin", "member"] })
      .notNull()
      .default("member"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("idx_members_org_team").on(table.orgId, table.teamId),
  ]
);


// ─── Incidents ──────────────────────────────────────────
export const incidents = sqliteTable(
  "incidents",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id),
    severity: text("severity", { enum: ["fire", "warning", "info"] }).notNull(),
    title: text("title").notNull(),
    description: text("description"),
    source: text("source", { enum: ["slack", "web", "webhook"] }).notNull(),
    status: text("status", {
      enum: ["active", "acknowledged", "resolved"],
    })
      .notNull()
      .default("active"),
    dedupKey: text("dedup_key"),
    createdBy: text("created_by"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    acknowledgedAt: integer("acknowledged_at", { mode: "timestamp" }),
    acknowledgedBy: text("acknowledged_by"),
    resolvedAt: integer("resolved_at", { mode: "timestamp" }),
    resolvedBy: text("resolved_by"),
  },
  (table) => [
    index("idx_incidents_org_status").on(
      table.orgId,
      table.status,
      table.createdAt
    ),
  ]
);

// ─── Incident Events (audit log) ────────────────────────
export const incidentEvents = sqliteTable("incident_events", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  incidentId: text("incident_id")
    .notNull()
    .references(() => incidents.id),
  eventType: text("event_type", {
    enum: ["created", "acknowledged", "resolved", "escalated", "comment"],
  }).notNull(),
  actorId: text("actor_id"),
  message: text("message"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ─── Notifications ──────────────────────────────────────
export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id),
    incidentId: text("incident_id")
      .notNull()
      .references(() => incidents.id),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => members.id),
    channel: text("channel", { enum: ["slack_dm", "ntfy", "push"] }).notNull(),
    status: text("status", { enum: ["queued", "sent", "failed"] })
      .notNull()
      .default("queued"),
    errorMessage: text("error_message"),
    sentAt: integer("sent_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("idx_notifications_incident").on(table.incidentId),
  ]
);

// ─── Webhook Sources ────────────────────────────────────
export const webhookSources = sqliteTable("webhook_sources", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id),
  name: text("name").notNull(),
  sourceType: text("source_type", {
    enum: ["cloudwatch", "datadog", "grafana", "generic"],
  }).notNull(),
  secret: text("secret").notNull(),
  severityDefault: text("severity_default", {
    enum: ["fire", "warning", "info"],
  })
    .notNull()
    .default("warning"),
  active: integer("active").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
