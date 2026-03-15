import type { FC } from "hono/jsx";
import { Layout } from "../layout";
import { SeverityBadge } from "../components/severity-badge";
import { StatusBadge } from "../components/status-badge";

type Event = {
  id: string;
  eventType: string;
  actorId: string | null;
  message: string | null;
  createdAt: Date;
};

type IncidentDetailPageProps = {
  user: any;
  orgName: string;
  incident: {
    id: string;
    title: string;
    description: string | null;
    severity: string;
    status: string;
    source: string;
    createdAt: Date;
    acknowledgedAt: Date | null;
    acknowledgedBy: string | null;
    resolvedAt: Date | null;
    resolvedBy: string | null;
  };
  events: Event[];
  teamName: string;
};

export const IncidentDetailPage: FC<IncidentDetailPageProps> = ({
  user,
  orgName,
  incident,
  events,
  teamName,
}) => {
  const canAck = incident.status === "active";
  const canResolve = incident.status !== "resolved";

  return (
    <Layout title={incident.title} user={user} orgName={orgName}>
      <div class="alert-detail">
        <div class="alert-detail-header">
          <div>
            <h1>{incident.title}</h1>
            <div class="alert-meta">
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
              <span>Team: {teamName}</span>
              <span>Source: {incident.source}</span>
            </div>
          </div>
          <div class="alert-actions">
            {canAck && (
              <form
                method="post"
                action={`/app/incidents/${incident.id}/acknowledge`}
              >
                <button type="submit" class="btn btn-primary">
                  Acknowledge
                </button>
              </form>
            )}
            {canResolve && (
              <form
                method="post"
                action={`/app/incidents/${incident.id}/resolve`}
              >
                <button type="submit" class="btn btn-success">
                  Resolve
                </button>
              </form>
            )}
          </div>
        </div>

        {incident.description && (
          <div class="alert-description">
            <h2>Description</h2>
            <p>{incident.description}</p>
          </div>
        )}

        <div class="alert-timeline">
          <h2>Timeline</h2>
          <ul class="timeline">
            {events.map((event) => (
              <li class={`timeline-item timeline-${event.eventType}`}>
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                  <strong>{event.eventType}</strong>
                  {event.message && <p>{event.message}</p>}
                  <time>
                    {typeof event.createdAt === "string"
                      ? event.createdAt
                      : event.createdAt.toISOString()}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div class="alert-comment-form">
          <h2>Add Comment</h2>
          <form
            method="post"
            action={`/app/incidents/${incident.id}/comment`}
          >
            <textarea
              name="message"
              placeholder="Add a comment..."
              required
            ></textarea>
            <button type="submit" class="btn">
              Post Comment
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};
