import type { IncidentSeverity } from "../../../lib/types";

type ParsedWebhook = {
  severity: IncidentSeverity;
  title: string;
  description: string;
  dedupKey?: string;
};

/** Parse a CloudWatch alarm delivered via SNS */
export function parseCloudWatch(
  body: string,
  defaultSeverity: IncidentSeverity
): ParsedWebhook | null {
  try {
    const data = JSON.parse(body);

    // Handle SNS subscription confirmation
    if (data.Type === "SubscriptionConfirmation") {
      return null; // Handled separately in ingest route
    }

    // SNS notification wraps the CloudWatch alarm message
    let alarm: any;
    if (data.Type === "Notification" && data.Message) {
      alarm = JSON.parse(data.Message);
    } else {
      alarm = data;
    }

    const state = alarm.NewStateValue || "UNKNOWN";
    const alarmName = alarm.AlarmName || "CloudWatch Alarm";
    const reason = alarm.NewStateReason || "";
    const metric = alarm.Trigger?.MetricName || "";

    // Map CloudWatch states to severity
    let severity: IncidentSeverity;
    if (state === "ALARM") {
      severity = "fire";
    } else if (state === "INSUFFICIENT_DATA") {
      severity = "warning";
    } else {
      severity = defaultSeverity;
    }

    const title = `${alarmName}: ${state}`;
    const description = metric
      ? `Metric: ${metric}\n${reason}`
      : reason;

    // Dedup by alarm name — repeated firings of the same alarm won't create duplicates
    const dedupKey = `cloudwatch:${alarmName}`;

    return { severity, title, description, dedupKey };
  } catch {
    return null;
  }
}
