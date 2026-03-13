import { SEVERITY_PRIORITY } from "../lib/constants";

/** Publish a notification to an ntfy.sh topic */
export async function publishNtfy(
  baseUrl: string,
  topic: string,
  title: string,
  message: string,
  severity: string,
  clickUrl: string
) {
  const priority = SEVERITY_PRIORITY[severity] ?? 3;

  const res = await fetch(`${baseUrl}/${topic}`, {
    method: "POST",
    headers: {
      Title: title,
      Priority: String(priority),
      Tags: severity === "fire" ? "rotating_light,fire" : "information_source",
      Click: clickUrl,
    },
    body: message,
  });

  if (!res.ok) {
    throw new Error(`ntfy publish failed: ${res.status} ${await res.text()}`);
  }
}
