import type { FC } from "hono/jsx";
import { SeverityBadge } from "./severity-badge";
import { StatusBadge } from "./status-badge";

type AlertCardProps = {
  id: string;
  title: string;
  severity: string;
  status: string;
  createdAt: Date | string;
  teamName?: string;
};

export const AlertCard: FC<AlertCardProps> = ({
  id,
  title,
  severity,
  status,
  createdAt,
  teamName,
}) => {
  const time =
    typeof createdAt === "string" ? createdAt : createdAt.toISOString();

  return (
    <a href={`/alerts/${id}`} class={`alert-card alert-card-${severity}`}>
      <div class="alert-card-header">
        <SeverityBadge severity={severity} />
        <StatusBadge status={status} />
        {teamName && <span class="alert-card-team">{teamName}</span>}
      </div>
      <h3 class="alert-card-title">{title}</h3>
      <time class="alert-card-time" datetime={time}>
        {time}
      </time>
    </a>
  );
};
