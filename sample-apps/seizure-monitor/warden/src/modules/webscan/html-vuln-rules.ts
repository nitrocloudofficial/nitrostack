/**
 * Pattern-based checks over a page's raw HTML markup, looking for
 * client-side vulnerability classes that header-rules.ts/tls-check.ts
 * can't see: hardcoded secrets, DOM XSS sinks, mixed content, reverse
 * tabnabbing, insecure form submission, missing Subresource Integrity, and
 * sensitive HTML comments. Same reasoning as the rest of webscan: plain,
 * deterministic regex over markup that's already been fetched — no
 * headless browser, no exploitation attempts, nothing that mutates the
 * target.
 *
 * Secret matches are never returned in full — `mask()` keeps a short
 * prefix and replaces the rest with `*`, since findings flow into logs,
 * traces, and (for read_threat_report-style tools) potentially back to a
 * model; the point is to prove a secret is exposed, not to relay it.
 */

export type HtmlVulnCategory =
  | "hardcoded_secret"
  | "insecure_form_submission"
  | "dom_xss_sink"
  | "mixed_content"
  | "reverse_tabnabbing"
  | "missing_sri"
  | "inline_event_handlers"
  | "sensitive_comment";

export interface HtmlVulnFinding {
  category: HtmlVulnCategory;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  evidence: string;
  location: string;
}

function lineNumberAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text[i] === "\n") line++;
  return line;
}

function trimExcerpt(s: string, max = 160): string {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

// ---- 1. Hardcoded secrets / API keys --------------------------------------

interface SecretRule {
  name: string;
  regex: RegExp;
  mask: (match: string) => string;
}

const maskTail = (m: string, keep: number) => `${m.slice(0, keep)}${"*".repeat(Math.max(m.length - keep, 4))}`;

const SECRET_RULES: SecretRule[] = [
  { name: "AWS Access Key ID", regex: /AKIA[0-9A-Z]{16}/g, mask: (m) => maskTail(m, 4) },
  { name: "Google API Key", regex: /AIza[0-9A-Za-z\-_]{35}/g, mask: (m) => maskTail(m, 4) },
  { name: "Stripe Live Secret Key", regex: /sk_live_[0-9a-zA-Z]{16,}/g, mask: (m) => maskTail(m, 8) },
  { name: "Slack Token", regex: /xox[baprs]-[0-9A-Za-z-]{10,}/g, mask: (m) => maskTail(m, 5) },
  {
    name: "Private Key Block",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    mask: () => "-----BEGIN [REDACTED] PRIVATE KEY-----",
  },
  {
    name: "Generic API key/secret assignment",
    regex: /\b(?:api[_-]?key|secret[_-]?key|access[_-]?token|client[_-]?secret)\s*[:=]\s*["'][0-9A-Za-z\-_]{16,}["']/gi,
    mask: (m) => m.replace(/["'][0-9A-Za-z\-_]{16,}["']/, (v) => `"${maskTail(v.slice(1, -1), 4)}"`),
  },
];

function findHardcodedSecrets(html: string): HtmlVulnFinding[] {
  const findings: HtmlVulnFinding[] = [];
  for (const rule of SECRET_RULES) {
    rule.regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.regex.exec(html))) {
      findings.push({
        category: "hardcoded_secret",
        severity: "critical",
        description: `Possible hardcoded ${rule.name} embedded directly in page markup or inline script.`,
        evidence: rule.mask(m[0]),
        location: `line ${lineNumberAt(html, m.index)}`,
      });
    }
  }
  return findings;
}

// ---- 2. Insecure form submission (password field over cleartext) --------

function findInsecureForms(html: string, pageUrl: URL | null): HtmlVulnFinding[] {
  const findings: HtmlVulnFinding[] = [];
  const formRe = /<form\b[^>]*>([\s\S]*?)<\/form>/gi;
  let m: RegExpExecArray | null;
  while ((m = formRe.exec(html))) {
    const openTag = m[0].slice(0, m[0].indexOf(">") + 1);
    const body = m[1];
    if (!/<input\b[^>]*type\s*=\s*["']password["']/i.test(body)) continue;

    const actionMatch = openTag.match(/action\s*=\s*["']([^"']*)["']/i);
    const action = actionMatch ? actionMatch[1] : "";
    const explicitlyHttp = /^http:\/\//i.test(action);
    const inheritsHttpPage = pageUrl?.protocol === "http:" && !/^https:\/\//i.test(action);

    if (explicitlyHttp || inheritsHttpPage) {
      findings.push({
        category: "insecure_form_submission",
        severity: "critical",
        description: "A form containing a password field submits over plain HTTP — credentials would be sent in cleartext and are interceptable in transit.",
        evidence: trimExcerpt(openTag),
        location: `line ${lineNumberAt(html, m.index)}`,
      });
    }
  }
  return findings;
}

// ---- 3. DOM XSS sinks, flagged higher when fed an attacker-controllable source

const XSS_SOURCE_RE = /location\.(?:search|hash|href)|document\.(?:URL|documentURI|referrer|location)|window\.name/;
const XSS_SINK_RE = /\.innerHTML\s*=|\.outerHTML\s*=|document\.write(?:ln)?\s*\(|insertAdjacentHTML\s*\(|eval\s*\(/;

function findDomXssSinks(html: string): HtmlVulnFinding[] {
  const findings: HtmlVulnFinding[] = [];
  const scriptRe = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = scriptRe.exec(html))) {
    const body = m[1];
    const sinkMatch = body.match(XSS_SINK_RE);
    if (!sinkMatch) continue;
    const hasSource = XSS_SOURCE_RE.test(body);
    findings.push({
      category: "dom_xss_sink",
      severity: hasSource ? "high" : "medium",
      description: hasSource
        ? "Inline script writes an attacker-influenceable source (URL, hash, referrer, or window.name) into a raw DOM sink — a classic DOM-based XSS pattern."
        : "Inline script uses a raw DOM sink (innerHTML/outerHTML/document.write/eval/insertAdjacentHTML) — confirm the value written is never attacker-influenced.",
      evidence: trimExcerpt(sinkMatch[0]),
      location: `line ${lineNumberAt(html, m.index + (sinkMatch.index ?? 0))}`,
    });
  }
  return findings;
}

// ---- 4. Mixed content (HTTPS page loading an HTTP resource) --------------

function findMixedContent(html: string, pageUrl: URL | null): HtmlVulnFinding[] {
  if (!pageUrl || pageUrl.protocol !== "https:") return [];
  const findings: HtmlVulnFinding[] = [];
  const re = /\b(?:src|href|action)\s*=\s*["']http:\/\/[^"']+["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    findings.push({
      category: "mixed_content",
      severity: "medium",
      description: "Page served over HTTPS loads a resource over plain HTTP — modern browsers block or warn on this, and it's interceptable/tamperable in transit.",
      evidence: trimExcerpt(m[0]),
      location: `line ${lineNumberAt(html, m.index)}`,
    });
  }
  return findings;
}

// ---- 5. Reverse tabnabbing (target=_blank without rel=noopener) ---------

function findReverseTabnabbing(html: string): HtmlVulnFinding[] {
  const findings: HtmlVulnFinding[] = [];
  const anchorRe = /<a\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html))) {
    const tag = m[0];
    if (!/target\s*=\s*["']_blank["']/i.test(tag)) continue;
    if (/rel\s*=\s*["'][^"']*\b(?:noopener|noreferrer)\b/i.test(tag)) continue;
    findings.push({
      category: "reverse_tabnabbing",
      severity: "medium",
      description: 'Link opens in a new tab (target="_blank") without rel="noopener" — the opened page can access window.opener and redirect the original tab to a phishing page.',
      evidence: trimExcerpt(tag),
      location: `line ${lineNumberAt(html, m.index)}`,
    });
  }
  return findings;
}

// ---- 6. Missing Subresource Integrity on third-party assets --------------

function findMissingSri(html: string, pageUrl: URL | null): HtmlVulnFinding[] {
  const findings: HtmlVulnFinding[] = [];
  const tagRe = /<(script|link)\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html))) {
    const tag = m[0];
    const tagName = m[1].toLowerCase();
    if (tagName === "link" && !/rel\s*=\s*["']stylesheet["']/i.test(tag)) continue;

    const urlAttr = tagName === "script" ? tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i) : tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    if (!urlAttr) continue;
    const resourceUrl = urlAttr[1];
    if (!/^https?:\/\//i.test(resourceUrl)) continue; // relative/same-origin — SRI isn't the norm there
    if (pageUrl && resourceUrl.startsWith(pageUrl.origin)) continue; // absolute but same-origin
    if (/\bintegrity\s*=/i.test(tag)) continue;

    findings.push({
      category: "missing_sri",
      severity: "medium",
      description: "Third-party script or stylesheet loaded without a Subresource Integrity (integrity=) attribute — if that CDN is compromised, it can inject arbitrary code into this page.",
      evidence: trimExcerpt(tag),
      location: `line ${lineNumberAt(html, m.index)}`,
    });
  }
  return findings;
}

// ---- 7. Sensitive-looking HTML comments -----------------------------------

const SENSITIVE_COMMENT_RE = /\b(?:password|passwd|secret|api[_-]?key|token|todo:?\s*remove|fixme|internal\s+only|do not deploy|debug)\b/i;

function findSensitiveComments(html: string): HtmlVulnFinding[] {
  const findings: HtmlVulnFinding[] = [];
  const re = /<!--([\s\S]*?)-->/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (!SENSITIVE_COMMENT_RE.test(m[1])) continue;
    findings.push({
      category: "sensitive_comment",
      severity: "low",
      description: "HTML comment references credentials, secrets, or internal-only notes — comments ship to every visitor's browser and are trivially visible via View Source.",
      evidence: trimExcerpt(m[1]),
      location: `line ${lineNumberAt(html, m.index)}`,
    });
  }
  return findings;
}

// ---- 8. Inline event-handler attributes (CSP-hardening / XSS blast radius)

function findInlineEventHandlers(html: string): HtmlVulnFinding[] {
  const re = /\son[a-z]+\s*=\s*["'][^"']*["']/gi;
  const matches: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) matches.push(m);
  if (matches.length === 0) return [];

  const shown = matches.slice(0, 5);
  const findings: HtmlVulnFinding[] = shown.map((mm) => ({
    category: "inline_event_handlers" as const,
    severity: "low" as const,
    description: "Inline event-handler attribute — blocks adoption of a strict Content-Security-Policy (no 'unsafe-inline') and widens the blast radius of any XSS that reaches markup.",
    evidence: trimExcerpt(mm[0]),
    location: `line ${lineNumberAt(html, mm.index)}`,
  }));
  if (matches.length > shown.length) {
    findings.push({
      category: "inline_event_handlers",
      severity: "low",
      description: `${matches.length - shown.length} additional inline event-handler attribute(s) found (not listed individually — see count).`,
      evidence: `${matches.length} total inline event handlers on this page`,
      location: "page-wide",
    });
  }
  return findings;
}

export function scanHtmlForVulnerabilities(html: string, pageUrl: URL | null): HtmlVulnFinding[] {
  return [
    ...findHardcodedSecrets(html),
    ...findInsecureForms(html, pageUrl),
    ...findDomXssSinks(html),
    ...findMixedContent(html, pageUrl),
    ...findReverseTabnabbing(html),
    ...findMissingSri(html, pageUrl),
    ...findSensitiveComments(html),
    ...findInlineEventHandlers(html),
  ];
}
