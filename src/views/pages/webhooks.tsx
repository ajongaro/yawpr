import type { FC } from "hono/jsx";
import { Layout } from "../layout";

type WebhookSource = {
  id: string;
  name: string;
  sourceType: string;
  teamId: string;
  active: number;
  createdAt: Date;
};

type Team = {
  id: string;
  name: string;
};

type WebhooksPageProps = {
  user: any;
  orgName: string;
  appUrl: string;
  sources: WebhookSource[];
  teams: Team[];
};

export const WebhooksPage: FC<WebhooksPageProps> = ({
  user,
  orgName,
  appUrl,
  sources,
  teams,
}) => {
  return (
    <Layout title="Webhooks" user={user} orgName={orgName}>
      <div class="page-header">
        <h1>Webhook Sources</h1>
      </div>

      <form method="post" action="/app/webhooks" class="form">
        <div class="form-row">
          <div class="form-group">
            <label for="name">Name</label>
            <input
              type="text"
              name="name"
              id="name"
              placeholder="Production CloudWatch"
              required
            />
          </div>
          <div class="form-group">
            <label for="sourceType">Source Type</label>
            <select name="sourceType" id="sourceType" required>
              <option value="generic">Generic</option>
              <option value="cloudwatch">CloudWatch</option>
              <option value="datadog">Datadog</option>
              <option value="grafana">Grafana</option>
            </select>
          </div>
          <div class="form-group">
            <label for="teamId">Team</label>
            <select name="teamId" id="teamId" required>
              <option value="">Select team...</option>
              {teams.map((t) => (
                <option value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div class="form-group">
            <label for="severityDefault">Default Severity</label>
            <select name="severityDefault" id="severityDefault">
              <option value="warning">Warning</option>
              <option value="fire">Fire</option>
              <option value="info">Info</option>
            </select>
          </div>
        </div>
        <button type="submit" class="btn btn-primary">
          Create Webhook Source
        </button>
      </form>

      {sources.length === 0 ? (
        <p class="empty-state">No webhook sources configured.</p>
      ) : (
        <table class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Ingest URL</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr>
                <td>{s.name}</td>
                <td>{s.sourceType}</td>
                <td>
                  <code class="ingest-url">
                    {appUrl}/webhooks/{s.id}/ingest
                  </code>
                </td>
                <td>{s.active ? "Yes" : "No"}</td>
                <td>
                  <form
                    method="post"
                    action={`/app/webhooks/${s.id}/delete`}
                  >
                    <button type="submit" class="btn btn-sm btn-danger">
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Layout>
  );
};
