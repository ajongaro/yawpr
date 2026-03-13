import type { FC } from "hono/jsx";

type StatusBadgeProps = {
  status: string;
};

export const StatusBadge: FC<StatusBadgeProps> = ({ status }) => {
  const classMap: Record<string, string> = {
    active: "badge badge-active",
    acknowledged: "badge badge-ack",
    resolved: "badge badge-resolved",
  };
  return <span class={classMap[status] || "badge"}>{status}</span>;
};
