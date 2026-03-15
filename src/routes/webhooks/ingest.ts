import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { Env } from "../../lib/types";
import type { IncidentSeverity } from "../../lib/types";
import { webhookVerify } from "../../middleware/webhook-verify";
import { getDb } from "../../db/client";
import { slackInstallations } from "../../db/schema";
import { createIncident } from "../../services/incident";
import { decryptSecret } from "../../lib/crypto";
import { parseCloudWatch } from "./parsers/cloudwatch";
import { parseDatadog } from "./parsers/datadog";
import { parseGeneric } from "./parsers/generic";

const webhookIngest = new Hono<Env>();

webhookIngest.post("/:sourceId/ingest", webhookVerify, async (c) => {
  const source = (c as any).webhookSource;
  const rawBody = c.get("rawBody");

  // Handle SNS subscription confirmation
  try {
    const data = JSON.parse(rawBody);
    if (data.Type === "SubscriptionConfirmation" && data.SubscribeURL) {
      const url = new URL(data.SubscribeURL);
      if (!url.hostname.endsWith(".amazonaws.com")) {
        return c.json({ error: "Invalid SubscribeURL" }, 400);
      }
      await fetch(data.SubscribeURL);
      return c.json({ ok: true, message: "Subscription confirmed" });
    }
  } catch {
    // Not JSON or not SNS — continue
  }

  const defaultSeverity = source.severityDefault as IncidentSeverity;

  // Parse based on source type
  let parsed: { severity: IncidentSeverity; title: string; description: string } | null = null;

  switch (source.sourceType) {
    case "cloudwatch":
      parsed = parseCloudWatch(rawBody, defaultSeverity);
      break;
    case "datadog":
      parsed = parseDatadog(rawBody, defaultSeverity);
      break;
    case "grafana":
      // Grafana uses a similar format to generic
      parsed = parseGeneric(rawBody, defaultSeverity);
      break;
    case "generic":
    default:
      parsed = parseGeneric(rawBody, defaultSeverity);
      break;
  }

  if (!parsed) {
    return c.json({ error: "Could not parse webhook payload" }, 400);
  }

  const db = getDb(c.env.DB);

  // Get bot token for notifications (if Slack is connected)
  let botToken: string | undefined;
  const [installation] = await db
    .select()
    .from(slackInstallations)
    .where(eq(slackInstallations.orgId, source.orgId));

  if (installation) {
    botToken = await decryptSecret(installation.botToken, c.env.ENCRYPTION_KEY);
  }

  const incident = await createIncident(
    db,
    c.env.NOTIFICATION_QUEUE,
    c.env.APP_URL,
    {
      orgId: source.orgId,
      teamId: source.teamId,
      severity: parsed.severity,
      title: parsed.title,
      description: parsed.description,
      source: "webhook",
      createdBy: `webhook:${source.id}`,
      botToken,
    }
  );

  return c.json({ ok: true, incidentId: incident.id }, 201);
});

export { webhookIngest };
