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

type AlertDetailPageProps = {
  user: any;
  alert: {
    id: string;
    title: string;
    description: string | null;
    severity: string;
    status: string;
    source: string;
    createdAt: Date;
    acknowledgedAt: Date | null;
    resolvedAt: Date | null;
  };
  events: Event[];
  teamName: string;
};

export const AlertDetailPage: FC<AlertDetailPageProps> = ({
  user,
  alert,
  events,
  teamName,
}) => {
  const canAck = alert.status === "active";
  const canResolve = alert.status !== "resolved";

  return (
    <Layout title={alert.title} user={user}>
      <div class="alert-detail">
        <div class="alert-detail-header">
          <div>
            <h1>{alert.title}</h1>
            <div class="alert-meta">
              <SeverityBadge severity={alert.severity} />
              <StatusBadge status={alert.status} />
              <span>Team: {teamName}</span>
              <span>Source: {alert.source}</span>
            </div>
          </div>
          <div class="alert-actions">
            {canAck && (
              <form method="post" action={`/alerts/${alert.id}/acknowledge`}>
                <button type="submit" class="btn btn-primary">
                  ✅ Acknowledge
                </button>
              </form>
            )}
            {canResolve && (
              <form method="post" action={`/alerts/${alert.id}/resolve`}>
                <button type="submit" class="btn btn-success">
                  🔧 Resolve
                </button>
              </form>
            )}
          </div>
        </div>

        {alert.description && (
          <div class="alert-description">
            <h2>Description</h2>
            <p>{alert.description}</p>
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
          <form method="post" action={`/alerts/${alert.id}/comment`}>
            <textarea name="message" placeholder="Add a comment..." required></textarea>
            <button type="submit" class="btn">Post Comment</button>
          </form>
        </div>
      </div>
    </Layout>
  );
};
