/**
 * Position catalogue and the access proposal for the left-pane tabs.
 *
 * The list is intentionally operational, not a hierarchy: a position receives
 * every tab its daily work needs and nothing that would expose payroll,
 * system administration or unreviewed HR records. Administrators always have
 * full access; positions marked "*" cover all planning and delivery areas.
 */

export const POSITIONS = [
  "Board Secretary",
  "Internal Audit Officer",
  "Chief Executive Officer",
  "QA and regulatory Affairs Officer",
  "Strategy and Planning Officer",
  "Legal Counsel",
  "Operation Manager",
  "Engineer",
  "IT Officer",
  "Human Resource and Administration Manager",
  "Property Management Officer",
  "Procurement Officer",
  "Finance Manager",
  "Finance Officer",
];

export const OTHER_POSITION = "Other (specify)";

/** Canonical tab keys shared by the sidebar, route guard and the proposal. */
export const TAB_KEYS = [
  "pms",
  "aop",
  "strategic",
  "roadmap",
  "progress",
  "reports",
  "calendar",
  "archive",
  "myhr",
  "approvals",
  "hr",
  "hrAnalytics",
  "recruitment",
  "hrOps",
  "payroll",
  "languages",
  "alerts",
  "news",
  "documents",
  "media",
  "publicSite",
  "users",
  "settings",
  "fleet",
];

const DELIVERY = ["pms", "aop", "progress", "reports", "archive", "myhr", "approvals"];
const PLANS_READ = ["aop", "strategic", "roadmap", "reports", "calendar", "archive", "myhr", "approvals"];

export const POSITION_ACCESS = {
  "Board Secretary": [...PLANS_READ, "pms", "progress", "alerts"],
  "Internal Audit Officer": [...PLANS_READ, "pms", "progress", "alerts"],
  "Chief Executive Officer": [
    "*",
    "pms", "aop", "strategic", "roadmap", "progress", "reports", "calendar", "archive",
    "myhr", "approvals", "hr", "hrAnalytics", "recruitment", "hrOps", "payroll", "alerts",
    "news", "documents",
  ],
  "QA and regulatory Affairs Officer": [...DELIVERY, "strategic", "roadmap", "calendar", "documents"],
  "Strategy and Planning Officer": [
    "*",
    "pms", "aop", "strategic", "roadmap", "progress", "reports", "calendar", "archive",
    "myhr", "approvals", "alerts", "news", "documents", "languages", "users", "publicSite", "settings",
    "hr", "hrAnalytics", "recruitment", "hrOps", "payroll", "media",
  ],
  "Legal Counsel": [...PLANS_READ, "progress", "documents"],
  "Operation Manager": [...DELIVERY, "roadmap", "calendar", "alerts"],
  Engineer: ["pms", "aop", "progress", "archive", "myhr", "approvals"],
  "IT Officer": [
    "pms", "aop", "strategic", "roadmap", "progress", "reports", "calendar", "archive",
    "myhr", "approvals", "languages", "documents", "media",
  ],
  "Human Resource and Administration Manager": [
    "aop", "reports", "progress", "archive", "myhr", "approvals",
    "hr", "hrAnalytics", "recruitment", "hrOps", "payroll", "languages", "alerts", "documents", "fleet",
  ],
  "Property Management Officer": ["pms", "aop", "progress", "archive", "myhr", "approvals"],
  "Procurement Officer": ["pms", "aop", "progress", "reports", "archive", "myhr", "approvals"],
  "Finance Manager": ["pms", "aop", "strategic", "roadmap", "progress", "reports", "payroll", "archive", "myhr", "approvals", "alerts"],
  "Finance Officer": ["pms", "aop", "progress", "payroll", "archive", "myhr", "approvals"],
};

export const PAYROLL_MANAGER_POSITIONS = [
  "Chief Executive Officer",
  "Finance Manager",
  "Finance Officer",
  "Human Resource and Administration Manager",
];

export function canManagePayroll(user) {
  if (!user) return false;
  if (user.role === "admin" || user.role === "executive") return true;
  return PAYROLL_MANAGER_POSITIONS.includes((user.position || "").trim());
}

export function canApprovePayroll(user) {
  if (!user) return false;
  if (user.role === "admin" || user.role === "executive") return true;
  return ["Chief Executive Officer", "Finance Manager", "Human Resource and Administration Manager"].includes((user.position || "").trim());
}

/** Legacy role fallback when a staff record has no position recorded. */
const ROLE_ACCESS = {
  executive: [
    "pms", "aop", "strategic", "roadmap", "progress", "reports", "calendar", "archive",
    "myhr", "approvals", "hr", "hrAnalytics", "recruitment", "hrOps", "alerts", "news", "documents", "fleet",
  ],
  project_manager: ["pms", "aop", "strategic", "roadmap", "progress", "reports", "calendar", "archive", "myhr", "approvals", "alerts"],
  pi: ["pms", "aop", "progress", "reports", "archive", "myhr", "approvals"],
  viewer: ["pms", "aop", "strategic", "roadmap", "progress", "reports", "archive", "myhr", "approvals"],
  staff: ["myhr", "approvals", "progress"],
};

const ADMIN_ONLY = new Set(["users", "publicSite", "settings"]);

/** The Strategy and Planning Officer holds full System Admin rights. */
export function isSystemAdmin(user) {
  if (!user) return false;
  return user.role === "admin" || (user.position || "").trim() === "Strategy and Planning Officer";
}

/**
 * Plan ownership and reporting deadlines are reserved for the CEO and the
 * Strategy and Planning Officer. The technical admin keeps an emergency
 * override, matching the server-side rule.
 */
export const PLAN_GOVERNANCE_POSITIONS = ["Chief Executive Officer", "Strategy and Planning Officer"];

export function canGovernPlans(user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return PLAN_GOVERNANCE_POSITIONS.includes((user.position || "").trim());
}

export function canAccess(user, key) {
  if (!user) return false;
  if (!key || key === "dashboard") return true;
  // Everyone has a personal payroll view; the API exposes the full register
  // only to executives, Finance and HR.
  if (key === "payroll") return true;
  if (isSystemAdmin(user)) return true;

  const position = (user.position || "").trim();
  const allowed = POSITION_ACCESS[position];
  if (allowed) {
    if (ADMIN_ONLY.has(key)) return false;
    return allowed.includes("*") || allowed.includes(key);
  }
  const legacy = ROLE_ACCESS[user.role] || ROLE_ACCESS.viewer;
  if (ADMIN_ONLY.has(key) && user.role !== "admin") return false;
  return legacy.includes(key);
}

/** Map every protected route to the tab permission that governs it. */
export const PATH_ACCESS = [
  { prefix: "/database/pms", key: "pms" },
  { prefix: "/pms-dashboard", key: "pms" },
  { prefix: "/goals", key: "pms" },
  { prefix: "/portfolios", key: "pms" },
  { prefix: "/executive", key: "reports" },
  { prefix: "/database/aop", key: "aop" },
  { prefix: "/database/strategic-plan", key: "strategic" },
  { prefix: "/database/roadmap", key: "roadmap" },
  { prefix: "/progress-updates", key: "progress" },
  { prefix: "/reports", key: "reports" },
  { prefix: "/planning-calendar", key: "calendar" },
  { prefix: "/database/archive", key: "archive" },
  { prefix: "/database/hero-settings", key: "settings" },
  { prefix: "/my-hr", key: "myhr" },
  { prefix: "/my-approvals", key: "approvals" },
  { prefix: "/hr-operations", key: "hrOps" },
  { prefix: "/hr-analytics", key: "hrAnalytics" },
  { prefix: "/hr", key: "hr" },
  { prefix: "/recruitment", key: "recruitment" },
  { prefix: "/payroll", key: "payroll" },
  { prefix: "/payslips", key: "payroll" },
  { prefix: "/fleet", key: "fleet" },
  { prefix: "/language-settings", key: "languages" },
  { prefix: "/plan-alerts", key: "alerts" },
  { prefix: "/manage-news", key: "news" },
  { prefix: "/manage-documents", key: "documents" },
  { prefix: "/manage-media", key: "media" },
  { prefix: "/public-site", key: "publicSite" },
  { prefix: "/users", key: "users" },
];

export function accessKeyForPath(pathname) {
  const match = PATH_ACCESS.find((entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`));
  return match?.key || null;
}

export function canAccessPath(user, pathname) {
  const key = accessKeyForPath(pathname);
  if (!key) return true;
  return canAccess(user, key);
}

export function accessSummary(user) {
  if (!user) return [];
  if (isSystemAdmin(user)) return ["All tabs (system administrator)"];
  const position = (user.position || "").trim();
  const allowed = POSITION_ACCESS[position];
  if (allowed) return allowed.includes("*") ? ["All planning and delivery tabs"] : allowed;
  return ROLE_ACCESS[user.role] || ROLE_ACCESS.viewer;
}
