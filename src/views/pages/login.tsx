import type { FC } from "hono/jsx";
import { Layout } from "../layout";

export const LoginPage: FC = () => {
  return (
    <Layout title="Sign In">
      <div class="login-container">
        <div class="login-card">
          <h1>🔥 mi-fire</h1>
          <p>Dev team alerting — bat signal for when fires happen.</p>
          <a href="/api/auth/sign-in/social?provider=slack" class="btn btn-primary btn-lg">
            Sign in with Slack
          </a>
        </div>
      </div>
    </Layout>
  );
};
