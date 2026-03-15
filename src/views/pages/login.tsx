import type { FC } from "hono/jsx";
import { Layout } from "../layout";

export const LoginPage: FC = () => {
  const script = `
    document.getElementById('slack-login').addEventListener('click', async function(e) {
      e.preventDefault();
      this.disabled = true;
      this.textContent = 'Redirecting...';
      try {
        const res = await fetch('/api/auth/sign-in/social', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: 'slack', callbackURL: '/app' }),
          redirect: 'follow'
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          this.textContent = 'Sign in with Slack';
          this.disabled = false;
        }
      } catch (err) {
        this.textContent = 'Sign in with Slack';
        this.disabled = false;
      }
    });
  `;

  return (
    <Layout title="Sign In">
      <div class="login-container">
        <div class="login-card">
          <h1>Yawpr</h1>
          <p>Dev team alerting — bat signal for when fires happen.</p>
          <button id="slack-login" class="btn btn-primary btn-lg">
            Sign in with Slack
          </button>
          <p style="margin-top: 1rem">
            <a href="/">Back to home</a>
          </p>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </Layout>
  );
};
