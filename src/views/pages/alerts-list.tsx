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

type AlertsListPageProps = {
  user: any;
  alerts: Alert[];
  currentFilter: string;
};

export const AlertsListPage: FC<AlertsListPageProps> = ({
  user,
  alerts,
  currentFilter,
}) => {
  return (
    <Layout title="Alerts" user={user}>
      <div class="page-header">
        <h1>Alerts</h1>
        <a href="/alerts/new" class="btn btn-primary">
          🚨 Trigger Alert
        </a>
      </div>

      <div class="filters">
        <a
          href="/alerts"
          class={`filter-btn ${currentFilter === "all" ? "active" : ""}`}
        >
          All
        </a>
        <a
          href="/alerts?status=active"
          class={`filter-btn ${currentFilter === "active" ? "active" : ""}`}
        >
          Active
        </a>
        <a
          href="/alerts?status=acknowledged"
          class={`filter-btn ${currentFilter === "acknowledged" ? "active" : ""}`}
        >
          Acknowledged
        </a>
        <a
          href="/alerts?status=resolved"
          class={`filter-btn ${currentFilter === "resolved" ? "active" : ""}`}
        >
          Resolved
        </a>
      </div>

      {alerts.length === 0 ? (
        <p class="empty-state">No alerts found.</p>
      ) : (
        <div class="alert-grid">
          {alerts.map((alert) => (
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
    </Layout>
  );
};
