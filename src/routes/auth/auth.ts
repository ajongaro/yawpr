import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "../../db/client";
import type { Env } from "../../lib/types";
import {
  user,
  session,
  account,
  verification,
  baOrganization,
  baMember,
  invitation,
} from "../../db/schema";

export function getAuth(env: Env["Bindings"]) {
  const db = getDb(env.DB);

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user,
        session,
        account,
        verification,
        organization: baOrganization,
        member: baMember,
        invitation,
      },
    }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.APP_URL,
    basePath: "/api/auth",
    socialProviders: {
      slack: {
        clientId: env.SLACK_CLIENT_ID,
        clientSecret: env.SLACK_CLIENT_SECRET,
        scope: ["openid", "profile", "email"],
      },
    },
    plugins: [organization()],
  });
}
