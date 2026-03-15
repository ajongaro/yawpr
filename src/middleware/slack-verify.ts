import type { Context, Next } from "hono";
import { eq } from "drizzle-orm";
import type { Env } from "../lib/types";
import { verifySlackSignature } from "../lib/crypto";
import { getDb } from "../db/client";
import { slackInstallations } from "../db/schema";

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
  c.set("rawBody", body);

  // Verify using the global signing secret (single Slack app)
  const valid = await verifySlackSignature(
    c.env.SLACK_SIGNING_SECRET,
    signature,
    timestamp,
    body
  );

  if (!valid) {
    return c.json({ error: "Invalid signature" }, 401);
  }

  // Parse team_id to find the installation for org context
  const params = new URLSearchParams(body);
  let teamId = params.get("team_id");

  if (!teamId) {
    const payloadStr = params.get("payload");
    if (payloadStr) {
      try {
        const payload = JSON.parse(payloadStr);
        teamId = payload.team?.id;
      } catch {
        // ignore
      }
    }
  }

  if (!teamId) {
    return c.json({ error: "Cannot determine Slack team" }, 400);
  }

  const db = getDb(c.env.DB);
  const [installation] = await db
    .select()
    .from(slackInstallations)
    .where(eq(slackInstallations.slackTeamId, teamId));

  if (!installation) {
    return c.json({ error: "Slack workspace not connected" }, 404);
  }

  c.set("slackInstallation", installation);
  await next();
}
