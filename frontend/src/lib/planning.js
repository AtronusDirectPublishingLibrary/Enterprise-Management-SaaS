/** Shared helpers for the corporate goals and portfolio screens. */

export const PLAN_ROUTES = {
  AOP: "/database/aop",
  STRATEGIC: "/database/strategic-plan",
  ROADMAP: "/database/roadmap",
};

export function planPath(type) {
  return PLAN_ROUTES[type] || "/database/strategic-plan";
}

export function planUrl(planId, type) {
  if (!planId) return planPath(type);
  return `${planPath(type)}?plan=${encodeURIComponent(planId)}`;
}

/** The wording used by the documents for a goal-level item of each plan. */
export function objectiveLabel(type) {
  if (type === "AOP") return "Annual Objective";
  if (type === "STRATEGIC") return "Strategic Objective";
  if (type === "ROADMAP") return "Roadmap Goal";
  return "Corporate Objective";
}

export function formatMoney(value, { compact = false } = {}) {
  const amount = Number(value || 0);
  if (compact && Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toLocaleString("en-GB", { maximumFractionDigits: 1 })}M`;
  }
  if (compact && Math.abs(amount) >= 10_000) {
    return `${(amount / 1_000).toLocaleString("en-GB", { maximumFractionDigits: 0 })}K`;
  }
  return amount.toLocaleString("en-GB", { maximumFractionDigits: 0 });
}

export function formatPercent(value) {
  const number = Number(value || 0);
  return `${Math.round(number * 10) / 10}%`;
}

export function progressTone(value) {
  const number = Number(value || 0);
  if (number >= 75) return "is-strong";
  if (number >= 45) return "is-mid";
  return "is-weak";
}
