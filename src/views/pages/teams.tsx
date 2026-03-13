import type { FC } from "hono/jsx";
import { Layout } from "../layout";

type Team = {
  id: string;
  name: string;
  slackChannelId: string | null;
  ntfyTopic: string | null;
};

type TeamsPageProps = {
  user: any;
  teams: Team[];
};

export const TeamsPage: FC<TeamsPageProps> = ({ user, teams }) => {
  return (
    <Layout title="Teams" user={user}>
      <div class="page-header">
        <h1>Teams</h1>
      </div>

      <form method="post" action="/teams" class="form form-inline">
        <input
          type="text"
          name="name"
          placeholder="New team name"
          required
          maxlength={100}
        />
        <input
          type="text"
          name="slackChannelId"
          placeholder="Slack channel ID (optional)"
        />
        <input
          type="text"
          name="ntfyTopic"
          placeholder="ntfy topic (optional)"
        />
        <button type="submit" class="btn btn-primary">
          Create Team
        </button>
      </form>

      {teams.length === 0 ? (
        <p class="empty-state">No teams yet. Create one above.</p>
      ) : (
        <table class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slack Channel</th>
              <th>ntfy Topic</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr>
                <td>
                  <a href={`/teams/${team.id}`}>{team.name}</a>
                </td>
                <td>{team.slackChannelId || "—"}</td>
                <td>{team.ntfyTopic || "—"}</td>
                <td>
                  <a href={`/teams/${team.id}`} class="btn btn-sm">
                    Manage
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Layout>
  );
};
