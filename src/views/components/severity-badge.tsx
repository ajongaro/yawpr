import type { FC } from "hono/jsx";

type SeverityBadgeProps = {
  severity: string;
};

export const SeverityBadge: FC<SeverityBadgeProps> = ({ severity }) => {
  const cls = severity === "fire" ? "badge badge-fire" : "badge badge-info";
  const label = severity === "fire" ? "🔥 Fire" : "ℹ️ Info";
  return <span class={cls}>{label}</span>;
};
