import { eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { members } from "../db/schema";
import { generateNtfyTopic } from "../lib/crypto";

/**
 * Get an existing ntfy topic for a Slack user, or generate a new one.
 * This ensures each person has one topic forever, regardless of how
 * many teams they're on.
 */
export async function getOrCreateNtfyTopic(
  db: Database,
  slackUserId: string
): Promise<string> {
  const [existing] = await db
    .select({ ntfyTopic: members.ntfyTopic })
    .from(members)
    .where(eq(members.slackUserId, slackUserId))
    .limit(1);

  if (existing?.ntfyTopic) return existing.ntfyTopic;
  return generateNtfyTopic();
}
