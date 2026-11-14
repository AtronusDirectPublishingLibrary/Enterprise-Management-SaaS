/**
 * Role-based second-factor policy.
 *
 * Production is enforced by default. Development and CI stay optional unless
 * MFA_ENFORCEMENT is explicitly set, so local workflows are not locked out.
 * `off` disables enforcement; `optional` keeps self-service enrollment only.
 */
export type MfaUser = { role?: string | null; position?: string | null };

const DEFAULT_ROLES = ["admin", "executive"];
const DEFAULT_POSITIONS = [
  "Chief Executive Officer",
  "Strategy and Planning Officer",
  "Human Resource and Administration Manager",
  "Finance Manager",
  "Finance Officer",
  "Internal Audit Officer",
  "IT Officer",
];

function list(value: string | undefined, fallback: string[]) {
  if (value === undefined) return fallback;
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function mfaEnforcementMode(): "required" | "optional" | "off" {
  const configured = (process.env.MFA_ENFORCEMENT || "").trim().toLowerCase();
  if (configured === "off") return "off";
  if (configured === "optional") return "optional";
  if (configured === "required") return "required";
  return process.env.NODE_ENV === "production" ? "required" : "optional";
}

export function mfaRequiredFor(user: MfaUser | undefined | null): boolean {
  if (!user || mfaEnforcementMode() !== "required") return false;
  const roles = list(process.env.MFA_REQUIRED_ROLES, DEFAULT_ROLES);
  const positions = list(process.env.MFA_REQUIRED_POSITIONS, DEFAULT_POSITIONS);
  const role = (user.role || "").trim();
  const position = (user.position || "").trim();
  return roles.includes(role) || positions.includes(position);
}

export function mfaPolicySummary() {
  return {
    mode: mfaEnforcementMode(),
    roles: list(process.env.MFA_REQUIRED_ROLES, DEFAULT_ROLES),
    positions: list(process.env.MFA_REQUIRED_POSITIONS, DEFAULT_POSITIONS),
  };
}
