/**
 * Server-side mirror of the left-pane access proposal. Keeping the matrix in
 * one place lets the API refuse a workspace a position cannot open, even if a
 * request bypasses the sidebar.
 */
export const TAB_KEYS = [
  "pms", "aop", "strategic", "roadmap", "progress", "reports", "calendar", "archive",
  "myhr", "approvals", "hr", "hrAnalytics", "recruitment", "hrOps", "payroll",
  "languages", "alerts", "news", "documents", "media", "publicSite", "users", "settings", "fleet",
];

const DELIVERY = ["pms", "aop", "progress", "reports", "archive", "myhr", "approvals"];
const PLANS_READ = ["aop", "strategic", "roadmap", "reports", "calendar", "archive", "myhr", "approvals"];

export const POSITION_ACCESS: Record<string, string[]> = {
  "Board Secretary": [...PLANS_READ, "pms", "progress", "alerts"],
  "Internal Audit Officer": [...PLANS_READ, "pms", "progress", "alerts"],
  "Chief Executive Officer": [
    "*", "pms", "aop", "strategic", "roadmap", "progress", "reports", "calendar", "archive",
    "myhr", "approvals", "hr", "hrAnalytics", "recruitment", "hrOps", "payroll", "alerts",
    "news", "documents",
  ],
  "QA and regulatory Affairs Officer": [...DELIVERY, "strategic", "roadmap", "calendar", "documents"],
  "Strategy and Planning Officer": [
    "pms", "aop", "strategic", "roadmap", "progress", "reports", "calendar", "archive",
    "myhr", "approvals", "alerts", "news", "documents",
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

const ROLE_ACCESS: Record<string, string[]> = {
  admin: ["*"],
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

/**
 * Planning ownership and reporting deadlines are a two-person governance
 * control: the CEO and the Strategy and Planning Officer. A technical system
 * administrator keeps an emergency override so the platform cannot be locked
 * out if either office is vacant.
 */
export const PLAN_GOVERNANCE_POSITIONS = ["Chief Executive Officer", "Strategy and Planning Officer"];

export function canGovernPlans(user: { role?: string; position?: string | null } | undefined) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return PLAN_GOVERNANCE_POSITIONS.includes((user.position || "").trim());
}

/** The Strategy and Planning Officer holds full System Admin rights. */
export function isAdminUser(user: { role: string; position?: string | null } | undefined) {
  if (!user) return false;
  return user.role === "admin" || (user.position || "").trim() === "Strategy and Planning Officer";
}

export function allows(user: { role: string; position?: string | null } | undefined, key: string) {
  if (!user) return false;
  // Everyone has a personal payroll view; the payroll routes narrow the
  // register itself to executives, Finance and HR.
  if (key === "payroll") return true;
  if (isAdminUser(user)) return true;
  const position = (user.position || "").trim();
  if (position && POSITION_ACCESS[position]) {
    if (ADMIN_ONLY.has(key)) return false;
    return POSITION_ACCESS[position].includes("*") || POSITION_ACCESS[position].includes(key);
  }
  if (ADMIN_ONLY.has(key)) return false;
  const fallback = ROLE_ACCESS[user.role] || ROLE_ACCESS.viewer;
  return fallback.includes("*") || fallback.includes(key);
}

/**
 * Fleet & Transport manager identity.
 * Per the Ethio-Biopharma org model, the Human Resource and Administration
 * Manager is the fleet manager for both vehicles and ride services. Admins
 * and Strategy & Planning Officers retain admin override.
 */
export function isFleetManager(user: { role: string; position?: string | null } | undefined) {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  return (user.position || "").trim() === "Human Resource and Administration Manager";
}