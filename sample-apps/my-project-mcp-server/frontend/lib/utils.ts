export function formatINR(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function parseCaseParams(searchParams: Record<string, string | string[] | undefined>) {
  const get = (key: string) => {
    const val = searchParams[key];
    return Array.isArray(val) ? val[0] : val;
  };

  const patientId = get('patientId') ?? '';
  const procedureCode = get('procedureCode') ?? '';
  const city = get('city') ?? '';
  const billed = get('hospitalBilledAmount');

  return {
    patientId,
    procedureCode,
    city,
    hospitalBilledAmount: billed ? Number(billed) : NaN,
    isValid: Boolean(patientId && procedureCode && city && billed && !Number.isNaN(Number(billed))),
  };
}
