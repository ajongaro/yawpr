import type { Context, Next } from "hono";
import type { Env } from "../lib/types";
import { getAuth } from "../routes/auth/auth";

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
      return c.redirect("/login");
    }

    c.set("user" as never, session.user);
    c.set("session" as never, session.session);
  } catch {
    // Auth not configured yet — redirect to login
    if (c.req.header("Accept")?.includes("application/json")) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    return c.redirect("/login");
  }
  await next();
}
