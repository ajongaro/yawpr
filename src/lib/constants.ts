export const SEVERITY_PRIORITY: Record<string, number> = {
  fire: 5,
  warning: 4,
  info: 3,
};

export const SEVERITY_LABELS: Record<string, string> = {
  fire: "Fire",
  warning: "Warning",
  info: "Info",
};

export const SEVERITY_EMOJI: Record<string, string> = {
  fire: "🔥",
  warning: "⚠️",
  info: "ℹ️",
};

export const ESCALATION_TIMEOUT_MINUTES = 15;
