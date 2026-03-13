import type { FC } from "hono/jsx";
import { Layout } from "../layout";

type Team = {
  id: string;
  name: string;
};

type AlertNewPageProps = {
  user: any;
  teams: Team[];
};

export const AlertNewPage: FC<AlertNewPageProps> = ({ user, teams }) => {
  return (
    <Layout title="Trigger Alert" user={user}>
      <h1>🚨 Trigger Alert</h1>
      <form method="post" action="/alerts" class="form">
        <div class="form-group">
          <label for="teamId">Team</label>
          <select name="teamId" id="teamId" required>
            <option value="">Select a team...</option>
            {teams.map((team) => (
              <option value={team.id}>{team.name}</option>
            ))}
          </select>
        </div>
        <div class="form-group">
          <label for="severity">Severity</label>
          <select name="severity" id="severity" required>
            <option value="info">ℹ️ Info</option>
            <option value="fire">🔥 Fire</option>
          </select>
        </div>
        <div class="form-group">
          <label for="title">Title</label>
          <input
            type="text"
            name="title"
            id="title"
            placeholder="What's happening?"
            required
            maxlength={200}
          />
        </div>
        <div class="form-group">
          <label for="description">Description (optional)</label>
          <textarea
            name="description"
            id="description"
            placeholder="More details..."
            maxlength={2000}
          ></textarea>
        </div>
        <button type="submit" class="btn btn-primary btn-lg">
          🚨 Send Alert
        </button>
      </form>
    </Layout>
  );
};
