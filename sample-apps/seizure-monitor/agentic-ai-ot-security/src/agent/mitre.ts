/**
 * MITRE ATT&CK for ICS Mapping Module
 * Converted from ot-responder/agent/mitre.py
 */

import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MITRE_CSV = path.resolve(__dirname, "..", "..", "data", "mitre_map.csv");

export interface MitreMapping {
  mitre_id: string;
  mitre_tactic: string;
  technique_name: string;
}

/**
 * Looks up attack_type in mitre_map.csv and returns MITRE ID, tactic, and technique name.
 */
export function getMitreMapping(attackType: string): MitreMapping {
  if (fs.existsSync(MITRE_CSV)) {
    const content = fs.readFileSync(MITRE_CSV, "utf-8");
    const lines = content.trim().split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      const headers = lines[0].split(",").map(h => h.trim());
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ""; });
        if (row["attack_type"] && row["attack_type"].toLowerCase() === attackType.toLowerCase()) {
          return {
            mitre_id: row["mitre_id"],
            mitre_tactic: row["mitre_tactic"],
            technique_name: row["technique_name"]
          };
        }
      }
    }
  }

  // Fallback default
  return {
    mitre_id: "T0846",
    mitre_tactic: "Discovery",
    technique_name: "Remote System Discovery"
  };
}
