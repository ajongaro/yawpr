import type { Context, Next } from "hono";
import { eq } from "drizzle-orm";
import type { Env } from "../lib/types";
import { getAuth } from "../routes/auth/auth";
import { getDb } from "../db/client";
import { organizations } from "../db/schema";

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

    // Extract org context from session
    let activeOrgId = (session.session as any).activeOrganizationId;

    if (!activeOrgId) {
      // No active org — try to auto-join an existing one
      const db = getDb(c.env.DB);
      const [existingOrg] = await db.select().from(organizations).limit(1);

      if (existingOrg) {
        // Org exists — add user as member and set active
        try {
          await auth.api.addMember({
            body: {
              organizationId: existingOrg.id,
              userId: session.user.id,
              role: "member",
            },
          });
        } catch {
          // Already a member — that's fine
        }

        await auth.api.setActiveOrganization({
          body: { organizationId: existingOrg.id },
          headers: c.req.raw.headers,
        });

        activeOrgId = existingOrg.id;
      } else {
        // No org exists yet — first user needs to create one via onboarding
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
