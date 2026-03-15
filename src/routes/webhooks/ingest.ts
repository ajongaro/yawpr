import { Hono } from "hono";
import { eq, and, ne } from "drizzle-orm";
import type { Env } from "../../lib/types";
import type { IncidentSeverity } from "../../lib/types";
import { webhookVerify } from "../../middleware/webhook-verify";
import { getDb } from "../../db/client";
import { incidents } from "../../db/schema";
import { createIncident, resolveIncident } from "../../services/incident";
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
  let parsed: { severity: IncidentSeverity; title: string; description: string; dedupKey?: string; resolved?: boolean } | null = null;

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

  // Auto-resolve: if the webhook signals resolution and we have a dedup key,
  // find and resolve the matching active incident
  if (parsed.resolved && parsed.dedupKey) {
    const [existing] = await db
      .select()
      .from(incidents)
      .where(
        and(
          eq(incidents.orgId, source.orgId),
          eq(incidents.dedupKey, parsed.dedupKey),
          ne(incidents.status, "resolved")
        )
      );

    if (existing) {
      await resolveIncident(
        db,
        source.orgId,
        existing.id,
        `webhook:${source.id}`,
        "Auto-resolved by monitoring tool"
      );
      return c.json({ ok: true, resolved: existing.id });
    }

    // No matching incident to resolve — nothing to do
    return c.json({ ok: true, message: "No active incident to resolve" });
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
      dedupKey: parsed.dedupKey,
    }
  );

  return c.json({ ok: true, incidentId: incident.id }, 201);
});

export { webhookIngest };
