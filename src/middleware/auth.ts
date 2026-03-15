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
    const activeOrgId = (session.session as any).activeOrganizationId;
    if (!activeOrgId) {
      // No active org — redirect to onboarding (unless already there)
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

    // Fetch org from our domain table
    const db = getDb(c.env.DB);
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, activeOrgId));

    if (!org) {
      // Org exists in Better Auth but not in our domain table — redirect to onboarding
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
