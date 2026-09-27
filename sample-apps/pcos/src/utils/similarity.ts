export function safeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = parseFloat(value.replace(',', '.'));
    return Number.isFinite(normalized) ? normalized : null;
  }

  return null;
}

export function bestPatternMatch(patterns: any[], labValues: Record<string, number | null>) {
  if (!patterns.length) {
    return null;
  }

  const scored = patterns.map((pattern) => {
    const score = calculatePatternScore(pattern, labValues);
    return {
      pattern,
      score
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  return best.score > 0
    ? {
        score: Math.round(best.score * 100),
        pattern: best.pattern
      }
    : null;
}

function calculatePatternScore(pattern: Record<string, unknown>, labValues: Record<string, number | null>) {
  const fields = ['cycle_length', 'menstrual_duration', 'follicular_phase_length', 'luteal_phase_length', 'ovulation_day'];
  const scores = fields.map((field) => {
    const patternValue = safeNumber(pattern[field]);
    if (patternValue === null) {
      return 0;
    }

    const labValue = labValues[field] ?? null;
    if (labValue === null) {
      return 0.2;
    }

    const delta = Math.abs(patternValue - labValue);
    return Math.max(0, 1 - delta / Math.max(patternValue, labValue, 1));
  });

  const total = scores.reduce((sum, value) => sum + value, 0);
  return total / fields.length;
}

export function buildFindingSummary(
  labValues: Record<string, number | null>,
  matchedTrend: { score: number; pattern: any } | null,
  explanations: string[]
) {
  const findings: string[] = [];

  if (labValues.LH !== null && labValues.FSH !== null) {
    findings.push(`LH/FSH ratio is ${Number((labValues.LH / labValues.FSH).toFixed(2))}.`);
  }

  if (labValues.Insulin !== null) {
    findings.push(`Insulin level is ${labValues.Insulin}.`);
  }

  if (labValues.HbA1c !== null) {
    findings.push(`HbA1c level is ${labValues.HbA1c}.`);
  }

  if (matchedTrend) {
    findings.push(`A similar menstrual pattern was identified with ${matchedTrend.score}% confidence.`);
  } else {
    findings.push('No closely matching menstrual pattern was identified from the reference dataset.');
  }

  findings.push(...explanations.slice(0, 2));

  return findings.join(' ');
}
