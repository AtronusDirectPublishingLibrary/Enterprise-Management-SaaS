export const PLATFORM_MODULE_GROUPS = [
  {
    title: "Core & Planning",
    modules: [
      { key: "pms", label: "PMS / Projects" },
      { key: "planning", label: "Planning Suite" },
      { key: "aop", label: "AOP" },
      { key: "strategic", label: "Strategic Plan" },
      { key: "roadmap", label: "Roadmap" },
      { key: "reports", label: "Reports" },
    ],
  },
  {
    title: "HR & People",
    modules: [
      { key: "hr", label: "HR Core" },
      { key: "hrAnalytics", label: "HR Analytics" },
      { key: "hrOps", label: "HR Operations" },
      { key: "recruitment", label: "Recruitment" },
      { key: "payroll", label: "Payroll" },
    ],
  },
  {
    title: "Tier 1 Enterprise",
    modules: [
      { key: "procurement", label: "Procurement & Vendors" },
      { key: "vendors", label: "Vendor Management" },
      { key: "warehouse", label: "Warehouse / WMS" },
      { key: "inventory_mgmt", label: "Inventory Mgmt" },
      { key: "accounting", label: "Accounting (GL/AP/AR)" },
      { key: "gl", label: "General Ledger" },
      { key: "ap", label: "Accounts Payable" },
      { key: "ar", label: "Accounts Receivable" },
      { key: "finance", label: "Finance" },
      { key: "maintenance", label: "Maintenance (EAM/CMMS)" },
      { key: "eam", label: "EAM" },
      { key: "cmms", label: "CMMS" },
    ],
  },
  {
    title: "Tier 2 Enterprise",
    modules: [
      { key: "crm", label: "CRM & Sales" },
      { key: "sales", label: "Sales / Orders" },
      { key: "portals_ext", label: "External Portals" },
      { key: "helpdesk", label: "Helpdesk / ITSM" },
      { key: "dms", label: "DMS & Records" },
    ],
  },
  {
    title: "Tier 3 Enterprise",
    modules: [
      { key: "grc", label: "GRC / Risk & Audit" },
      { key: "risk", label: "Risk" },
      { key: "bi", label: "BI & Analytics" },
      { key: "resources", label: "Resources & Capacity" },
      { key: "contracts", label: "Contracts & Legal" },
      { key: "ehs", label: "EHS / Safety" },
    ],
  },
  {
    title: "Operations & Public",
    modules: [
      { key: "fleet", label: "Fleet" },
      { key: "qms", label: "QMS" },
      { key: "audit", label: "Audit" },
      { key: "public_site", label: "Public Site" },
      { key: "languages", label: "Languages" },
    ],
  },
];

export const ALL_PLATFORM_MODULES = Array.from(new Set(PLATFORM_MODULE_GROUPS.flatMap(g => g.modules.map(m => m.key))));
