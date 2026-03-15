import { Hono } from "hono";
import type { Env } from "./lib/types";
import type { QueueMessage } from "./lib/types";
import { errorHandler } from "./middleware/error-handler";
import { authRoutes } from "./routes/auth/index";
import { incidentsApi } from "./routes/api/incidents";
import { teamsApi } from "./routes/api/teams";
import { slackInstall } from "./routes/slack/install";
import { slackCommands } from "./routes/slack/commands";
import { slackInteractions } from "./routes/slack/interactions";
import { webhookIngest } from "./routes/webhooks/ingest";
import { checkoutApi } from "./routes/api/checkout";
import { marketing } from "./routes/marketing";
import { pages } from "./routes/pages";
import { authGuard } from "./middleware/auth";
import { handleNotificationQueue } from "./queue/consumer";

const app = new Hono<Env>();

// Global error handler
app.use("*", errorHandler);

// ─── Marketing pages (public) ────────────────────────────
app.route("/", marketing);

// ─── Auth (Better Auth handles /api/auth/*) ──────────────
app.route("/api/auth", authRoutes);

// ─── API routes (protected) ─────────────────────────────
app.use("/api/teams/*", authGuard);
app.use("/api/incidents/*", authGuard);
app.route("/api/teams", teamsApi);
app.route("/api/incidents", incidentsApi);
app.route("/api/checkout", checkoutApi);

// ─── Slack routes (commands/interactions before install — install has authGuard wildcard)
app.route("/slack/commands", slackCommands);
app.route("/slack/interactions", slackInteractions);
app.route("/slack", slackInstall);

// ─── Webhook ingestion (public, verified via HMAC) ──────
app.route("/webhooks", webhookIngest);

// ─── App (authenticated dashboard) ──────────────────────
app.route("/app", pages);

// ─── Worker export ───────────────────────────────────────
export default {
  fetch: app.fetch,
  async queue(
    batch: MessageBatch<QueueMessage>,
    env: Env["Bindings"]
  ) {
    await handleNotificationQueue(batch, env);
  },
};
