import type { FC } from "hono/jsx";
import { Layout } from "../layout";

type OnboardingPageProps = {
  user: any;
  error?: string;
};

export const OnboardingPage: FC<OnboardingPageProps> = ({ user, error }) => {
  return (
    <Layout title="Get Started" user={user}>
      <div class="onboarding">
        <h1>Welcome to Yawpr</h1>
        <p>Create your organization to get started.</p>

        {error && <div class="error-banner">{error}</div>}

        <form method="post" action="/app/onboarding" class="form">
          <div class="form-group">
            <label for="name">Organization Name</label>
            <input
              type="text"
              name="name"
              id="name"
              placeholder="Acme Engineering"
              required
              maxlength={100}
            />
          </div>
          <div class="form-group">
            <label for="slug">URL Slug</label>
            <input
              type="text"
              name="slug"
              id="slug"
              placeholder="acme-eng"
              required
              maxlength={50}
              pattern="[a-z0-9-]+"
            />
            <small>Lowercase letters, numbers, and hyphens only. Used in Slack commands.</small>
          </div>
          <button type="submit" class="btn btn-primary btn-lg">
            Create Organization
          </button>
        </form>
      </div>
    </Layout>
  );
};
