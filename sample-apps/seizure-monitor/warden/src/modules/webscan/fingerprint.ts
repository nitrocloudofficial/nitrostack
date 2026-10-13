/**
 * Lightweight tech fingerprinting: detects CMS/framework/server/library
 * identity (and, where possible, version) from response headers and page
 * markup — no external service, just pattern matching against what
 * scan_website already fetched.
 *
 * HONEST LIMITATION: CVE-matching a detected technology only works for the
 * subset with a real OSV.dev ecosystem mapping (JS libraries on npm,
 * Drupal core on Packagist). OSV has no ecosystem for WordPress core, PHP,
 * Apache, or nginx — see `curl https://osv-vulnerabilities.storage.googleapis.com/ecosystems.txt`.
 * For those, fingerprint_technology reports the detected name/version and
 * says so explicitly, rather than silently returning zero vulnerabilities
 * as if that meant "confirmed clean."
 */

export type OsvEcosystem = "npm" | "PyPI" | "Go" | "Packagist";

export interface TechSignature {
  name: string;
  category: "cms" | "ecommerce" | "framework" | "js-library" | "css-framework" | "language" | "server";
  match: (ctx: { headers: Headers; html: string }) => { evidence: string; version: string | null } | null;
  osv?: { ecosystem: OsvEcosystem; package: string };
}

const SIGNATURES: TechSignature[] = [
  {
    name: "WordPress",
    category: "cms",
    match: ({ headers, html }) => {
      const gen = html.match(/<meta name=["']generator["'] content=["']WordPress ([\d.]+)/i);
      if (gen) return { evidence: "meta generator tag", version: gen[1] };
      if (/\/wp-content\/|\/wp-includes\//.test(html) || (headers.get("link") ?? "").includes("wp-json")) {
        return { evidence: "wp-content/wp-includes asset path or wp-json Link header", version: null };
      }
      return null;
    },
  },
  {
    name: "Drupal",
    category: "cms",
    match: ({ headers, html }) => {
      const gen = html.match(/<meta name=["']generator["'] content=["']Drupal ?([\d.]*)/i);
      if (gen) return { evidence: "meta generator tag", version: gen[1] || null };
      if (headers.get("x-drupal-cache") || headers.get("x-generator")?.toLowerCase().includes("drupal") || /Drupal\.settings/.test(html)) {
        return { evidence: "X-Drupal-Cache/X-Generator header or Drupal.settings global", version: null };
      }
      return null;
    },
    osv: { ecosystem: "Packagist", package: "drupal/core" },
  },
  {
    name: "Joomla",
    category: "cms",
    match: ({ html }) => {
      const gen = html.match(/<meta name=["']generator["'] content=["']Joomla! ([\d.]+)/i);
      if (gen) return { evidence: "meta generator tag", version: gen[1] };
      if (/\/media\/jui\/|Joomla!\s*-\s*Open Source/i.test(html)) return { evidence: "Joomla asset path or branding string", version: null };
      return null;
    },
  },
  {
    name: "Shopify",
    category: "ecommerce",
    match: ({ headers, html }) =>
      headers.get("x-shopid") || /cdn\.shopify\.com/.test(html)
        ? { evidence: "X-ShopId header or cdn.shopify.com asset", version: null }
        : null,
  },
  {
    name: "Magento",
    category: "ecommerce",
    match: ({ html }) => (/Mage\.Cookies|\/skin\/frontend\//.test(html) ? { evidence: "Magento JS namespace or skin path", version: null } : null),
  },
  {
    name: "Next.js",
    category: "framework",
    match: ({ headers, html }) => {
      if (headers.get("x-powered-by")?.toLowerCase().includes("next.js")) return { evidence: "X-Powered-By header", version: null };
      if (/__NEXT_DATA__/.test(html)) return { evidence: "__NEXT_DATA__ script tag", version: null };
      return null;
    },
  },
  {
    name: "Express",
    category: "framework",
    match: ({ headers }) => (headers.get("x-powered-by")?.toLowerCase() === "express" ? { evidence: "X-Powered-By header", version: null } : null),
  },
  {
    name: "ASP.NET",
    category: "framework",
    match: ({ headers }) => {
      const v = headers.get("x-aspnet-version");
      if (v) return { evidence: "X-AspNet-Version header", version: v };
      if (headers.get("x-powered-by")?.toLowerCase().includes("asp.net")) return { evidence: "X-Powered-By header", version: null };
      return null;
    },
  },
  {
    name: "jQuery",
    category: "js-library",
    match: ({ html }) => {
      const m = html.match(/jquery[.-]([\d]+\.[\d]+\.[\d]+)(?:\.min)?\.js/i) ?? html.match(/jquery\.js\?ver=([\d.]+)/i);
      return m ? { evidence: "script src version string", version: m[1] } : null;
    },
    osv: { ecosystem: "npm", package: "jquery" },
  },
  {
    name: "Bootstrap",
    category: "css-framework",
    match: ({ html }) => {
      const m = html.match(/bootstrap[.-]([\d]+\.[\d]+\.[\d]+)(?:\.min)?\.(?:js|css)/i);
      return m ? { evidence: "asset filename version string", version: m[1] } : null;
    },
    osv: { ecosystem: "npm", package: "bootstrap" },
  },
  {
    name: "PHP",
    category: "language",
    match: ({ headers }) => {
      const m = headers.get("x-powered-by")?.match(/PHP\/([\d.]+)/i);
      return m ? { evidence: "X-Powered-By header", version: m[1] } : null;
    },
  },
  {
    name: "Apache",
    category: "server",
    match: ({ headers }) => {
      const m = headers.get("server")?.match(/Apache\/([\d.]+)/i);
      return m ? { evidence: "Server header", version: m[1] } : null;
    },
  },
  {
    name: "nginx",
    category: "server",
    match: ({ headers }) => {
      const m = headers.get("server")?.match(/nginx\/([\d.]+)/i);
      return m ? { evidence: "Server header", version: m[1] } : null;
    },
  },
];

export interface DetectedTechnology {
  name: string;
  category: TechSignature["category"];
  version: string | null;
  evidence: string;
  osv_ecosystem?: OsvEcosystem;
  osv_package?: string;
}

export function fingerprintTechnologies(ctx: { headers: Headers; html: string }): DetectedTechnology[] {
  const results: DetectedTechnology[] = [];
  for (const sig of SIGNATURES) {
    const match = sig.match(ctx);
    if (!match) continue;
    results.push({
      name: sig.name,
      category: sig.category,
      version: match.version,
      evidence: match.evidence,
      osv_ecosystem: sig.osv?.ecosystem,
      osv_package: sig.osv?.package,
    });
  }
  return results;
}
