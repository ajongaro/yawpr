import type { Context, Next } from "hono";
import { eq, and } from "drizzle-orm";
import type { Env } from "../lib/types";
import { verifySlackSignature } from "../lib/crypto";
import { getDb } from "../db/client";
import { slackInstallations, members } from "../db/schema";

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

  // Parse team_id and user_id from the request
  const params = new URLSearchParams(body);
  let slackTeamId = params.get("team_id");
  let slackUserId = params.get("user_id");

  if (!slackTeamId || !slackUserId) {
    const payloadStr = params.get("payload");
    if (payloadStr) {
      try {
        const payload = JSON.parse(payloadStr);
        slackTeamId = slackTeamId || payload.team?.id;
        slackUserId = slackUserId || payload.user?.id;
      } catch {
        // ignore
      }
    }
  }

  if (!slackTeamId) {
    return c.json({ error: "Cannot determine Slack team" }, 400);
  }

  const db = getDb(c.env.DB);

  // If we have a user ID, find which org they belong to via team membership
  // This correctly routes multi-org workspaces to the user's org
  if (slackUserId) {
    const [membership] = await db
      .select({ orgId: members.orgId })
      .from(members)
      .where(eq(members.slackUserId, slackUserId))
      .limit(1);

    if (membership) {
      const [installation] = await db
        .select()
        .from(slackInstallations)
        .where(
          and(
            eq(slackInstallations.orgId, membership.orgId),
            eq(slackInstallations.slackTeamId, slackTeamId)
          )
        );

      if (installation) {
        c.set("slackInstallation", installation);
        await next();
        return;
      }
    }
  }

  // Fallback: look up by Slack team ID (first installation wins)
  // This handles the case where the user hasn't been added to any team yet
  const [installation] = await db
    .select()
    .from(slackInstallations)
    .where(eq(slackInstallations.slackTeamId, slackTeamId));

  if (!installation) {
    return c.json({ error: "Slack workspace not connected" }, 404);
  }

  c.set("slackInstallation", installation);
  await next();
}
