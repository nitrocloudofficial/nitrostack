export interface ParsedVariant {
  rsid: string;
  genotype: string;
}

// Known rsIDs per disease — used to filter the uploaded file to relevant variants only
const DISEASE_RSIDS: Record<string, string[]> = {
  type2_diabetes: ['rs7903146', 'rs12255372', 'rs4402960', 'rs7756992', 'rs1111875', 'rs13266634'],
  coronary_artery_disease: ['rs1333049', 'rs4977574'],
  age_related_macular_degeneration: ['rs1061170', 'rs10490924'],
};

export function parseAncestryFile(fileContent: string, disease: string): ParsedVariant[] {
  const relevantRsids = new Set(
    (DISEASE_RSIDS[disease] ?? []).map(r => r.toLowerCase())
  );

  // Normalize escape sequences — MCP Inspector sends literal \t and \n as two chars
  const normalized = fileContent
    .replace(/\\t/g, '\t')
    .replace(/\\n/g, '\n');

  const lines = normalized.split(/\r?\n/);
  const results: ParsedVariant[] = [];
  let headerParsed = false;
  let rsidCol = 0;
  let genoCol = -1;
  let allele1Col = -1;
  let allele2Col = -1;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const cols = line.split('\t');

    // Parse header row
    if (!headerParsed) {
      rsidCol    = cols.findIndex(c => c.toLowerCase() === 'rsid');
      genoCol    = cols.findIndex(c => c.toLowerCase() === 'genotype');
      allele1Col = cols.findIndex(c => c.toLowerCase() === 'allele1');
      allele2Col = cols.findIndex(c => c.toLowerCase() === 'allele2');
      if (rsidCol >= 0) { headerParsed = true; continue; }
      // No header found — assume 23andMe column order: rsid, chr, pos, genotype
      rsidCol = 0; genoCol = 3; headerParsed = true;
    }

    const rsid = cols[rsidCol]?.trim().toLowerCase();
    if (!rsid || !relevantRsids.has(rsid)) continue;

    let genotype = '';
    if (genoCol >= 0 && cols[genoCol]) {
      genotype = cols[genoCol].trim().toUpperCase();
    } else if (allele1Col >= 0 && allele2Col >= 0) {
      genotype = ((cols[allele1Col] ?? '') + (cols[allele2Col] ?? '')).toUpperCase();
    }

    if (genotype && genotype !== '--' && genotype !== '00') {
      results.push({ rsid: cols[rsidCol].trim(), genotype });
    }
  }

  return results;
}

export function countRiskAlleles(genotype: string, riskAllele: string): number {
  if (!genotype || !riskAllele) return 1;
  const upper = genotype.toUpperCase();
  if (upper === 'NN' || upper === '--' || upper === '00') return 1; // assume heterozygous when genotype unknown
  return upper.split('').filter(a => a === riskAllele.toUpperCase()).length;
}
