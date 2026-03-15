import type { FC } from "hono/jsx";
import { Layout } from "../layout";

type Member = {
  id: string;
  displayName: string;
  userId: string | null;
  slackUserId: string | null;
  ntfyTopic: string | null;
  role: string;
};

type Team = {
  id: string;
  name: string;
  slug: string;
  slackChannelId: string | null;
};

type TeamDetailPageProps = {
  user: any;
  orgName: string;
  team: Team;
  members: Member[];
};

export const TeamDetailPage: FC<TeamDetailPageProps> = ({
  user,
  orgName,
  team,
  members,
}) => {
  return (
    <Layout title={team.name} user={user} orgName={orgName}>
      <h1>Team: {team.name}</h1>

      <div class="card">
        <h2>Details</h2>
        <dl>
          <dt>Slug</dt>
          <dd>@{team.slug}</dd>
          <dt>Slack Channel</dt>
          <dd>{team.slackChannelId || "Not set"}</dd>
        </dl>
      </div>

      <div class="card">
        <h2>Members ({members.length})</h2>
        <form
          method="post"
          action={`/app/teams/${team.id}/members`}
          class="form form-inline"
        >
          <input
            type="text"
            name="displayName"
            placeholder="Display name"
            required
          />
          <input
            type="text"
            name="slackUserId"
            placeholder="Slack User ID"
          />
          <select name="role">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" class="btn btn-primary">
            Add Member
          </button>
        </form>

        {members.length === 0 ? (
          <p class="empty-state">No members yet.</p>
        ) : (
          <table class="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slack ID</th>
                <th>ntfy Topic</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr>
                  <td>{m.displayName}</td>
                  <td>{m.slackUserId || "—"}</td>
                  <td>{m.ntfyTopic ? "Configured" : "—"}</td>
                  <td>{m.role}</td>
                  <td>
                    <form
                      method="post"
                      action={`/app/teams/${team.id}/members/${m.id}/delete`}
                    >
                      <button type="submit" class="btn btn-sm btn-danger">
                        Remove
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
};
