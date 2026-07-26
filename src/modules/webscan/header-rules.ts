/**
 * Baseline HTTP security header checks for scan_website. Deliberately a
 * small, explicit list rather than a scored heuristic — same "easier to
 * audit than a black-box score" reasoning triage-rules.ts uses.
 */

export interface HeaderCheck {
  header: string;
  severity: "high" | "medium" | "low";
  advice: string;
}

export const SECURITY_HEADERS: HeaderCheck[] = [
  {
    header: "strict-transport-security",
    severity: "high",
    advice: "Add Strict-Transport-Security to force HTTPS and prevent downgrade / SSL-stripping attacks.",
  },
  {
    header: "content-security-policy",
    severity: "high",
    advice: "Add a Content-Security-Policy to restrict script/style/frame sources and reduce XSS impact.",
  },
  {
    header: "x-content-type-options",
    severity: "medium",
    advice: "Add 'X-Content-Type-Options: nosniff' so browsers can't MIME-sniff a response into a different content type.",
  },
  {
    header: "x-frame-options",
    severity: "medium",
    advice: "Add 'X-Frame-Options: DENY' (or a CSP frame-ancestors directive) to prevent clickjacking.",
  },
  {
    header: "referrer-policy",
    severity: "low",
    advice: "Add a Referrer-Policy so full URLs (including query strings) aren't leaked to third-party origins.",
  },
  {
    header: "permissions-policy",
    severity: "low",
    advice: "Add a Permissions-Policy to explicitly disable powerful browser features the site doesn't use.",
  },
];

export interface HeaderFinding {
  header: string;
  present: boolean;
  value: string | null;
  severity: HeaderCheck["severity"];
  status: "pass" | "fail" | "warn";
  advice: string;
}

export function evaluateHeaders(headers: Headers): HeaderFinding[] {
  return SECURITY_HEADERS.map((check) => {
    const value = headers.get(check.header);
    const present = value !== null;
    return {
      header: check.header,
      present,
      value,
      severity: check.severity,
      status: present ? "pass" : check.severity === "high" ? "fail" : "warn",
      advice: check.advice,
    };
  });
}
