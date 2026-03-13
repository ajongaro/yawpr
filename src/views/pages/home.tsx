import type { FC } from "hono/jsx";
import { Layout } from "../layout";
import { AlertCard } from "../components/alert-card";

type Alert = {
  id: string;
  title: string;
  severity: string;
  status: string;
  createdAt: Date;
  teamName?: string;
};

type OnCallInfo = {
  teamName: string;
  memberName: string;
};

type HomePageProps = {
  user: any;
  activeAlerts: Alert[];
  onCallSummary: OnCallInfo[];
};

export const HomePage: FC<HomePageProps> = ({
  user,
  activeAlerts,
  onCallSummary,
}) => {
  return (
    <Layout title="Dashboard" user={user}>
      <div class="dashboard">
        <div class="dashboard-header">
          <h1>Dashboard</h1>
          <a href="/alerts/new" class="btn btn-primary">
            🚨 Trigger Alert
          </a>
        </div>

        <section class="dashboard-section">
          <h2>Active Alerts ({activeAlerts.length})</h2>
          {activeAlerts.length === 0 ? (
            <p class="empty-state">No active alerts — all clear!</p>
          ) : (
            <div class="alert-grid">
              {activeAlerts.map((alert) => (
                <AlertCard
                  id={alert.id}
                  title={alert.title}
                  severity={alert.severity}
                  status={alert.status}
                  createdAt={alert.createdAt}
                  teamName={alert.teamName}
                />
              ))}
            </div>
          )}
        </section>

        <section class="dashboard-section">
          <h2>On-Call Now</h2>
          {onCallSummary.length === 0 ? (
            <p class="empty-state">No on-call schedules configured.</p>
          ) : (
            <table class="table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>On-Call</th>
                </tr>
              </thead>
              <tbody>
                {onCallSummary.map((entry) => (
                  <tr>
                    <td>{entry.teamName}</td>
                    <td>{entry.memberName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </Layout>
  );
};
