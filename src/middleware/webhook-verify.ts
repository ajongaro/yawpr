import type { Context, Next } from "hono";
import { eq, and } from "drizzle-orm";
import type { Env } from "../lib/types";
import { verifyHmacSignature } from "../lib/crypto";
import { getDb } from "../db/client";
import { webhookSources } from "../db/schema";

export async function webhookVerify(c: Context<Env>, next: Next) {
  const sourceId = c.req.param("sourceId");
  if (!sourceId) {
    return c.json({ error: "Missing source ID" }, 400);
  }

  const db = getDb(c.env.DB);
  const [source] = await db
    .select()
    .from(webhookSources)
    .where(and(eq(webhookSources.id, sourceId), eq(webhookSources.active, 1)));

  if (!source) {
    return c.json({ error: "Webhook source not found or inactive" }, 404);
  }

  const body = await c.req.text();
  c.set("rawBody", body);

  // Check for HMAC signature in common header locations
  const signature =
    c.req.header("x-signature-256") ||
    c.req.header("x-hub-signature-256") ||
    c.req.header("x-webhook-signature");

  if (signature) {
    // Strip "sha256=" prefix if present
    const sig = signature.replace(/^sha256=/, "");
    const valid = await verifyHmacSignature(source.secret, sig, body);
    if (!valid) {
      return c.json({ error: "Invalid webhook signature" }, 401);
    }
  }

  // Store source on context for downstream use
  (c as any).webhookSource = source;
  await next();
}
