import { Injectable } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import { ClauseExtractorService } from './clause-extractor.service.js';
import type {
  CompanyProfile,
  ContractStatus,
  RiskTolerance,
  TrackedContract,
} from './contract.types.js';

interface FixtureContract {
  id: string;
  title: string;
  counterparty: string;
  contractType: string;
  currency: string;
  annualValue: number;
  deadline: string | null;
  status: ContractStatus;
  reviewCount: number;
  imageUrl: string;
  contractText: string;
}

/** Fallback imagery for contracts ingested at runtime (real Unsplash hotlinks). */
const INGEST_IMAGE_POOL = [
  'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5OTQ3NTl8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMGNvbnRyYWN0JTIwc2lnbmluZyUyMGRvY3VtZW50c3xlbnwxfDB8fHwxNzg1NTA1ODY5fDA&ixlib=rb-4.1.0&q=80&w=1080',
  'https://images.unsplash.com/photo-1603796846097-bee99e4a601f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5OTQ3NTl8MHwxfHNlYXJjaHwyfHxidXNpbmVzcyUyMGNvbnRyYWN0JTIwc2lnbmluZyUyMGRvY3VtZW50c3xlbnwxfDB8fHwxNzg1NTA1ODY5fDA&ixlib=rb-4.1.0&q=80&w=1080',
  'https://images.unsplash.com/photo-1568992688065-536aad8a12f6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5OTQ3NTl8MHwxfHNlYXJjaHwyfHxtYXJrZXRpbmclMjBhZ2VuY3klMjBjcmVhdGl2ZSUyMG1lZXRpbmd8ZW58MXwwfHx8MTc4NTUwNTg4MXww&ixlib=rb-4.1.0&q=80&w=1080',
  'https://images.unsplash.com/photo-1702047149248-a6049168d2a8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w5OTQ3NTl8MHwxfHNlYXJjaHwzfHxzb2Z0d2FyZSUyMGVuZ2luZWVyJTIwdGVhbSUyMHdvcmtpbmclMjBsYXB0b3BzJTIwc3RhcnR1cHxlbnwxfDB8fHwxNzg1NTA1ODc5fDA&ixlib=rb-4.1.0&q=80&w=1080',
];

/**
 * In-memory portfolio + session company context.
 *
 * Singleton for the life of the server process, seeded from
 * `fixtures/contracts.json` on first access.
 */
@Injectable({ deps: [ClauseExtractorService] })
export class ContractStoreService {
  private contracts = new Map<string, TrackedContract>();
  private profile: CompanyProfile | null = null;
  private seeded = false;
  private sequence = 0;

  constructor(private extractor: ClauseExtractorService) {}

  // ---------------------------------------------------------------- profile

  setProfile(input: {
    industry: string;
    companySize: number;
    jurisdiction: string;
    riskTolerance: RiskTolerance;
  }): CompanyProfile {
    this.profile = {
      industry: input.industry,
      companySize: input.companySize,
      jurisdiction: input.jurisdiction,
      riskTolerance: input.riskTolerance,
      setAt: new Date().toISOString(),
    };
    return this.profile;
  }

  getProfile(): CompanyProfile | null {
    return this.profile;
  }

  /** Profile with defaults applied, for tools that must work before profile is set. */
  getEffectiveProfile(): CompanyProfile & { isDefault: boolean } {
    if (this.profile) return { ...this.profile, isDefault: false };
    return {
      industry: 'unspecified',
      companySize: 0,
      jurisdiction: 'unspecified',
      riskTolerance: 'medium',
      setAt: new Date(0).toISOString(),
      isDefault: true,
    };
  }

  // -------------------------------------------------------------- portfolio

  /** Seed the portfolio from fixtures exactly once. */
  ensureSeeded(): void {
    if (this.seeded) return;
    this.seeded = true;

    const fixtures = this.loadFixtures();
    for (const row of fixtures) {
      const contract: TrackedContract = {
        id: row.id,
        title: row.title,
        counterparty: row.counterparty,
        contractType: row.contractType,
        currency: row.currency,
        annualValue: row.annualValue,
        deadline: row.deadline ?? this.extractor.extractDeadline(row.contractText),
        status: row.status ?? 'tracked',
        reviewCount: row.reviewCount ?? 0,
        imageUrl: row.imageUrl,
        contractText: row.contractText,
        clauses: this.extractor.extractClauses(row.contractText),
        obligations: this.extractor.extractObligations(row.contractText),
        ingestedAt: new Date().toISOString(),
        lastCycleAt: null,
        lastRiskScore: null,
        lastClassification: null,
        recommendedAction: null,
        recommendedActionDetail: null,
      };
      this.contracts.set(contract.id, contract);
    }
  }

  list(): TrackedContract[] {
    this.ensureSeeded();
    return Array.from(this.contracts.values());
  }

  get(id: string): TrackedContract | undefined {
    this.ensureSeeded();
    return this.contracts.get(id);
  }

  /** Parse raw contract text and add it to the tracked portfolio. */
  ingest(contractText: string, overrides?: { title?: string; imageUrl?: string }): TrackedContract {
    this.ensureSeeded();

    const text = String(contractText || '').trim();
    const counterparty = this.extractor.extractCounterparty(text);
    const contractType = this.extractor.extractContractType(text);
    const id = this.nextId(contractType, counterparty);

    const contract: TrackedContract = {
      id,
      title: overrides?.title || `${contractType} — ${counterparty}`,
      counterparty,
      contractType,
      currency: this.guessCurrency(text),
      annualValue: 0,
      deadline: this.extractor.extractDeadline(text),
      status: 'tracked',
      reviewCount: 0,
      imageUrl: overrides?.imageUrl || this.pickImage(),
      contractText: text,
      clauses: this.extractor.extractClauses(text),
      obligations: this.extractor.extractObligations(text),
      ingestedAt: new Date().toISOString(),
      lastCycleAt: null,
      lastRiskScore: null,
      lastClassification: null,
      recommendedAction: null,
      recommendedActionDetail: null,
    };

    this.contracts.set(contract.id, contract);
    return contract;
  }

  /** Apply the act phase of a sentinel cycle. */
  applyCycleResult(
    id: string,
    update: {
      status: ContractStatus;
      riskScore: number;
      classification: 'safe' | 'danger';
      recommendedAction: TrackedContract['recommendedAction'];
      recommendedActionDetail: string;
    },
  ): TrackedContract | undefined {
    const contract = this.get(id);
    if (!contract) return undefined;

    contract.status = update.status;
    contract.lastRiskScore = update.riskScore;
    contract.lastClassification = update.classification;
    contract.recommendedAction = update.recommendedAction;
    contract.recommendedActionDetail = update.recommendedActionDetail;
    contract.lastCycleAt = new Date().toISOString();
    contract.reviewCount += 1;

    this.contracts.set(contract.id, contract);
    return contract;
  }

  // ---------------------------------------------------------------- helpers

  private nextId(contractType: string, counterparty: string): string {
    this.sequence += 1;
    const slug = `${counterparty} ${contractType}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 34);
    let candidate = `ctr_${slug || 'contract'}`;
    if (this.contracts.has(candidate)) {
      candidate = `${candidate}_${this.sequence}`;
    }
    return candidate;
  }

  private pickImage(): string {
    const index = this.contracts.size % INGEST_IMAGE_POOL.length;
    return INGEST_IMAGE_POOL[index];
  }

  private guessCurrency(text: string): string {
    const upper = text.toUpperCase();
    if (upper.includes('EUR') || text.includes('€')) return 'EUR';
    if (upper.includes('USD') || text.includes('$')) return 'USD';
    if (upper.includes('GBP') || text.includes('£')) return 'GBP';
    return 'EUR';
  }

  private loadFixtures(): FixtureContract[] {
    const candidates = [
      path.join(process.cwd(), 'fixtures', 'contracts.json'),
      path.join(process.cwd(), '..', 'fixtures', 'contracts.json'),
    ];

    for (const file of candidates) {
      try {
        if (!fs.existsSync(file)) continue;
        const raw = fs.readFileSync(file, 'utf-8');
        const parsed = JSON.parse(raw) as { contracts?: FixtureContract[] };
        if (Array.isArray(parsed.contracts)) return parsed.contracts;
      } catch {
        // Fall through to the next candidate; seeding must never crash startup.
      }
    }

    return [];
  }
}
