import type { FC } from "hono/jsx";
import { Layout } from "../layout";
import { AlertCard } from "../components/alert-card";

type Team = {
  id: string;
  name: string;
};

type Incident = {
  id: string;
  title: string;
  severity: string;
  status: string;
  createdAt: Date;
  teamName?: string;
};

type HomePageProps = {
  user: any;
  orgName: string;
  teams: Team[];
  activeIncidents: Incident[];
};

export const HomePage: FC<HomePageProps> = ({
  user,
  orgName,
  teams,
  activeIncidents,
}) => {
  return (
    <Layout title="Dashboard" user={user} orgName={orgName}>
      <div class="dashboard">
        {/* ─── Primary action: Send a Yawp ─── */}
        <div class="yawp-box card">
          <h2>Send a Yawp</h2>
          <p class="text-muted">
            Alert the team. Their phones will go off.
          </p>
          {teams.length === 0 ? (
            <p class="empty-state">
              <a href="/app/teams">Create a team</a> to start sending alerts.
            </p>
          ) : (
            <form method="post" action="/app/yawp" class="yawp-form">
              <div class="yawp-form-row">
                <select name="teamId" required>
                  {teams.map((t) => (
                    <option value={t.id}>{t.name}</option>
                  ))}
                </select>
                <select name="severity">
                  <option value="fire">Fire</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>
              </div>
              <input
                type="text"
                name="title"
                placeholder="Check Slack — DB is down"
                required
                maxlength={200}
                class="yawp-input"
              />
              <button type="submit" class="btn btn-primary btn-lg yawp-send">
                Send Yawp
              </button>
            </form>
          )}
        </div>

        {/* ─── Active incidents ─── */}
        {activeIncidents.length > 0 && (
          <section class="dashboard-section">
            <div class="dashboard-header">
              <h2>Active ({activeIncidents.length})</h2>
              <a href="/app/incidents" class="btn btn-sm">
                View All
              </a>
            </div>
            <div class="alert-grid">
              {activeIncidents.map((incident) => (
                <AlertCard
                  id={incident.id}
                  title={incident.title}
                  severity={incident.severity}
                  status={incident.status}
                  createdAt={incident.createdAt}
                  teamName={incident.teamName}
                  basePath="/app/incidents"
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
};
