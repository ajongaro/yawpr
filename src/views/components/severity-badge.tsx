import type { FC } from "hono/jsx";

type SeverityBadgeProps = {
  severity: string;
};

export const SeverityBadge: FC<SeverityBadgeProps> = ({ severity }) => {
  const map: Record<string, { cls: string; label: string }> = {
    fire: { cls: "badge badge-fire", label: "Fire" },
    warning: { cls: "badge badge-warning", label: "Warning" },
    info: { cls: "badge badge-info", label: "Info" },
  };
  const { cls, label } = map[severity] || { cls: "badge", label: severity };
  return <span class={cls}>{label}</span>;
};
