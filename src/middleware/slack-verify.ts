import type { Context, Next } from "hono";
import type { Env } from "../lib/types";
import { verifySlackSignature } from "../lib/crypto";

const FIVE_MINUTES = 5 * 60;

export async function slackVerify(c: Context<Env>, next: Next) {
  const signature = c.req.header("x-slack-signature");
  const timestamp = c.req.header("x-slack-request-timestamp");

  if (!signature || !timestamp) {
    return c.json({ error: "Missing Slack signature headers" }, 401);
  }

  // Reject requests older than 5 minutes to prevent replay attacks
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > FIVE_MINUTES) {
    return c.json({ error: "Request too old" }, 401);
  }

  const body = await c.req.text();
  // Store raw body for downstream handlers
  c.set("rawBody" as never, body);

  const valid = await verifySlackSignature(
    c.env.SLACK_SIGNING_SECRET,
    signature,
    timestamp,
    body
  );

  if (!valid) {
    return c.json({ error: "Invalid signature" }, 401);
  }

  await next();
}
