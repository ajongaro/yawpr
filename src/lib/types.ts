export type Env = {
  Bindings: {
    DB: D1Database;
    NOTIFICATION_QUEUE: Queue;
    APP_URL: string;
    SLACK_CLIENT_ID: string;
    SLACK_CLIENT_SECRET: string;
    SLACK_SIGNING_SECRET: string;
    SLACK_BOT_TOKEN: string;
    BETTER_AUTH_SECRET: string;
    NTFY_BASE_URL: string;
  };
};

export type AlertSeverity = "fire" | "info";
export type AlertStatus = "active" | "acknowledged" | "resolved";
export type AlertSource = "slack" | "web";
export type AlertEventType =
  | "created"
  | "acknowledged"
  | "resolved"
  | "escalated"
  | "comment";
export type NotificationChannel = "slack_dm" | "ntfy";
export type NotificationStatus = "queued" | "sent" | "failed";
export type TeamRole = "admin" | "member";

export type NotificationMessage = {
  alertId: string;
  recipientId: string;
  channel: NotificationChannel;
  slackUserId?: string;
  ntfyTopic?: string;
  title: string;
  body: string;
  severity: AlertSeverity;
  alertUrl: string;
};
