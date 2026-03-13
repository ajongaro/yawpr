import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "../../db/client";
import type { Env } from "../../lib/types";

export function getAuth(env: Env["Bindings"]) {
  const db = getDb(env.DB);

  return betterAuth({
    database: drizzleAdapter(db, { provider: "sqlite" }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.APP_URL,
    basePath: "/api/auth",
    socialProviders: {
      slack: {
        clientId: env.SLACK_CLIENT_ID,
        clientSecret: env.SLACK_CLIENT_SECRET,
        // Request identity scopes for user info
        scope: ["openid", "profile", "email"],
      },
    },
  });
}
