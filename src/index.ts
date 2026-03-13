import { Hono } from "hono";
import type { Env } from "./lib/types";
import type { NotificationMessage } from "./lib/types";
import { errorHandler } from "./middleware/error-handler";
import { authRoutes } from "./routes/auth/index";
import { alertsApi } from "./routes/api/alerts";
import { teamsApi } from "./routes/api/teams";
import { schedulesApi } from "./routes/api/schedules";
import { slackRoutes } from "./routes/slack/index";
import { dashboard } from "./routes/dashboard";
import { authGuard } from "./middleware/auth";
import { handleNotificationQueue } from "./queue/consumer";

const app = new Hono<Env>();

// Global error handler
app.use("*", errorHandler);

// ─── Auth (Better Auth handles /api/auth/*) ──────────────
app.route("/api/auth", authRoutes);

// ─── API routes (protected) ─────────────────────────────
app.use("/api/teams/*", authGuard);
app.use("/api/alerts/*", authGuard);
app.use("/api/schedules/*", authGuard);
app.route("/api/teams", teamsApi);
app.route("/api/alerts", alertsApi);
app.route("/api/schedules", schedulesApi);

// ─── Slack routes (verified via HMAC) ────────────────────
app.route("/slack", slackRoutes);

// ─── Dashboard (SSR pages) ──────────────────────────────
app.route("/", dashboard);

// ─── Worker export ───────────────────────────────────────
export default {
  fetch: app.fetch,
  async queue(
    batch: MessageBatch<NotificationMessage[]>,
    env: Env["Bindings"]
  ) {
    await handleNotificationQueue(batch, env);
  },
};
