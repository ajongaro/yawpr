import type { FC } from "hono/jsx";
import { Layout } from "../layout";

type Member = {
  id: string;
  userId: string;
  slackUserId: string | null;
  ntfyTopic: string | null;
  role: string;
};

type Team = {
  id: string;
  name: string;
  slackChannelId: string | null;
  ntfyTopic: string | null;
};

type TeamDetailPageProps = {
  user: any;
  team: Team;
  members: Member[];
};

export const TeamDetailPage: FC<TeamDetailPageProps> = ({
  user,
  team,
  members,
}) => {
  return (
    <Layout title={team.name} user={user}>
      <h1>Team: {team.name}</h1>

      <div class="card">
        <h2>Details</h2>
        <dl>
          <dt>Slack Channel</dt>
          <dd>{team.slackChannelId || "Not set"}</dd>
          <dt>ntfy Topic</dt>
          <dd>{team.ntfyTopic || "Not set"}</dd>
        </dl>
      </div>

      <div class="card">
        <h2>Members ({members.length})</h2>
        <form
          method="post"
          action={`/teams/${team.id}/members`}
          class="form form-inline"
        >
          <input
            type="text"
            name="userId"
            placeholder="User ID"
            required
          />
          <input
            type="text"
            name="slackUserId"
            placeholder="Slack User ID"
          />
          <input
            type="text"
            name="ntfyTopic"
            placeholder="Personal ntfy topic"
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
                <th>User ID</th>
                <th>Slack ID</th>
                <th>ntfy Topic</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr>
                  <td>{m.userId}</td>
                  <td>{m.slackUserId || "—"}</td>
                  <td>{m.ntfyTopic || "—"}</td>
                  <td>{m.role}</td>
                  <td>
                    <form
                      method="post"
                      action={`/teams/${team.id}/members/${m.id}/delete`}
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
