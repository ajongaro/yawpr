import type { FC } from "hono/jsx";
import { Layout } from "../layout";

type SettingsPageProps = {
  user: any;
  orgName: string;
  org: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    maxTeams: number | null;
    maxMembersPerTeam: number | null;
    maxAlertsPerMonth: number | null;
  };
  slackConnected: boolean;
  slackTeamName?: string;
  message?: string;
  error?: string;
};

export const SettingsPage: FC<SettingsPageProps> = ({
  user,
  orgName,
  org,
  slackConnected,
  slackTeamName,
  message,
  error,
}) => {
  return (
    <Layout title="Settings" user={user} orgName={orgName}>
      <h1>Settings</h1>

      {message && <div class="success-banner">{message}</div>}
      {error && <div class="error-banner">{error}</div>}

      <div class="card">
        <h2>Organization</h2>
        <dl>
          <dt>Name</dt>
          <dd>{org.name}</dd>
          <dt>Slug</dt>
          <dd>{org.slug}</dd>
          <dt>Plan</dt>
          <dd>{org.plan}</dd>
        </dl>
      </div>

      <div class="card">
        <h2>Limits</h2>
        <dl>
          <dt>Max Teams</dt>
          <dd>{org.maxTeams ?? 5}</dd>
          <dt>Max Members per Team</dt>
          <dd>{org.maxMembersPerTeam ?? 20}</dd>
          <dt>Max Incidents per Month</dt>
          <dd>{org.maxAlertsPerMonth ?? 500}</dd>
        </dl>
      </div>

      <div class="card">
        <h2>Slack Integration</h2>
        {slackConnected ? (
          <div>
            <p>
              Connected to workspace: <strong>{slackTeamName}</strong>
            </p>
            <a href="/slack/install" class="btn btn-sm">
              Reconnect
            </a>
          </div>
        ) : (
          <div>
            <p>No Slack workspace connected.</p>
            <a href="/slack/install" class="btn btn-primary">
              Connect Slack
            </a>
          </div>
        )}
      </div>
    </Layout>
  );
};
