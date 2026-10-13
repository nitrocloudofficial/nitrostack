/**
 * Shared time parsing/formatting helpers. Extracted from ForecastService so
 * the Phase 2 driver module (demand estimation, next-zone suggestions) can
 * reuse the same "9 PM" / "21:00" / ISO-timestamp parsing logic instead of
 * duplicating it.
 */

/** Parses a free-form time label ("9 PM", "21:00", "9:30 pm", ISO timestamp) into a 0-23 hour. */
export function parseHourFromLabel(input: string): number {
  const trimmed = input.trim().toLowerCase();

  if (trimmed === 'now' || trimmed === '') {
    return new Date().getHours();
  }

  // "9 PM", "9:30 pm", "21:00", "21"
  const ampmMatch = trimmed.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1], 10) % 12;
    if (ampmMatch[3] === 'pm') hour += 12;
    return hour;
  }

  const twentyFourMatch = trimmed.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (twentyFourMatch) {
    const hour = parseInt(twentyFourMatch[1], 10);
    if (hour >= 0 && hour <= 23) return hour;
  }

  // ISO-ish timestamps
  const parsedDate = new Date(input);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate.getHours();
  }

  // Fallback: assume evening if unparseable, since that's the most common
  // "return trip" / "end of shift" scenario, and note it's a best-effort guess.
  return 19;
}

export function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
}

/** True if "now" (or the given date) falls on a Saturday/Sunday. */
export function isWeekend(date: Date = new Date()): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export interface ParsedDateTime {
  hour: number;
  dayOffset: number; // 0 = today, 1 = tomorrow
  label: string;
  isWeekend: boolean;
  date: Date;
}

/**
 * Parses free-form phrases like "8 AM tomorrow", "tomorrow at 8am",
 * "7 AM", "today 6pm" into an hour + day offset. Reuses
 * parseHourFromLabel for the time portion after stripping the
 * today/tomorrow keyword.
 */
export function parseDateTimeLabel(input: string): ParsedDateTime {
  const trimmed = input.trim().toLowerCase();
  const dayOffset = trimmed.includes('tomorrow') ? 1 : 0;
  const timePortion = trimmed.replace(/tomorrow|today/g, '').trim() || 'now';

  const hour = parseHourFromLabel(timePortion);
  const target = new Date();
  target.setDate(target.getDate() + dayOffset);
  target.setHours(hour, 0, 0, 0);

  const dayLabel = dayOffset === 1 ? 'tomorrow' : 'today';
  return {
    hour,
    dayOffset,
    label: `${formatHourLabel(hour)}${dayOffset > 0 ? ` ${dayLabel}` : ''}`,
    isWeekend: isWeekend(target),
    date: target,
  };
}

/** Formats a Date's hour + relative day label (e.g. "5:45 AM today", "9:00 PM tomorrow"). */
export function formatDateTimeLabel(date: Date, referenceNow: Date = new Date()): string {
  const hourLabel = formatHourLabel(date.getHours());
  const startOfRef = new Date(referenceNow.getFullYear(), referenceNow.getMonth(), referenceNow.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOfDate.getTime() - startOfRef.getTime()) / (24 * 60 * 60 * 1000));

  if (dayDiff === 0) return `${hourLabel} today`;
  if (dayDiff === 1) return `${hourLabel} tomorrow`;
  if (dayDiff === -1) return `${hourLabel} yesterday`;
  return hourLabel;
}
