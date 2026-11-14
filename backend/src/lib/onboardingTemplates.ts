export type IndustryDefaults = {
  departments: string[];
  roles: string[];
  modules: string[];
  workflows: {
    approvalDepth: number;
    leaveTypes: string[];
    primaryLanguage: string;
  };
  labels: Record<string, string>;
};

const BASE_MODULES = ["pms", "hr", "reports", "projects", "myhr", "approvals"];

const TEMPLATES: Record<string, Partial<IndustryDefaults>> = {
  biopharma: {
    departments: ["QA", "QC", "Production", "Regulatory", "Warehouse", "HR", "Finance", "Engineering"],
    roles: ["Director", "Manager", "Supervisor", "Staff"],
    modules: Array.from(new Set([...BASE_MODULES, "qms", "fleet", "planning", "aop", "strategic", "roadmap"])),
    workflows: { approvalDepth: 2, leaveTypes: ["ANNUAL", "SICK", "MATERNITY", "PATERNITY", "STUDY", "UNPAID"], primaryLanguage: "en" },
    labels: { employee: "Staff", department: "Department", vehicle: "Fleet Vehicle", deviation: "Deviation", capa: "CAPA", batch: "Batch Record" },
  },
  manufacturing: {
    departments: ["Production", "Quality", "Maintenance", "Warehouse", "HR", "Finance", "Procurement"],
    roles: ["Plant Manager", "Manager", "Supervisor", "Operator", "Staff"],
    modules: Array.from(new Set([...BASE_MODULES, "qms", "fleet", "planning"])),
    workflows: { approvalDepth: 2, leaveTypes: ["ANNUAL", "SICK", "MATERNITY", "UNPAID"], primaryLanguage: "en" },
    labels: { employee: "Employee", department: "Department", vehicle: "Vehicle" },
  },
  healthcare: {
    departments: ["Clinical", "Pharmacy", "Nursing", "Laboratory", "Administration", "Finance", "HR"],
    roles: ["Director", "Manager", "Clinician", "Nurse", "Staff"],
    modules: Array.from(new Set([...BASE_MODULES, "qms", "fleet", "planning"])),
    workflows: { approvalDepth: 2, leaveTypes: ["ANNUAL", "SICK", "MATERNITY", "PATERNITY", "UNPAID"], primaryLanguage: "en" },
    labels: { employee: "Staff", department: "Department", patient: "Patient" },
  },
  logistics: {
    departments: ["Operations", "Fleet", "Warehouse", "Dispatch", "HR", "Finance"],
    roles: ["Operations Manager", "Dispatcher", "Driver", "Staff"],
    modules: Array.from(new Set([...BASE_MODULES, "fleet", "planning"])),
    workflows: { approvalDepth: 1, leaveTypes: ["ANNUAL", "SICK", "UNPAID"], primaryLanguage: "en" },
    labels: { employee: "Employee", department: "Department", vehicle: "Vehicle" },
  },
  education: {
    departments: ["Academics", "Administration", "Finance", "HR", "Student Services"],
    roles: ["Principal", "Head", "Teacher", "Staff"],
    modules: Array.from(new Set([...BASE_MODULES, "planning", "reports"])),
    workflows: { approvalDepth: 2, leaveTypes: ["ANNUAL", "SICK", "STUDY", "UNPAID"], primaryLanguage: "en" },
    labels: { employee: "Staff", department: "Department" },
  },
  government: {
    departments: ["Administration", "Finance", "HR", "Operations", "Planning"],
    roles: ["Director", "Manager", "Officer", "Staff"],
    modules: Array.from(new Set([...BASE_MODULES, "planning", "reports"])),
    workflows: { approvalDepth: 3, leaveTypes: ["ANNUAL", "SICK", "MATERNITY", "UNPAID"], primaryLanguage: "en" },
    labels: { employee: "Staff", department: "Department" },
  },
  other: {
    departments: ["Operations", "HR", "Finance"],
    roles: ["Manager", "Staff"],
    modules: Array.from(new Set([...BASE_MODULES])),
    workflows: { approvalDepth: 1, leaveTypes: ["ANNUAL", "SICK", "UNPAID"], primaryLanguage: "en" },
    labels: { employee: "Employee", department: "Department" },
  },
};

export function getIndustryDefaults(industryType?: string, orgSize?: string): IndustryDefaults {
  const key = (industryType || "other").toLowerCase();
  const base = TEMPLATES[key] || TEMPLATES.other;
  const approvalDepth = orgSize === "micro" || orgSize === "small" ? 1 : orgSize === "large" || orgSize === "enterprise" ? 3 : (base.workflows?.approvalDepth ?? 2);
  return {
    departments: base.departments || TEMPLATES.other.departments!,
    roles: base.roles || TEMPLATES.other.roles!,
    modules: base.modules || TEMPLATES.other.modules!,
    workflows: {
      approvalDepth,
      leaveTypes: base.workflows?.leaveTypes || ["ANNUAL", "SICK", "UNPAID"],
      primaryLanguage: base.workflows?.primaryLanguage || "en",
    },
    labels: base.labels || { employee: "Employee", department: "Department" },
  };
}
