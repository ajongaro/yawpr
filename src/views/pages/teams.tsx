import type { FC } from "hono/jsx";
import { Layout } from "../layout";

type Team = {
  id: string;
  name: string;
  slug: string;
  slackChannelId: string | null;
};

type TeamsPageProps = {
  user: any;
  orgName: string;
  teams: Team[];
};

export const TeamsPage: FC<TeamsPageProps> = ({ user, orgName, teams }) => {
  return (
    <Layout title="Teams" user={user} orgName={orgName}>
      <div class="page-header">
        <h1>Teams</h1>
      </div>

      <form method="post" action="/app/teams" class="form form-inline">
        <input
          type="text"
          name="name"
          placeholder="Team name"
          required
          maxlength={100}
        />
        <input
          type="text"
          name="slug"
          placeholder="team-slug"
          required
          maxlength={50}
          pattern="[a-z0-9-]+"
        />
        <input
          type="text"
          name="slackChannelId"
          placeholder="Slack channel ID (optional)"
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
              <th>Slug</th>
              <th>Slack Channel</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr>
                <td>
                  <a href={`/app/teams/${team.id}`}>{team.name}</a>
                </td>
                <td>@{team.slug}</td>
                <td>{team.slackChannelId || "—"}</td>
                <td>
                  <a href={`/app/teams/${team.id}`} class="btn btn-sm">
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
