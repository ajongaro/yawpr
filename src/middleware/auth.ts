import type { Context, Next } from "hono";
import { eq, and } from "drizzle-orm";
import type { Env } from "../lib/types";
import { getAuth } from "../routes/auth/auth";
import { getDb } from "../db/client";
import { organizations, members, account } from "../db/schema";

export async function authGuard(c: Context<Env>, next: Next) {
  try {
    const auth = getAuth(c.env);
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session) {
      if (c.req.header("Accept")?.includes("application/json")) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      return c.redirect("/app/login");
    }

    c.set("user", session.user as Env["Variables"]["user"]);
    c.set("session", session.session as Env["Variables"]["session"]);

    let activeOrgId = (session.session as any).activeOrganizationId;

    if (!activeOrgId) {
      const db = getDb(c.env.DB);

      // Look up the user's Slack ID from their OAuth account
      const [acct] = await db
        .select()
        .from(account)
        .where(
          and(
            eq(account.userId, session.user.id),
            eq(account.providerId, "slack")
          )
        );

      if (acct) {
        // Find an org this person belongs to via team membership
        const [membership] = await db
          .select({ orgId: members.orgId })
          .from(members)
          .where(eq(members.slackUserId, acct.accountId))
          .limit(1);

        if (membership) {
          // Auto-join the org in Better Auth and set active
          try {
            await auth.api.addMember({
              body: {
                organizationId: membership.orgId,
                userId: session.user.id,
                role: "member",
              },
            });
          } catch {
            // Already a member
          }

          await auth.api.setActiveOrganization({
            body: { organizationId: membership.orgId },
            headers: c.req.raw.headers,
          });

          activeOrgId = membership.orgId;
        }
      }

      // Still no org — show onboarding to create one
      if (!activeOrgId) {
        if (
          !c.req.path.startsWith("/app/onboarding") &&
          !c.req.path.startsWith("/api/auth")
        ) {
          if (c.req.header("Accept")?.includes("application/json")) {
            return c.json({ error: "No active organization" }, 403);
          }
          return c.redirect("/app/onboarding");
        }
        await next();
        return;
      }
    }

    // Fetch org from our domain table
    const db = getDb(c.env.DB);
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, activeOrgId));

    if (!org) {
      if (c.req.header("Accept")?.includes("application/json")) {
        return c.json({ error: "Organization not found" }, 403);
      }
      return c.redirect("/app/onboarding");
    }

    c.set("orgId", org.id);
    c.set("org", org);
  } catch {
    if (c.req.header("Accept")?.includes("application/json")) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    return c.redirect("/app/login");
  }
  await next();
}
