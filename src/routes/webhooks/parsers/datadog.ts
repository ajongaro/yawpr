import type { IncidentSeverity } from "../../../lib/types";

type ParsedWebhook = {
  severity: IncidentSeverity;
  title: string;
  description: string;
};

/** Parse a Datadog webhook payload */
export function parseDatadog(
  body: string,
  defaultSeverity: IncidentSeverity
): ParsedWebhook | null {
  try {
    const data = JSON.parse(body);

    const title = data.title || data.event_title || "Datadog Alert";
    const description = data.body || data.event_msg || data.text || "";

    // Map Datadog priority to severity
    let severity: IncidentSeverity;
    const priority = (data.priority || "").toLowerCase();
    const alertType = (data.alert_type || "").toLowerCase();

    if (alertType === "error" || priority === "p1" || priority === "critical") {
      severity = "fire";
    } else if (
      alertType === "warning" ||
      priority === "p2" ||
      priority === "high"
    ) {
      severity = "warning";
    } else {
      severity = defaultSeverity;
    }

    return { severity, title, description };
  } catch {
    return null;
  }
}
