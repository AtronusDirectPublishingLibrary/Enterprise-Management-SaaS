/**
 * Ethiopian PAYE bands (Proclamation No. 1395/2025) and pension contributions.
 * Kept in one place so the payroll register, payslips and exports cannot drift.
 */
export const PENSION_EMPLOYEE_RATE = 0.07;
export const PENSION_EMPLOYER_RATE = 0.11;

export function calculatePaye(taxableIncome: number): number {
  if (taxableIncome <= 2000) return 0;
  if (taxableIncome <= 4000) return taxableIncome * 0.15 - 300;
  if (taxableIncome <= 7000) return taxableIncome * 0.2 - 500;
  if (taxableIncome <= 10000) return taxableIncome * 0.25 - 850;
  if (taxableIncome <= 14000) return taxableIncome * 0.3 - 1350;
  return taxableIncome * 0.35 - 2050;
}

export interface PayrollBreakdown {
  baseSalary: number;
  allowance: number;
  otherEarnings: number;
  gross: number;
  pension: number;
  employerPension: number;
  taxable: number;
  tax: number;
  otherDeductions: number;
  net: number;
}

export function calculatePayroll(
  baseSalary: number,
  allowance = 0,
  otherEarnings = 0,
  otherDeductions = 0
): PayrollBreakdown {
  const base = Math.max(0, Number(baseSalary) || 0);
  const extra = Math.max(0, Number(allowance) || 0);
  const occasional = Math.max(0, Number(otherEarnings) || 0);
  const deductions = Math.max(0, Number(otherDeductions) || 0);
  const gross = base + extra + occasional;
  const pension = base * PENSION_EMPLOYEE_RATE;
  const taxable = Math.max(0, gross - pension);
  const tax = Math.max(0, calculatePaye(taxable));
  const net = Math.max(0, gross - pension - tax - deductions);
  return {
    baseSalary: base,
    allowance: extra,
    otherEarnings: occasional,
    gross,
    pension,
    employerPension: base * PENSION_EMPLOYER_RATE,
    taxable,
    tax,
    otherDeductions: deductions,
    net,
  };
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthLabel(year: number, month: number) {
  return `${MONTH_NAMES[Math.min(11, Math.max(0, month - 1))]} ${year}`;
}
