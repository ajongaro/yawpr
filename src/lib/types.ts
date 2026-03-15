import type { organizations, slackInstallations } from "../db/schema";

export type Env = {
  Bindings: {
    DB: D1Database;
    NOTIFICATION_QUEUE: Queue;
    APP_URL: string;
    SLACK_CLIENT_ID: string;
    SLACK_CLIENT_SECRET: string;
    BETTER_AUTH_SECRET: string;
    ENCRYPTION_KEY: string;
    SLACK_SIGNING_SECRET: string;
    NTFY_BASE_URL: string;
    STRIPE_SECRET_KEY: string;
    STRIPE_PRICE_ID: string;
  };
  Variables: {
    user: { id: string; name: string; email: string; image?: string };
    session: { id: string; userId: string; activeOrganizationId?: string };
    orgId: string;
    org: typeof organizations.$inferSelect;
    slackInstallation: typeof slackInstallations.$inferSelect;
    rawBody: string;
  };
};

export type IncidentSeverity = "fire" | "warning" | "info";
export type IncidentStatus = "active" | "acknowledged" | "resolved";
export type IncidentSource = "slack" | "web" | "webhook";
export type IncidentEventType =
  | "created"
  | "acknowledged"
  | "resolved"
  | "escalated"
  | "comment";
export type NotificationChannel = "slack_dm" | "ntfy" | "push";
export type NotificationStatus = "queued" | "sent" | "failed";
export type MemberRole = "admin" | "member";

export type NotificationMessage = {
  incidentId: string;
  orgId: string;
  recipientId: string;
  channel: NotificationChannel;
  slackUserId?: string;
  ntfyTopic?: string;
  pushToken?: string;
  botToken?: string;
  title: string;
  body: string;
  severity: IncidentSeverity;
  incidentUrl: string;
};
