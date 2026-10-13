/**
 * Pulls structured facts out of cleaned (already-scanned, already-stripped)
 * page text. This is the only thing derived from the fetched page that
 * ever reaches the model — plain facts, never raw prose from the source.
 */

const CVE_RE = /CVE-\d{4}-\d{4,7}/gi;
const ATTACK_TECHNIQUE_RE = /\bT1\d{3}(?:\.\d{3})?\b/g;
const IPV4_RE = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
const DOMAIN_RE = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|io|ru|cn|info|biz|xyz|top|club|online|site)\b/gi;

const KNOWN_ACTORS = [
  "Lazarus", "Lazarus Group", "APT28", "Fancy Bear", "APT29", "Cozy Bear",
  "Midnight Blizzard", "FIN7", "FIN8", "Conti", "LockBit", "BlackCat", "ALPHV",
  "Sandworm", "Kimsuky", "Scattered Spider", "Cl0p", "REvil", "DarkSide",
  "Wizard Spider", "Volt Typhoon", "Turla", "Equation Group", "Carbanak",
  "Silence Group", "TA505", "Hive", "BlackBasta", "Akira", "Play",
];

const SECTOR_KEYWORDS = [
  "financial services", "banking", "healthcare", "energy", "government",
  "retail", "manufacturing", "telecommunications", "education",
  "critical infrastructure", "insurance", "defense", "aviation", "transportation",
];

function uniq(arr: string[]): string[] {
  return [...new Set(arr.map((s) => s.trim()).filter(Boolean))];
}

export interface ExtractedFacts {
  cves: string[];
  techniques: string[];
  actors: string[];
  sectors: string[];
  indicators: string[];
}

export function extractFacts(visibleText: string): ExtractedFacts {
  const cves = uniq((visibleText.match(CVE_RE) ?? []).map((s) => s.toUpperCase()));
  const techniques = uniq((visibleText.match(ATTACK_TECHNIQUE_RE) ?? []).map((s) => s.toUpperCase()));
  const ips = uniq(visibleText.match(IPV4_RE) ?? []);
  const domains = uniq(visibleText.match(DOMAIN_RE) ?? []).filter((d) => !ips.includes(d));

  const lowerText = visibleText.toLowerCase();
  const actors = uniq(KNOWN_ACTORS.filter((a) => lowerText.includes(a.toLowerCase())));
  const sectors = uniq(SECTOR_KEYWORDS.filter((s) => lowerText.includes(s)));

  return {
    cves,
    techniques,
    actors,
    sectors,
    indicators: uniq([...ips, ...domains]),
  };
}

/** Up to 5 short factual sentences, favouring ones that mention an extracted fact. */
export function summarizeFacts(visibleText: string, facts: ExtractedFacts, max = 5): string[] {
  const sentences = visibleText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25 && s.length < 300);

  const anchors = [...facts.cves, ...facts.techniques, ...facts.actors, ...facts.sectors];
  const scored = sentences.map((s) => ({
    s,
    score: anchors.reduce((acc, a) => (s.toLowerCase().includes(a.toLowerCase()) ? acc + 1 : acc), 0),
  }));
  scored.sort((a, b) => b.score - a.score);

  const picked: string[] = [];
  for (const { s, score } of scored) {
    if (picked.length >= max) break;
    if (score === 0 && picked.length >= Math.min(2, max)) continue; // prefer fact-anchored sentences
    picked.push(s);
  }
  return picked.slice(0, max);
}
