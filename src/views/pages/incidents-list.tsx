import type { FC } from "hono/jsx";
import { Layout } from "../layout";
import { AlertCard } from "../components/alert-card";

type Incident = {
  id: string;
  title: string;
  severity: string;
  status: string;
  createdAt: Date;
  teamName?: string;
};

type IncidentsListPageProps = {
  user: any;
  orgName: string;
  incidents: Incident[];
  currentFilter: string;
};

export const IncidentsListPage: FC<IncidentsListPageProps> = ({
  user,
  orgName,
  incidents,
  currentFilter,
}) => {
  return (
    <Layout title="Incidents" user={user} orgName={orgName}>
      <div class="page-header">
        <h1>Incidents</h1>
        <a href="/app/incidents/new" class="btn btn-primary">
          Trigger Incident
        </a>
      </div>

      <div class="filters">
        <a
          href="/app/incidents"
          class={`filter-btn ${currentFilter === "all" ? "active" : ""}`}
        >
          All
        </a>
        <a
          href="/app/incidents?status=active"
          class={`filter-btn ${currentFilter === "active" ? "active" : ""}`}
        >
          Active
        </a>
        <a
          href="/app/incidents?status=acknowledged"
          class={`filter-btn ${currentFilter === "acknowledged" ? "active" : ""}`}
        >
          Acknowledged
        </a>
        <a
          href="/app/incidents?status=resolved"
          class={`filter-btn ${currentFilter === "resolved" ? "active" : ""}`}
        >
          Resolved
        </a>
      </div>

      {incidents.length === 0 ? (
        <p class="empty-state">No incidents found.</p>
      ) : (
        <div class="alert-grid">
          {incidents.map((incident) => (
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
      )}
    </Layout>
  );
};
