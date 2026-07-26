/**
 * Common sensitive paths worth a read-only GET probe. This is deliberately
 * a fixed list, not a wordlist brute-force — scan_website is meant to be a
 * quick, low-noise check, not a directory-buster.
 */

export interface ExposedFileCheck {
  path: string;
  severity: "critical" | "high" | "medium";
  description: string;
}

export const SENSITIVE_PATHS: ExposedFileCheck[] = [
  { path: "/.env", severity: "critical", description: "Environment file — often contains API keys, DB credentials, and secrets." },
  { path: "/.aws/credentials", severity: "critical", description: "AWS credentials file." },
  { path: "/id_rsa", severity: "critical", description: "Private SSH key." },
  { path: "/.git/config", severity: "high", description: "Git config — confirms an exposed .git directory; source and history may be downloadable." },
  { path: "/.git/HEAD", severity: "high", description: "Git internal ref — confirms an exposed .git directory." },
  { path: "/wp-config.php.bak", severity: "high", description: "WordPress config backup — often contains DB credentials in plaintext." },
  { path: "/config.php.bak", severity: "high", description: "Backup config file — may contain credentials." },
  { path: "/.DS_Store", severity: "medium", description: "macOS folder metadata — can reveal a directory's file listing." },
  { path: "/server-status", severity: "medium", description: "Apache mod_status page — can leak internal request/IP details." },
];
