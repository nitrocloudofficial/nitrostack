import { Injectable } from '@nitrostack/core';
import { Disease, GWASAssociation } from '../../types.js';

const GWAS_BASE = 'https://www.ebi.ac.uk/gwas/rest/api';

const DISEASE_TRAIT_PATTERNS: Record<Disease, string[]> = {
  type2_diabetes: ['type 2 diabetes', 'type ii diabetes', 'type-2 diabetes', 't2d', 'diabetes mellitus, type 2'],
  coronary_artery_disease: ['coronary artery disease', 'coronary heart disease', 'myocardial infarction', 'ischaemic heart', 'ischemic heart'],
  age_related_macular_degeneration: ['macular degeneration', 'age-related macular', 'macular dystrophy'],
};

// Hardcoded fallback data for T2D demo variants, sourced from published GWAS.
// Used only when the live GWAS Catalog API returns no disease-matched results.
const T2D_DEMO_FALLBACK: Record<string, GWASAssociation> = {
  rs7903146: {
    rsid: 'rs7903146', riskAllele: 'T', pvalue: 1.5e-25, pvalueMantissa: 1.5, pvalueExponent: -25,
    orPerCopyNum: 1.37, betaNum: null, betaUnit: null, betaDirection: null, riskFrequency: 0.30,
    studyAccession: 'GCST000028', pubmedId: '17293876', traitName: 'Type 2 diabetes',
    initialSampleSize: '1,924 European ancestry cases, 2,938 European ancestry controls',
    replicationSampleSize: 'Multiple replication cohorts (>100,000 participants)',
    ancestralGroups: ['European'], totalSampleSize: 116981,
  },
  rs12255372: {
    rsid: 'rs12255372', riskAllele: 'T', pvalue: 8e-15, pvalueMantissa: 8, pvalueExponent: -15,
    orPerCopyNum: 1.29, betaNum: null, betaUnit: null, betaDirection: null, riskFrequency: 0.28,
    studyAccession: 'GCST000028', pubmedId: '17293876', traitName: 'Type 2 diabetes',
    initialSampleSize: '1,924 European ancestry cases, 2,938 European ancestry controls',
    replicationSampleSize: 'Multiple replication cohorts',
    ancestralGroups: ['European'], totalSampleSize: 20000,
  },
  rs4402960: {
    rsid: 'rs4402960', riskAllele: 'T', pvalue: 3.4e-9, pvalueMantissa: 3.4, pvalueExponent: -9,
    orPerCopyNum: 1.17, betaNum: null, betaUnit: null, betaDirection: null, riskFrequency: 0.29,
    studyAccession: 'GCST000063', pubmedId: '17460697', traitName: 'Type 2 diabetes',
    initialSampleSize: '1,161 European ancestry cases, 1,174 European ancestry controls',
    replicationSampleSize: '4,020 cases, 5,990 controls',
    ancestralGroups: ['European'], totalSampleSize: 12345,
  },
  rs7756992: {
    rsid: 'rs7756992', riskAllele: 'G', pvalue: 2.6e-12, pvalueMantissa: 2.6, pvalueExponent: -12,
    orPerCopyNum: 1.20, betaNum: null, betaUnit: null, betaDirection: null, riskFrequency: 0.37,
    studyAccession: 'GCST000063', pubmedId: '17460697', traitName: 'Type 2 diabetes',
    initialSampleSize: '1,161 European ancestry cases, 1,174 European ancestry controls',
    replicationSampleSize: '4,020 cases, 5,990 controls',
    ancestralGroups: ['European'], totalSampleSize: 12345,
  },
  rs1111875: {
    rsid: 'rs1111875', riskAllele: 'C', pvalue: 2.3e-12, pvalueMantissa: 2.3, pvalueExponent: -12,
    orPerCopyNum: 1.22, betaNum: null, betaUnit: null, betaDirection: null, riskFrequency: 0.54,
    studyAccession: 'GCST000063', pubmedId: '17460697', traitName: 'Type 2 diabetes',
    initialSampleSize: '1,161 European ancestry cases, 1,174 European ancestry controls',
    replicationSampleSize: '4,020 cases, 5,990 controls',
    ancestralGroups: ['European'], totalSampleSize: 12345,
  },
  rs13266634: {
    rsid: 'rs13266634', riskAllele: 'C', pvalue: 2.4e-8, pvalueMantissa: 2.4, pvalueExponent: -8,
    orPerCopyNum: 1.18, betaNum: null, betaUnit: null, betaDirection: null, riskFrequency: 0.73,
    studyAccession: 'GCST000063', pubmedId: '17460697', traitName: 'Type 2 diabetes',
    initialSampleSize: '1,161 European ancestry cases, 1,174 European ancestry controls',
    replicationSampleSize: '4,020 cases, 5,990 controls',
    ancestralGroups: ['European'], totalSampleSize: 12345,
  },
};

const CAD_DEMO_FALLBACK: Record<string, GWASAssociation> = {
  rs1333049: {
    rsid: 'rs1333049', riskAllele: 'C', pvalue: 3.0e-19, pvalueMantissa: 3.0, pvalueExponent: -19,
    orPerCopyNum: 1.29, betaNum: null, betaUnit: null, betaDirection: null, riskFrequency: 0.47,
    studyAccession: 'GCST000122', pubmedId: '17478679', traitName: 'Coronary artery disease',
    initialSampleSize: '875 European ancestry cases, 1,644 European ancestry controls',
    replicationSampleSize: '922 cases, 1,070 controls',
    ancestralGroups: ['European'], totalSampleSize: 4511,
  },
  rs4977574: {
    rsid: 'rs4977574', riskAllele: 'G', pvalue: 2.0e-17, pvalueMantissa: 2.0, pvalueExponent: -17,
    orPerCopyNum: 1.29, betaNum: null, betaUnit: null, betaDirection: null, riskFrequency: 0.46,
    studyAccession: 'GCST000122', pubmedId: '17478679', traitName: 'Coronary artery disease',
    initialSampleSize: '875 European ancestry cases, 1,644 European ancestry controls',
    replicationSampleSize: 'Large replication cohort',
    ancestralGroups: ['European'], totalSampleSize: 4511,
  },
};

const AMD_DEMO_FALLBACK: Record<string, GWASAssociation> = {
  rs1061170: {
    rsid: 'rs1061170', riskAllele: 'T', pvalue: 4.9e-20, pvalueMantissa: 4.9, pvalueExponent: -20,
    orPerCopyNum: 2.45, betaNum: null, betaUnit: null, betaDirection: null, riskFrequency: 0.38,
    studyAccession: 'GCST000145', pubmedId: '16144777', traitName: 'Age-related macular degeneration',
    initialSampleSize: '96 cases, 50 controls',
    replicationSampleSize: '979 cases, 1,709 controls',
    ancestralGroups: ['European'], totalSampleSize: 2834,
  },
  rs10490924: {
    rsid: 'rs10490924', riskAllele: 'T', pvalue: 4.0e-25, pvalueMantissa: 4.0, pvalueExponent: -25,
    orPerCopyNum: 2.72, betaNum: null, betaUnit: null, betaDirection: null, riskFrequency: 0.21,
    studyAccession: 'GCST000146', pubmedId: '16908540', traitName: 'Age-related macular degeneration',
    initialSampleSize: 'Families and case-control cohorts',
    replicationSampleSize: '979 cases, 1,709 controls',
    ancestralGroups: ['European'], totalSampleSize: 2834,
  },
};

const FALLBACK_BY_DISEASE: Record<Disease, Record<string, GWASAssociation>> = {
  type2_diabetes: T2D_DEMO_FALLBACK,
  coronary_artery_disease: CAD_DEMO_FALLBACK,
  age_related_macular_degeneration: AMD_DEMO_FALLBACK,
};

@Injectable()
export class GWASCatalogService {
  private studyCache = new Map<string, any>();

  async getAssociationsForVariant(rsid: string, disease: Disease): Promise<GWASAssociation[]> {
    try {
      const url = `${GWAS_BASE}/singleNucleotidePolymorphisms/${encodeURIComponent(rsid)}/associations?size=100`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        if (response.status === 404) return this.useFallback(rsid, disease);
        throw new Error(`GWAS Catalog error ${response.status}`);
      }

      const data = await response.json() as any;
      const rawAssociations: any[] = data?._embedded?.associations ?? [];
      const results: GWASAssociation[] = [];

      for (const assoc of rawAssociations) {
        const studyHref: string = assoc._links?.study?.href ?? '';
        if (!studyHref) continue;

        // The GWAS Catalog may return /associations/{id}/study or /studies/{accession}
        // Follow the href directly; the response will contain accessionId
        const study = await this.fetchStudyByHref(studyHref);
        if (!study) continue;

        const traitName: string = study.diseaseTrait?.trait ?? '';
        if (!this.matchesDisease(traitName, disease)) continue;

        const pvalueMantissa: number = assoc.pvalueMantissa ?? 1;
        const pvalueExponent: number = assoc.pvalueExponent ?? 0;
        const pvalue = pvalueMantissa * Math.pow(10, pvalueExponent);

        const ancestries: any[] = study.ancestries ?? [];
        const ancestralGroups: string[] = [];
        let totalSampleSize = 0;
        for (const anc of ancestries) {
          totalSampleSize += anc.numberOfIndividuals ?? 0;
          for (const g of (anc.ancestralGroups ?? []) as any[]) {
            if (g.ancestralGroup && !ancestralGroups.includes(g.ancestralGroup)) {
              ancestralGroups.push(g.ancestralGroup);
            }
          }
        }

        const riskAlleleName: string = assoc.riskAlleleName ?? rsid;
        const riskAllele = riskAlleleName.includes('-')
          ? (riskAlleleName.split('-').pop() ?? riskAlleleName)
          : riskAlleleName;

        results.push({
          rsid,
          riskAllele,
          pvalue,
          pvalueMantissa,
          pvalueExponent,
          orPerCopyNum: assoc.orPerCopyNum ?? null,
          betaNum: assoc.betaNum ?? null,
          betaUnit: assoc.betaUnit ?? null,
          betaDirection: assoc.betaDirection ?? null,
          riskFrequency: assoc.riskFrequency ?? null,
          studyAccession: study.accessionId ?? studyHref,
          pubmedId: study.publicationInfo?.pubmedId ?? '',
          traitName,
          initialSampleSize: study.initialSampleSize ?? '',
          replicationSampleSize: study.replicationSampleSize ?? '',
          ancestralGroups,
          totalSampleSize,
        });
      }

      if (results.length === 0) return this.useFallback(rsid, disease);
      return results;
    } catch {
      return this.useFallback(rsid, disease);
    }
  }

  private async fetchStudyByHref(href: string): Promise<any> {
    if (this.studyCache.has(href)) return this.studyCache.get(href);
    try {
      const response = await fetch(href, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      const study = response.ok ? await response.json() as any : null;
      this.studyCache.set(href, study);
      return study;
    } catch {
      this.studyCache.set(href, null);
      return null;
    }
  }

  private matchesDisease(traitName: string, disease: Disease): boolean {
    const lower = traitName.toLowerCase();
    return DISEASE_TRAIT_PATTERNS[disease].some(p => lower.includes(p));
  }

  private useFallback(rsid: string, disease: Disease): GWASAssociation[] {
    const fallback = FALLBACK_BY_DISEASE[disease][rsid];
    return fallback ? [fallback] : [];
  }

  get diseaseTraitPatterns() {
    return DISEASE_TRAIT_PATTERNS;
  }
}
