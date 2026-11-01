// CWE -> OWASP Top 10 (2021) category, and our finding rule ids -> CWE. Pure, offline, no network.
//
// The CWE lists below are the "List of Mapped CWEs" of each category page, copied on 2026-10-31 from
// https://owasp.org/Top10/2021/<A01_2021-Broken_Access_Control ... A10_2021-Server-Side_Request_Forgery_%28SSRF%29>/index.html
// (index: https://owasp.org/Top10/). A CWE may sit in more than one category (for example CWE-73, CWE-259).
// CWE ids that are not on those pages (for example CWE-250) get no category from this table rather than a guess.

export type OwaspId = 'A01:2021' | 'A02:2021' | 'A03:2021' | 'A04:2021' | 'A05:2021' | 'A06:2021' | 'A07:2021' | 'A08:2021' | 'A09:2021' | 'A10:2021';

export const OWASP_NAMES: Record<OwaspId, string> = {
  'A01:2021': 'Broken Access Control',
  'A02:2021': 'Cryptographic Failures',
  'A03:2021': 'Injection',
  'A04:2021': 'Insecure Design',
  'A05:2021': 'Security Misconfiguration',
  'A06:2021': 'Vulnerable and Outdated Components',
  'A07:2021': 'Identification and Authentication Failures',
  'A08:2021': 'Software and Data Integrity Failures',
  'A09:2021': 'Security Logging and Monitoring Failures',
  'A10:2021': 'Server-Side Request Forgery (SSRF)'
};

const OWASP_2021_CWES: Record<OwaspId, number[]> = {
  'A01:2021': [22, 23, 35, 59, 200, 201, 219, 264, 275, 276, 284, 285, 352, 359, 377, 402, 425, 441, 497, 538, 540, 548, 552, 566, 601, 639, 651, 668, 706, 862, 863, 913, 922, 1275],
  'A02:2021': [259, 261, 296, 310, 319, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 335, 336, 337, 338, 340, 347, 523, 720, 757, 759, 760, 780, 818, 916],
  'A03:2021': [20, 73, 74, 75, 77, 78, 79, 80, 83, 87, 88, 89, 90, 91, 93, 94, 95, 96, 97, 98, 99, 100, 113, 116, 138, 184, 470, 471, 564, 610, 643, 644, 652, 917],
  'A04:2021': [73, 183, 209, 213, 235, 256, 257, 266, 269, 280, 311, 312, 313, 316, 419, 430, 434, 444, 451, 472, 501, 522, 525, 539, 579, 598, 602, 642, 646, 650, 653, 656, 657, 799, 807, 840, 841, 927, 1021, 1173],
  'A05:2021': [2, 11, 13, 15, 16, 260, 315, 520, 526, 537, 541, 547, 611, 614, 756, 776, 942, 1004, 1032, 1174],
  'A06:2021': [937, 1035, 1104],
  'A07:2021': [255, 259, 287, 288, 290, 294, 295, 297, 300, 302, 304, 306, 307, 346, 384, 521, 613, 620, 640, 798, 940, 1216],
  'A08:2021': [345, 353, 426, 494, 502, 565, 784, 829, 830, 915],
  'A09:2021': [117, 223, 532, 778],
  'A10:2021': [918]
};

const CWE_TO_OWASP = new Map<string, OwaspId[]>();
for (const [cat, cwes] of Object.entries(OWASP_2021_CWES) as Array<[OwaspId, number[]]>) {
  for (const n of cwes) {
    const key = `CWE-${n}`;
    CWE_TO_OWASP.set(key, [...(CWE_TO_OWASP.get(key) ?? []), cat]);
  }
}

export function normalizeCwe(id: string): string | undefined {
  const m = String(id).trim().match(/^(?:CWE-)?(\d{1,5})$/i);
  return m ? `CWE-${Number(m[1])}` : undefined;
}

// Unknown or malformed ids return [] (left unmapped).
export function cweToOwasp(cwe: string): OwaspId[] {
  const key = normalizeCwe(cwe);
  return key ? [...(CWE_TO_OWASP.get(key) ?? [])] : [];
}

export function owaspForCwes(cwes: string[]): OwaspId[] {
  const out = new Set<OwaspId>();
  for (const c of cwes) for (const o of cweToOwasp(c)) out.add(o);
  return [...out].sort();
}

// Only mappings that are defensible from what the rule actually detects. Anything else is left out on purpose.
const RULE_CWE: Record<string, string[]> = {
  'env-file-committed': ['CWE-798', 'CWE-540'], // credentials / sensitive data kept with the source
  'php-eval': ['CWE-95'], // eval injection
  'php-unserialize-input': ['CWE-502'], // deserialization of untrusted data
  'php-sql-concatenation': ['CWE-89'], // SQL injection
  'php-dynamic-include': ['CWE-98'], // include path from request input
  'php-weak-password-hash': ['CWE-328', 'CWE-916'], // md5/sha1 password hashing
  'docker-runs-as-root': ['CWE-250'], // execution with unnecessary privileges
  'node-runtime-eol': ['CWE-1104'], // unmaintained component
  'php-version-eol': ['CWE-1104'],
  'docker-base-image-eol': ['CWE-1104'],
  'node-deprecated-package': ['CWE-1104'],
  'hardcoded-secret-in-source': ['CWE-798'], // use of hard-coded credentials
  'ci-pr-target-checkout': ['CWE-829'], // code from an untrusted source (PR head) runs in a privileged workflow
  'ci-action-unpinned-branch': ['CWE-829'] // action code taken from a branch that can change
};

export function cweForRule(ruleId: string): string[] {
  const base = ruleId.split(':')[0];
  return [...(RULE_CWE[base] ?? [])];
}

export interface Classification {
  cwe: string[];
  owasp: OwaspId[];
}

// Empty arrays mean "no defensible mapping".
export function classifyRule(ruleId: string): Classification {
  const cwe = cweForRule(ruleId);
  return { cwe, owasp: owaspForCwes(cwe) };
}

// CVSS v3 qualitative band (FIRST CVSS v3.1 specification, section 5).
export function cvssBand(score: number): 'none' | 'low' | 'medium' | 'high' | 'critical' {
  if (!Number.isFinite(score) || score <= 0) return 'none';
  if (score < 4) return 'low';
  if (score < 7) return 'medium';
  if (score < 9) return 'high';
  return 'critical';
}
