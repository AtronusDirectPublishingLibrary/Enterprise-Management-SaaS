/**
 * Payroll privacy rule shared by the salary and payslip APIs.
 *
 * Executives, Finance and HR manage the full payroll. Everyone else can see
 * only their own salary history and payslips.
 */
const PAYROLL_MANAGER_POSITIONS = new Set([
  "Chief Executive Officer",
  "Finance Manager",
  "Finance Officer",
  "Human Resource and Administration Manager",
]);

export function canManagePayroll(user?: { role?: string; position?: string | null }) {
  if (!user) return false;
  if (user.role === "admin" || user.role === "executive") return true;
  return PAYROLL_MANAGER_POSITIONS.has((user.position || "").trim());
}

/** Finance officers prepare changes; these roles complete maker-checker approval. */
export function canApprovePayroll(user?: { role?: string; position?: string | null }) {
  if (!user) return false;
  if (user.role === "admin" || user.role === "executive") return true;
  return [
    "Chief Executive Officer",
    "Finance Manager",
    "Human Resource and Administration Manager",
  ].includes((user.position || "").trim());
}
