import type { IncidentSeverity } from "../../../lib/types";

type ParsedWebhook = {
  severity: IncidentSeverity;
  title: string;
  description: string;
};

const VALID_SEVERITIES = new Set(["fire", "warning", "info"]);

/** Parse a generic webhook payload: { severity?, title, description? } */
export function parseGeneric(
  body: string,
  defaultSeverity: IncidentSeverity
): ParsedWebhook | null {
  try {
    const data = JSON.parse(body);

    const title = data.title;
    if (!title || typeof title !== "string") {
      return null;
    }

    const severity: IncidentSeverity =
      data.severity && VALID_SEVERITIES.has(data.severity)
        ? data.severity
        : defaultSeverity;

    const description =
      typeof data.description === "string" ? data.description : "";

    return { severity, title, description };
  } catch {
    return null;
  }
}
