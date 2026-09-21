/**
 * ResearchService — Research module logic layer.
 * Interacts with PubMedService and ClinicalTrialsService.
 */
import { Injectable } from '@nitrostack/core';
import { PubMedService, PublicationTypeFilter } from '../../integrations/pubmed.service.js';
import { ClinicalTrialsService, TrialStatusFilter, TrialPhaseFilter } from '../../integrations/clinicaltrials.service.js';

@Injectable({ deps: [PubMedService, ClinicalTrialsService] })
export class ResearchService {
  constructor(
    private readonly pubmed: PubMedService,
    private readonly trials: ClinicalTrialsService,
  ) {}

  /** Search PubMed articles. */
  async searchPubmed(
    query: string,
    maxResults: number = 5,
    publicationType: PublicationTypeFilter = 'any',
    yearsBack?: number,
  ) {
    const { count, pmids } = await this.pubmed.search(query, maxResults, publicationType, yearsBack);
    const summaries = await this.pubmed.getSummaries(pmids);
    const articles = summaries.map((article) => ({
      pmid: article.pmid,
      title: article.title,
      journal: article.journal,
      pub_date: article.pubDate,
      authors: article.authors,
      publication_types: article.publicationTypes,
      doi: article.doi,
    }));
    return {
      total_count: count,
      articles,
    };
  }

  /** Get single PubMed article full detail including abstract. */
  async getArticle(pmid: string) {
    const summaries = await this.pubmed.getSummaries([pmid]);
    const summary = summaries[0];
    if (!summary) {
      throw new Error(`Article with PMID ${pmid} not found`);
    }

    const abstractsMap = await this.pubmed.getAbstractsXml([pmid]);
    const details = abstractsMap.get(pmid);

    return {
      pmid: summary.pmid,
      title: summary.title,
      abstract: details?.abstract ?? null,
      authors: summary.authors,
      journal: summary.journal,
      pub_date: summary.pubDate,
      doi: summary.doi,
      mesh_terms: details?.meshTerms ?? [],
      pubmed_url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    };
  }

  /** Search ClinicalTrials.gov studies. */
  async searchTrials(
    condition: string,
    status: TrialStatusFilter = 'any',
    phase: TrialPhaseFilter = 'any',
    maxResults: number = 10,
  ) {
    return this.trials.searchTrials(condition, status, phase, maxResults);
  }

  /** Get single trial details by NCT ID. */
  async getTrialDetails(nctId: string) {
    return this.trials.getTrialDetails(nctId);
  }

  /** Summarize evidence: search PubMed + batch fetch abstracts for top N articles. */
  async summarizeEvidence(topic: string, maxResults: number = 5) {
    const { pmids } = await this.pubmed.search(topic, maxResults, 'any');
    if (pmids.length === 0) {
      return {
        topic,
        synthesized_from: 0,
        articles: [],
        synthesis_note: 'No relevant articles found for this topic.',
      };
    }

    const summaries = await this.pubmed.getSummaries(pmids);
    const abstractsMap = await this.pubmed.getAbstractsXml(pmids);

    const articles = summaries.map((s) => ({
      pmid: s.pmid,
      title: s.title,
      pub_date: s.pubDate,
      publication_types: s.publicationTypes,
      abstract: abstractsMap.get(s.pmid)?.abstract ?? null,
    }));

    return {
      topic,
      synthesized_from: articles.length,
      articles,
      synthesis_note:
        'Evidence digest prepared from PubMed metadata and abstracts. Review full articles for clinical decision support.',
    };
  }
}
