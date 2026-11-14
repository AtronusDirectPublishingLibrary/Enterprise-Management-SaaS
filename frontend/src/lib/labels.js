const DEFAULT_LABELS = {
  employee: "Employee",
  department: "Department",
  vehicle: "Vehicle",
  deviation: "Deviation",
  capa: "CAPA",
  batch: "Batch Record",
  patient: "Patient",
};

export function getLabel(key, tenantContextOrLabels) {
  const labels = tenantContextOrLabels?.labels || tenantContextOrLabels || {};
  return labels[key] || DEFAULT_LABELS[key] || key;
}

export default DEFAULT_LABELS;
