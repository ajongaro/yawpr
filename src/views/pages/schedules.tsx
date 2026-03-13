import type { FC } from "hono/jsx";
import { Layout } from "../layout";

type Schedule = {
  schedule: {
    id: string;
    startTime: Date;
    endTime: Date;
  };
  member: {
    id: string;
    userId: string;
  };
};

type Team = {
  id: string;
  name: string;
};

type Member = {
  id: string;
  userId: string;
  teamId: string;
};

type SchedulesPageProps = {
  user: any;
  teams: Team[];
  schedules: Schedule[];
  members: Member[];
};

export const SchedulesPage: FC<SchedulesPageProps> = ({
  user,
  teams,
  schedules,
  members,
}) => {
  return (
    <Layout title="Schedules" user={user}>
      <h1>On-Call Schedules</h1>

      <form method="post" action="/schedules" class="form">
        <div class="form-row">
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
            <label for="memberId">Member</label>
            <select name="memberId" id="memberId" required>
              <option value="">Select member...</option>
              {members.map((m) => (
                <option value={m.id}>{m.userId}</option>
              ))}
            </select>
          </div>
          <div class="form-group">
            <label for="startTime">Start</label>
            <input type="datetime-local" name="startTime" id="startTime" required />
          </div>
          <div class="form-group">
            <label for="endTime">End</label>
            <input type="datetime-local" name="endTime" id="endTime" required />
          </div>
        </div>
        <button type="submit" class="btn btn-primary">
          Add Schedule
        </button>
      </form>

      {schedules.length === 0 ? (
        <p class="empty-state">No schedules configured.</p>
      ) : (
        <table class="table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Start</th>
              <th>End</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <tr>
                <td>{s.member.userId}</td>
                <td>
                  {typeof s.schedule.startTime === "string"
                    ? s.schedule.startTime
                    : s.schedule.startTime.toISOString()}
                </td>
                <td>
                  {typeof s.schedule.endTime === "string"
                    ? s.schedule.endTime
                    : s.schedule.endTime.toISOString()}
                </td>
                <td>
                  <form
                    method="post"
                    action={`/schedules/${s.schedule.id}/delete`}
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
