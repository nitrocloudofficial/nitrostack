import type { CallToolResponse } from '@nitrostack/widgets';
import { RankedHospitalData } from './types';

/**
 * Tool call results arrive as either OpenAI-style structuredContent or a
 * plain JSON-encoded string in `result` (MCP Apps). Errors surface as
 * `isError: true` rather than a rejected promise, so this normalizes both
 * into either a parsed value or a thrown Error.
 */
export function parseToolResult<T>(response: CallToolResponse): T {
  if (response.isError) {
    throw new Error(response.result || 'Tool call failed');
  }

  if (response.structuredContent !== undefined && response.structuredContent !== null) {
    return response.structuredContent as T;
  }

  try {
    return JSON.parse(response.result) as T;
  } catch {
    throw new Error('Failed to parse tool response');
  }
}

function hasWindow(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined';
}

/**
 * `getToolInput()` returns the raw arguments the calling AI sent — it never
 * passes through our server's Zod schema (that only validates what the
 * server itself receives), so a client that serializes numbers as JSON
 * strings can hand the widget `"11.0016"` instead of `11.0016`. Coordinate
 * math (`.toFixed`, Leaflet's projections) requires an actual `number` and
 * throws on a string, so every numeric field read from tool input must be
 * coerced through this rather than trusted at face value.
 */
export function toFiniteNumber(value: unknown): number | null {
  const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(num) ? num : null;
}

/** Feature-detected — never throws even outside a browser context (e.g. during static export). */
export function isIOS(): boolean {
  if (!hasWindow()) return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  if (!hasWindow()) return false;
  return /android/i.test(navigator.userAgent);
}

/**
 * Navigation deep link to the given hospital. Destination is always the
 * hospital — falls back to a name search if coordinates are somehow missing
 * (they never are in Lifeline's data model, but this keeps the link usable
 * rather than broken if that ever changes). Apple Maps on iOS (as requested
 * — it opens the native app via URL scheme), Google Maps everywhere else;
 * Google's own maps.google.com/dir link already opens the native Android
 * app via OS-level app-link association when installed, and falls back to
 * the browser on desktop, so no separate Android URL scheme is needed.
 */
export function buildNavigationUrl(
  origin: { latitude: number; longitude: number } | null,
  destination: { latitude: number; longitude: number; hospital_name?: string }
): string {
  const hasDestinationCoords = Number.isFinite(destination.latitude) && Number.isFinite(destination.longitude);
  const destinationParam = hasDestinationCoords
    ? `${destination.latitude},${destination.longitude}`
    : encodeURIComponent(destination.hospital_name ?? 'hospital');

  if (isIOS()) {
    const originParam = origin ? `&saddr=${origin.latitude},${origin.longitude}` : '';
    return `https://maps.apple.com/?daddr=${destinationParam}${originParam}&dirflg=d`;
  }

  const originParam = origin ? `&origin=${origin.latitude},${origin.longitude}` : '';
  return `https://www.google.com/maps/dir/?api=1${originParam}&destination=${destinationParam}&travelmode=driving`;
}

/**
 * openExternal() is a synchronous, void-returning bridge call — it can't
 * report whether the host actually launched something, but it can throw if
 * the bridge itself is unavailable. This normalizes that into a boolean so
 * callers can show "Unable to launch Maps." instead of failing silently.
 */
export function safeOpenExternal(openExternal: (url: string) => void, url: string): boolean {
  try {
    openExternal(url);
    return true;
  } catch {
    return false;
  }
}

/** Direct clipboard write (no share-sheet attempt) for explicit "Copy" buttons. */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (hasWindow() && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Clipboard access denied by the sandboxed iframe.
    }
  }
  return false;
}

/** Display-only department label before a real reservation exists (the server derives the authoritative one from bed_type once reserved). */
export function deriveDepartmentLabel(hospital: RankedHospitalData, requiredCapability: string): string {
  return hospital.capabilities.includes(requiredCapability) ? requiredCapability : 'General Emergency Department';
}

/** Google Maps place link for a hospital — used for "View on Google Maps" and location shares. */
export function buildMapsPlaceUrl(hospital: { latitude: number; longitude: number; hospital_name: string }): string {
  return `https://www.google.com/maps/search/?api=1&query=${hospital.latitude},${hospital.longitude}&query_place_id=${encodeURIComponent(hospital.hospital_name)}`;
}

/**
 * Every reason here is a real, evaluated comparison against the actual
 * candidate set (min/max across `allHospitals`) — the same fields that
 * drive `match_score` in RankingService. Only reasons that are actually
 * true for this hospital are shown; nothing is asserted unconditionally.
 * Shared by ExplainabilityPanel and HospitalDetailsModal so both stay
 * consistent with a single source of truth.
 */
export function buildEvidence(hospital: RankedHospitalData, allHospitals: RankedHospitalData[], requiredCapability: string): string[] {
  const evidence: string[] = [];

  if (hospital.capabilities.includes(requiredCapability)) {
    evidence.push(`✓ ${requiredCapability} available on-site`);
  }

  const minDistance = Math.min(...allHospitals.map((h) => h.distance_km));
  if (hospital.distance_km === minDistance) {
    evidence.push(`✓ Closest candidate hospital (${hospital.distance_km.toFixed(1)} km)`);
  }

  const minEta = Math.min(...allHospitals.map((h) => h.eta_minutes));
  if (hospital.eta_minutes === minEta) {
    evidence.push(`✓ Fastest ambulance ETA (${hospital.eta_minutes} min)`);
  }

  const minWait = Math.min(...allHospitals.map((h) => h.estimated_er_wait_minutes));
  if (hospital.estimated_er_wait_minutes === minWait) {
    evidence.push(`✓ Shortest ER wait time (~${hospital.estimated_er_wait_minutes} min)`);
  }

  if (hospital.icu_beds_available > 0) {
    evidence.push(`✓ ICU beds available (${hospital.icu_beds_available})`);
  }

  const maxScore = Math.max(...allHospitals.map((h) => h.match_score));
  if (hospital.match_score === maxScore) {
    evidence.push(`✓ Highest overall AI match score (${hospital.match_score}/100)`);
  }

  const maxCapabilityCount = Math.max(...allHospitals.map((h) => h.capabilities.length));
  if (hospital.capabilities.length === maxCapabilityCount && maxCapabilityCount > 1) {
    evidence.push(`✓ Broadest specialist/facility availability (${hospital.capabilities.length} capabilities)`);
  }

  if (evidence.length === 0) {
    evidence.push(`General ER care available, ${hospital.distance_km.toFixed(1)} km away with a ${hospital.eta_minutes} min ETA.`);
  }

  return evidence;
}

/**
 * Shares text via the Web Share API when available, otherwise copies to the
 * clipboard. Both are feature-detected — a sandboxed widget iframe may
 * restrict either depending on the host's `allow` attributes, which this
 * widget has no control over, so this always resolves rather than throwing.
 */
export async function shareOrCopy(title: string, text: string): Promise<'shared' | 'copied' | 'unavailable'> {
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await (navigator as Navigator & { share: (data: { title: string; text: string }) => Promise<void> }).share({ title, text });
      return 'shared';
    } catch {
      // User cancelled the share sheet, or it's blocked — fall through to clipboard.
    }
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return 'copied';
    } catch {
      // Clipboard access denied by the sandboxed iframe.
    }
  }
  return 'unavailable';
}
