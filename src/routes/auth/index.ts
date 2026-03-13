import { Hono } from "hono";
import type { Env } from "../../lib/types";
import { getAuth } from "./auth";

const authRoutes = new Hono<Env>();

// Mount Better Auth — it handles all /api/auth/* routes
authRoutes.all("/*", async (c) => {
  const auth = getAuth(c.env);
  return auth.handler(c.req.raw);
});

export { authRoutes };
