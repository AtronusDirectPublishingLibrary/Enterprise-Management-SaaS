/**
 * Which renewal obligations apply to a member of staff depends on their
 * profession: a pharmacist renews a practising licence every two years, an
 * accountant does not. The portal uses this catalogue to decide which
 * credentials to ask for and which expiry dates to track.
 */
export type Profession = {
  code: string;
  label: string;
  group: string;
  /** Professional licence / registration that must be kept current. */
  requiresLicence: boolean;
  licenceLabel?: string;
  /** Periodic medical fitness certificate (food, lab and clinical roles). */
  requiresMedical?: boolean;
  medicalLabel?: string;
  /** Default validity in months, used to pre-fill the form hint. */
  licenceValidityMonths?: number;
};

export const PROFESSIONS: Profession[] = [
  { code: "PHYSICIAN", label: "Physician", group: "Clinical", requiresLicence: true, licenceLabel: "Medical practice licence", requiresMedical: true, medicalLabel: "Occupational health certificate", licenceValidityMonths: 24 },
  { code: "NURSE", label: "Nurse", group: "Clinical", requiresLicence: true, licenceLabel: "Nursing licence", requiresMedical: true, medicalLabel: "Occupational health certificate", licenceValidityMonths: 24 },
  { code: "PHARMACIST", label: "Pharmacist", group: "Clinical", requiresLicence: true, licenceLabel: "Pharmacist licence", requiresMedical: false, licenceValidityMonths: 24 },
  { code: "LAB_TECHNICIAN", label: "Laboratory technician", group: "Laboratory", requiresLicence: true, licenceLabel: "Laboratory technologist licence", requiresMedical: true, medicalLabel: "Medical fitness certificate", licenceValidityMonths: 24 },
  { code: "QC_ANALYST", label: "QC / analytical chemist", group: "Laboratory", requiresLicence: false, requiresMedical: true, medicalLabel: "Medical fitness certificate" },
  { code: "QA_SPECIALIST", label: "QA specialist", group: "Quality", requiresLicence: false },
  { code: "ENGINEER", label: "Engineer", group: "Engineering", requiresLicence: true, licenceLabel: "Professional engineer registration", licenceValidityMonths: 36 },
  { code: "TECHNICIAN", label: "Engineering technician", group: "Engineering", requiresLicence: false },
  { code: "HSE_OFFICER", label: "Health, safety & environment officer", group: "Operations", requiresLicence: true, licenceLabel: "HSE practitioner certificate", requiresMedical: true, medicalLabel: "Occupational health certificate", licenceValidityMonths: 24 },
  { code: "DRIVER", label: "Driver", group: "Operations", requiresLicence: true, licenceLabel: "Driving licence", requiresMedical: true, medicalLabel: "Medical fitness certificate", licenceValidityMonths: 60 },
  { code: "SUPPLY_CHAIN", label: "Supply chain / stores", group: "Operations", requiresLicence: false },
  { code: "FINANCE", label: "Finance", group: "Corporate", requiresLicence: false },
  { code: "HR", label: "Human resources", group: "Corporate", requiresLicence: false },
  { code: "IT", label: "Information technology", group: "Corporate", requiresLicence: false },
  { code: "ADMINISTRATION", label: "Administration", group: "Corporate", requiresLicence: false },
  { code: "OTHER", label: "Other", group: "Other", requiresLicence: false },
];

export const findProfession = (code?: string | null) =>
  PROFESSIONS.find((profession) => profession.code === code) || null;
