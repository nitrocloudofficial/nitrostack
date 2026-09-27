// A small mock CGHS-style rate list. This stands in for a real rate-list
// lookup (the frontend's "Verified — CGHS rate list" stamp needs
// something to actually check against). Matched by keyword against the
// submitted procedure name, case-insensitively.

const RATE_LIST: { keywords: string[]; label: string; medianRate: number }[] = [
  { keywords: ['appendectomy'], label: 'Appendectomy', medianRate: 175000 },
  { keywords: ['knee', 'arthroscop'], label: 'Arthroscopic Knee Surgery', medianRate: 260000 },
  { keywords: ['hip replacement'], label: 'Hip Replacement', medianRate: 380000 },
  { keywords: ['cataract'], label: 'Cataract Surgery', medianRate: 45000 },
  { keywords: ['angioplasty'], label: 'Angioplasty', medianRate: 250000 },
  { keywords: ['bypass', 'cabg'], label: 'Cardiac Bypass Surgery', medianRate: 350000 },
  { keywords: ['gallbladder', 'cholecystectomy'], label: 'Gallbladder Removal', medianRate: 95000 },
  { keywords: ['hernia'], label: 'Hernia Repair', medianRate: 85000 },
  { keywords: ['c-section', 'cesarean', 'caesarean'], label: 'Cesarean Delivery', medianRate: 65000 },
  { keywords: ['delivery', 'normal birth'], label: 'Normal Delivery', medianRate: 35000 },
  { keywords: ['dialysis'], label: 'Dialysis Session', medianRate: 3000 },
  { keywords: ['tonsil'], label: 'Tonsillectomy', medianRate: 55000 },
];

const FALLBACK_MEDIAN_RATE = 150000;

export type CghsCheckResult = {
  matchedLabel: string;
  medianRate: number;
  deltaPct: number;
  aboveMedianByMoreThan50Pct: boolean;
};

/** Looks up the closest known procedure and compares the submitted estimate against it. */
export function checkAgainstCghsRateList(procedure: string, submittedAmount: number): CghsCheckResult {
  const normalized = procedure.toLowerCase();
  const match = RATE_LIST.find((entry) =>
    entry.keywords.some((keyword) => normalized.includes(keyword))
  );

  const medianRate = match?.medianRate ?? FALLBACK_MEDIAN_RATE;
  const deltaPct = medianRate > 0 ? ((submittedAmount - medianRate) / medianRate) * 100 : 0;

  return {
    matchedLabel: match?.label ?? 'General procedure (no exact match — using default reference rate)',
    medianRate,
    deltaPct: Math.round(deltaPct * 10) / 10,
    aboveMedianByMoreThan50Pct: deltaPct > 50,
  };
}
