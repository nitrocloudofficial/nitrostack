# Praneeth — Live Data & Financial Math Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Praneeth's three owned pieces of the FinBridge AI MCP server — the live NAV client, `project_investment_growth`, and `calculate_financial_health` — so both tools are registrable, tested at their boundaries, and backed by real (not invented) fund data with a fallback that survives a dead API at 3am.

**Architecture:** A plain HTTPS client (`src/clients/mfapi.ts`) talks to mfapi.in outside the MCP protocol. A `NavCacheService` sits between it and the `project_investment_growth` tool, doing three-tier fallback (live fetch → last good in-memory cache → static assumption) so the tool never throws just because mfapi.in is down. `calculate_financial_health` has no external dependency at all — it's pure scoring logic over the caller's inputs. Both tools are NitroStack `@Tool`-decorated classes grouped into their own `@Module`s, registered into `AppModule` by Jeevan (not by this plan — that file isn't ours to touch).

**Tech Stack:** TypeScript (ES2022 modules, strict), `@nitrostack/core` decorators (`Injectable`, `Module`, `ToolDecorator as Tool`, `ExecutionContext`, `z`), native `fetch`, Node's built-in test runner (`node --test`) via `tsx` (new devDependency — nothing else changes in the toolchain).

## Global Constraints

- Every tool response includes `risk_note` (string) and `educational_only: true` (literal) — schema-level, not footer text.
- `project_investment_growth` must **always** return a low/high range with `assumptions[]` and `navSource` — never a single confident number.
- `calculate_financial_health` returns `{ score, subScores: { savingsRate, emergencyFund, debtRatio }, suggestions[] }` plus the two guardrail fields above.
- `fundCategory` enum is `equity | debt | hybrid | index` — this is the team's suggested default per the shared brief; confirm it out loud before anyone freezes `src/shared/contracts.ts`, since changing it after freeze needs all four people agreeing.
- Files this plan creates: everything under `src/clients/mfapi.ts`, `src/modules/growth/`, `src/modules/financial-health/`. Nothing here touches `src/app.module.ts`, `src/index.ts`, `data/*.json`, or `src/shared/contracts.ts` — those are other people's files. Registration into `AppModule` is a handoff (Task 7), not something this plan does directly.
- No widgets, no dashboard, no UI for these two tools — not in scope per the brief ("scope does not grow"). Resist the urge to add one even though the calculator template ships a working widget example.
- Never edit `data/schemes.json` or anything under `data/` — that's Jayaram's, and it's not even relevant to this plan's scope, just noting the boundary since it's adjacent territory (financial data).

## Preconditions (verify before starting)

- The team's shared first-30-minutes step (de-template, stub tools, `src/shared/contracts.ts` drafted, `app.module.ts` wired against stubs, committed to `main`) has happened. As of writing, this repo is still the untouched `calculator` scaffold (single commit, no branches) — if that's still true when you start, this plan's Task 1 can proceed independently (mfapi.ts has zero dependency on contracts.ts or app.module.ts), but don't merge anything to `main` until the shared step lands.
- A branch `praneeth/live` exists, cut from `main` after the shared step.
- Node ≥ 20 (repo's `@types/node` targets 22; native `fetch` requires ≥ 18, decorator metadata needs `experimentalDecorators`/`emitDecoratorMetadata`, both already set in `tsconfig.json`).

## Verified real fund data (use these — don't re-derive or invent codes)

Looked these up live against `https://api.mfapi.in` while writing this plan (confirmed responding with current NAVs as of 2026-07-24/26):

| category | schemeCode | schemeName | category label on mfapi.in |
|---|---|---|---|
| `equity` | `118632` | Nippon India Large Cap Fund - Direct Plan Growth Plan - Growth Option | Equity Scheme - Large Cap Fund |
| `index` | `120716` | UTI Nifty 50 Index Fund - Growth Option - Direct | Other Scheme - Index Funds |
| `hybrid` | `118968` | HDFC Balanced Advantage Fund - Growth Plan - Direct Plan | Hybrid Scheme - Dynamic Asset Allocation or Balanced Advantage |
| `debt` | `120197` | ICICI Prudential Liquid Fund - Direct Plan - Growth | Debt Scheme - Liquid Fund |

Static fallback bands (only used when both live fetch and cache are unavailable — long-term published category averages, cite a source like AMFI/Value Research in the README section in Task 10 rather than presenting these as precise):

| category | low | high |
|---|---|---|
| `equity` | 10% | 14% |
| `index` | 10% | 13% |
| `hybrid` | 8% | 11% |
| `debt` | 5% | 7% |

## File Structure

```
src/clients/mfapi.ts                                  # HTTP client for mfapi.in — no MCP decorators
src/modules/growth/growth.constants.ts                # scheme codes + static fallback bands (table above)
src/modules/growth/growth.service.ts                  # NavCacheService: live→cached→static fallback, computeCagr()
src/modules/growth/growth.service.test.ts
src/modules/growth/growth.tools.ts                    # project_investment_growth @Tool
src/modules/growth/growth.tools.test.ts
src/modules/growth/growth.module.ts                   # @Module wiring providers + controllers
src/modules/financial-health/financial-health.logic.ts       # pure scoring functions
src/modules/financial-health/financial-health.logic.test.ts
src/modules/financial-health/financial-health.tools.ts       # calculate_financial_health @Tool
src/modules/financial-health/financial-health.module.ts
scripts/verify-mfapi.ts                               # manual live-proof script (Task 1's +4:00 evidence)
docs/handoff/praneeth-readme-sections.md              # content handed to Jeevan by 06:00
package.json                                          # + tsx devDependency, + test script (modify)
```

---

### Task 1: `mfapi.ts` — live NAV client (FIRST TASK, before anything else)

This is the piece that can break for reasons outside the repo, so it's built and proven against the real API before any tool logic touches it.

**Files:**
- Create: `src/clients/mfapi.ts`
- Create: `scripts/verify-mfapi.ts`

**Interfaces:**
- Produces: `MfApiClient` with `getSchemeHistory(schemeCode: string): Promise<MfApiSchemeResponse>` and `getLatestNav(schemeCode: string): Promise<{ date: string; nav: number; schemeName: string }>`. Also exports `MfApiNavPoint`, `MfApiSchemeMeta`, `MfApiSchemeResponse`, `MfApiError`. Task 3 imports all of these.

- [ ] **Step 1: Write the client**

```typescript
// src/clients/mfapi.ts
import { Injectable } from '@nitrostack/core';

export interface MfApiNavPoint {
  date: string; // DD-MM-YYYY, as returned by mfapi.in
  nav: string;  // mfapi.in returns NAV as a string — parse before use
}

export interface MfApiSchemeMeta {
  fund_house: string;
  scheme_type: string;
  scheme_category: string;
  scheme_code: number;
  scheme_name: string;
}

export interface MfApiSchemeResponse {
  meta: MfApiSchemeMeta;
  data: MfApiNavPoint[];
}

export class MfApiError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'MfApiError';
  }
}

const MFAPI_BASE_URL = 'https://api.mfapi.in/mf';
const REQUEST_TIMEOUT_MS = 5000;

@Injectable()
export class MfApiClient {
  async getSchemeHistory(schemeCode: string): Promise<MfApiSchemeResponse> {
    return this.fetchJson(`${MFAPI_BASE_URL}/${schemeCode}`);
  }

  async getLatestNav(schemeCode: string): Promise<{ date: string; nav: number; schemeName: string }> {
    const response = await this.fetchJson(`${MFAPI_BASE_URL}/${schemeCode}/latest`);
    const point = response.data[0];
    if (!point) {
      throw new MfApiError(`mfapi.in returned no NAV data for scheme ${schemeCode}`);
    }
    return { date: point.date, nav: parseFloat(point.nav), schemeName: response.meta.scheme_name };
  }

  private async fetchJson(url: string): Promise<MfApiSchemeResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        throw new MfApiError(`mfapi.in responded with HTTP ${res.status} for ${url}`);
      }
      const body = (await res.json()) as MfApiSchemeResponse;
      if (!Array.isArray(body.data) || body.data.length === 0) {
        throw new MfApiError(`mfapi.in returned no data array for ${url}`);
      }
      return body;
    } catch (err) {
      if (err instanceof MfApiError) throw err;
      throw new MfApiError(`Failed to reach mfapi.in at ${url}`, err);
    } finally {
      clearTimeout(timeout);
    }
  }
}
```

- [ ] **Step 2: Write the live-proof script**

```typescript
// scripts/verify-mfapi.ts
import { MfApiClient } from '../src/clients/mfapi.js';

const SCHEMES = {
  equity: '118632',
  index: '120716',
  hybrid: '118968',
  debt: '120197'
};

async function main() {
  const client = new MfApiClient();
  for (const [category, schemeCode] of Object.entries(SCHEMES)) {
    const latest = await client.getLatestNav(schemeCode);
    console.log(`${category.padEnd(8)} ${latest.schemeName} — NAV ${latest.nav} as of ${latest.date}`);
  }
}

main().catch((err) => {
  console.error('mfapi.in verification failed:', err);
  process.exit(1);
});
```

- [ ] **Step 3: Run it against the real API**

Run: `npx tsx scripts/verify-mfapi.ts`
Expected: four lines printed, one per category, each with a real scheme name, a numeric NAV, and today's (or the last trading day's) date. This output is the "+4:00 proven end to end" evidence — paste it into the team channel or save it alongside the README handoff.

- [ ] **Step 4: Commit**

```bash
git add src/clients/mfapi.ts scripts/verify-mfapi.ts
git commit -m "feat: add mfapi.in NAV client with live verification script"
```

---

### Task 2: `growth.constants.ts` — representative funds + static fallback

**Files:**
- Create: `src/modules/growth/growth.constants.ts`

**Interfaces:**
- Produces: `FundCategory` type, `FUND_CATEGORY_SCHEME_CODES`, `STATIC_FALLBACK_BANDS`. Task 3 imports all three.

- [ ] **Step 1: Write the constants file**

```typescript
// src/modules/growth/growth.constants.ts
export type FundCategory = 'equity' | 'debt' | 'hybrid' | 'index';

export const FUND_CATEGORY_SCHEME_CODES: Record<FundCategory, { schemeCode: string; schemeName: string }> = {
  equity: { schemeCode: '118632', schemeName: 'Nippon India Large Cap Fund - Direct Plan - Growth' },
  index: { schemeCode: '120716', schemeName: 'UTI Nifty 50 Index Fund - Direct Plan - Growth' },
  hybrid: { schemeCode: '118968', schemeName: 'HDFC Balanced Advantage Fund - Direct Plan - Growth' },
  debt: { schemeCode: '120197', schemeName: 'ICICI Prudential Liquid Fund - Direct Plan - Growth' }
};

// Used only when both a live fetch and the in-memory cache are unavailable.
// Long-term published category averages for Indian mutual funds — cite the
// specific source (e.g. AMFI, Value Research category averages) in the
// README handoff (Task 10) rather than presenting these as precise.
export const STATIC_FALLBACK_BANDS: Record<FundCategory, { low: number; high: number }> = {
  equity: { low: 0.10, high: 0.14 },
  index: { low: 0.1, high: 0.13 },
  hybrid: { low: 0.08, high: 0.11 },
  debt: { low: 0.05, high: 0.07 }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/growth/growth.constants.ts
git commit -m "feat: add representative fund codes and static fallback bands"
```

---

### Task 3: `growth.service.ts` — three-tier NAV cache (live → cached → static)

**Files:**
- Create: `src/modules/growth/growth.service.ts`
- Test: `src/modules/growth/growth.service.test.ts`

**Interfaces:**
- Consumes: `MfApiClient` (Task 1), `FundCategory`/`FUND_CATEGORY_SCHEME_CODES`/`STATIC_FALLBACK_BANDS` (Task 2).
- Produces: `computeCagr(history: MfApiNavPoint[], yearsBack: number): number | null` (pure, exported for testing) and `NavCacheService` with `getCagrBand(category: FundCategory): Promise<CagrBand>` where `CagrBand = { low: number; high: number; source: 'live' | 'cached' | 'static'; asOf: string; schemeName: string }`. Task 4 imports `NavCacheService` and the `CagrBand` type.

- [ ] **Step 1: Write the failing test for `computeCagr`**

```typescript
// src/modules/growth/growth.service.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCagr } from './growth.service.js';

function fixtureHistory() {
  // Most-recent-first, matching mfapi.in's actual ordering.
  return [
    { date: '24-07-2026', nav: '200.0' },
    { date: '24-07-2023', nav: '150.0' }, // ~3 years back
    { date: '24-07-2021', nav: '110.0' }  // ~5 years back
  ];
}

test('computeCagr computes the correct 3-year trailing CAGR', () => {
  const cagr = computeCagr(fixtureHistory(), 3);
  assert.ok(cagr !== null);
  const expected = Math.pow(200 / 150, 1 / 3) - 1;
  assert.ok(Math.abs((cagr as number) - expected) < 0.0005);
});

test('computeCagr returns null when no point exists near the requested horizon', () => {
  const shortHistory = [
    { date: '24-07-2026', nav: '200.0' },
    { date: '01-07-2026', nav: '199.0' }
  ];
  assert.equal(computeCagr(shortHistory, 5), null);
});
```

- [ ] **Step 2: Run it, confirm it fails because the module doesn't exist yet**

Run: `node --import tsx --test src/modules/growth/growth.service.test.ts`
Expected: FAIL — `Cannot find module './growth.service.js'`.

- [ ] **Step 3: Implement `computeCagr` and `NavCacheService`**

```typescript
// src/modules/growth/growth.service.ts
import { Injectable } from '@nitrostack/core';
import { MfApiClient, MfApiNavPoint } from '../../clients/mfapi.js';
import { FundCategory, FUND_CATEGORY_SCHEME_CODES, STATIC_FALLBACK_BANDS } from './growth.constants.js';

export interface CagrBand {
  low: number;
  high: number;
  source: 'live' | 'cached' | 'static';
  asOf: string;
  schemeName: string;
}

interface CacheEntry {
  band: { low: number; high: number };
  asOf: string;
  schemeName: string;
}

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

function parseNavDate(ddmmyyyy: string): Date {
  const [day, month, year] = ddmmyyyy.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Finds the NAV point closest to `yearsBack` before the most recent entry and
 * computes CAGR using the *actual* elapsed time to that point, not the
 * nominal horizon — a fund with less history than requested returns null
 * rather than silently extrapolating.
 */
export function computeCagr(history: MfApiNavPoint[], yearsBack: number): number | null {
  if (history.length === 0) return null;

  const latest = history[0];
  const latestDate = parseNavDate(latest.date);
  const latestNav = parseFloat(latest.nav);
  const targetTime = latestDate.getTime() - yearsBack * MS_PER_YEAR;

  let closest: MfApiNavPoint | null = null;
  let closestDiff = Infinity;

  for (const point of history) {
    const diff = Math.abs(parseNavDate(point.date).getTime() - targetTime);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = point;
    }
  }

  if (!closest) return null;

  const pastDate = parseNavDate(closest.date);
  const actualYears = (latestDate.getTime() - pastDate.getTime()) / MS_PER_YEAR;
  if (actualYears < yearsBack * 0.9) return null; // not enough real history for this horizon

  const pastNav = parseFloat(closest.nav);
  if (pastNav <= 0) return null;

  return Math.pow(latestNav / pastNav, 1 / actualYears) - 1;
}

@Injectable()
export class NavCacheService {
  private cache = new Map<FundCategory, CacheEntry>();

  constructor(private readonly mfApiClient: MfApiClient) {}

  async getCagrBand(category: FundCategory): Promise<CagrBand> {
    const { schemeCode, schemeName } = FUND_CATEGORY_SCHEME_CODES[category];

    try {
      const { data } = await this.mfApiClient.getSchemeHistory(schemeCode);
      const rates = [computeCagr(data, 3), computeCagr(data, 5)].filter(
        (r): r is number => r !== null
      );

      if (rates.length === 0) {
        throw new Error(`Not enough NAV history for ${schemeName} to compute a trailing CAGR`);
      }

      const band = { low: Math.min(...rates), high: Math.max(...rates) };
      const asOf = data[0].date;
      this.cache.set(category, { band, asOf, schemeName });

      return { ...band, source: 'live', asOf, schemeName };
    } catch {
      const cached = this.cache.get(category);
      if (cached) {
        return { ...cached.band, source: 'cached', asOf: cached.asOf, schemeName: cached.schemeName };
      }

      const fallback = STATIC_FALLBACK_BANDS[category];
      return { ...fallback, source: 'static', asOf: 'N/A', schemeName: `${schemeName} (static assumption)` };
    }
  }
}
```

- [ ] **Step 4: Run the CAGR tests again, confirm they pass**

Run: `node --import tsx --test src/modules/growth/growth.service.test.ts`
Expected: both tests PASS.

- [ ] **Step 5: Add the fallback-tier tests (the "dead API at 3am" behavior)**

Append to `src/modules/growth/growth.service.test.ts`:

```typescript
import { NavCacheService } from './growth.service.js';

test('falls back to the cached band when a later live fetch fails', async () => {
  let callCount = 0;
  const fakeClient = {
    async getSchemeHistory() {
      callCount++;
      if (callCount === 1) {
        return {
          meta: { scheme_name: 'Test Fund', fund_house: '', scheme_type: '', scheme_category: '', scheme_code: 1 },
          data: [
            { date: '24-07-2026', nav: '200.0' },
            { date: '24-07-2023', nav: '150.0' },
            { date: '24-07-2021', nav: '110.0' }
          ]
        };
      }
      throw new Error('mfapi.in unreachable');
    }
  };

  const service = new NavCacheService(fakeClient as any);
  const first = await service.getCagrBand('index');
  assert.equal(first.source, 'live');

  const second = await service.getCagrBand('index');
  assert.equal(second.source, 'cached');
  assert.equal(second.low, first.low);
});

test('falls back to the static band when there is no live data and no cache', async () => {
  const fakeClient = {
    async getSchemeHistory() {
      throw new Error('down');
    }
  };

  const service = new NavCacheService(fakeClient as any);
  const result = await service.getCagrBand('debt');
  assert.equal(result.source, 'static');
  assert.ok(result.low > 0 && result.high > result.low);
});
```

- [ ] **Step 6: Run the full file, confirm all four tests pass**

Run: `node --import tsx --test src/modules/growth/growth.service.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/modules/growth/growth.service.ts src/modules/growth/growth.service.test.ts
git commit -m "feat: add NavCacheService with live/cached/static fallback"
```

---

### Task 4: `growth.tools.ts` — the `project_investment_growth` tool

**Files:**
- Create: `src/modules/growth/growth.tools.ts`
- Test: `src/modules/growth/growth.tools.test.ts`

**Interfaces:**
- Consumes: `NavCacheService`, `CagrBand` (Task 3); `FundCategory` (Task 2).
- Produces: `GrowthTools` class (the `@Tool`), plus exported `ProjectInvestmentGrowthInputSchema` (zod) and `sipFutureValue(monthlyAmount: number, annualRate: number, years: number): number` for direct testing. Task 6 (module wiring) imports `GrowthTools`.

- [ ] **Step 1: Write the failing test for the SIP math and input validation**

```typescript
// src/modules/growth/growth.tools.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProjectInvestmentGrowthInputSchema, sipFutureValue } from './growth.tools.js';

test('sipFutureValue matches a hand-computed example', () => {
  // 2000/month at 12% annual for 1 year -> monthly rate 1%, 12 months, annuity due
  const fv = sipFutureValue(2000, 0.12, 1);
  const expected = 2000 * ((Math.pow(1.01, 12) - 1) / 0.01) * 1.01;
  assert.ok(Math.abs(fv - expected) < 0.01);
});

test('sipFutureValue handles a zero rate without dividing by zero', () => {
  const fv = sipFutureValue(1000, 0, 2);
  assert.equal(fv, 1000 * 24);
});

test('rejects a non-positive monthlyAmount', () => {
  const result = ProjectInvestmentGrowthInputSchema.safeParse({ monthlyAmount: 0, years: 5, fundCategory: 'equity' });
  assert.equal(result.success, false);
});

test('rejects an unknown fundCategory', () => {
  const result = ProjectInvestmentGrowthInputSchema.safeParse({ monthlyAmount: 1000, years: 5, fundCategory: 'crypto' });
  assert.equal(result.success, false);
});
```

- [ ] **Step 2: Run it, confirm it fails because the module doesn't exist yet**

Run: `node --import tsx --test src/modules/growth/growth.tools.test.ts`
Expected: FAIL — `Cannot find module './growth.tools.js'`.

- [ ] **Step 3: Implement the tool**

```typescript
// src/modules/growth/growth.tools.ts
import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { NavCacheService } from './growth.service.js';
import { FundCategory } from './growth.constants.js';

const YEARS_MAX = 40;

export const ProjectInvestmentGrowthInputSchema = z.object({
  monthlyAmount: z.number().positive().describe('Monthly investment amount in INR'),
  years: z.number().int().positive().max(YEARS_MAX).describe('Investment horizon in years'),
  fundCategory: z.enum(['equity', 'debt', 'hybrid', 'index']).describe('Broad fund category to project against')
});

export function sipFutureValue(monthlyAmount: number, annualRate: number, years: number): number {
  const months = years * 12;
  const monthlyRate = annualRate / 12;
  if (Math.abs(monthlyRate) < 1e-9) return monthlyAmount * months;
  return monthlyAmount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
}

export class GrowthTools {
  constructor(private readonly navCacheService: NavCacheService) {}

  @Tool({
    name: 'project_investment_growth',
    description:
      'Projects a low/high range for a monthly SIP investment using live mutual fund NAV data. Never returns a single confident number.',
    inputSchema: ProjectInvestmentGrowthInputSchema,
    examples: {
      request: { monthlyAmount: 2000, years: 15, fundCategory: 'index' },
      response: {
        lowEstimate: 693000,
        highEstimate: 812000,
        assumptions: [
          'Return band of 10.2%-12.8% p.a. derived from trailing 3-year and 5-year CAGR of UTI Nifty 50 Index Fund.',
          'Assumes a consistent monthly contribution with no withdrawals or missed months.',
          'Ignores taxes, expense ratios, and exit loads.',
          'Past performance does not guarantee future returns — this is a range, not a promise.'
        ],
        navSource: 'Live NAV — UTI Nifty 50 Index Fund (mfapi.in), as of 24-07-2026',
        risk_note: 'This is an educational projection, not investment advice. Mutual fund investments are subject to market risk.',
        educational_only: true
      }
    }
  })
  async projectInvestmentGrowth(
    input: { monthlyAmount: number; years: number; fundCategory: FundCategory },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Projecting investment growth', input);

    const { low, high, source, asOf, schemeName } = await this.navCacheService.getCagrBand(input.fundCategory);

    const estimateAtLowRate = sipFutureValue(input.monthlyAmount, low, input.years);
    const estimateAtHighRate = sipFutureValue(input.monthlyAmount, high, input.years);

    const navSourceLabel = {
      live: `Live NAV — ${schemeName} (mfapi.in), as of ${asOf}`,
      cached: `Cached NAV — ${schemeName} (mfapi.in unreachable), last fetched ${asOf}`,
      static: `Static historical assumption — ${schemeName}, mfapi.in unreachable and no cache available`
    }[source];

    return {
      lowEstimate: Math.round(Math.min(estimateAtLowRate, estimateAtHighRate)),
      highEstimate: Math.round(Math.max(estimateAtLowRate, estimateAtHighRate)),
      assumptions: [
        `Return band of ${(low * 100).toFixed(1)}%-${(high * 100).toFixed(1)}% p.a. derived from trailing 3-year and 5-year CAGR of ${schemeName}.`,
        'Assumes a consistent monthly contribution with no withdrawals or missed months.',
        'Ignores taxes, expense ratios, and exit loads.',
        'Past performance does not guarantee future returns — this is a range, not a promise.'
      ],
      navSource: navSourceLabel,
      risk_note:
        'This is an educational projection, not investment advice. Mutual fund investments are subject to market risk.',
      educational_only: true as const
    };
  }
}
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `node --import tsx --test src/modules/growth/growth.tools.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 5: Add a fixture-backed integration test using a fake `NavCacheService`**

Append to `src/modules/growth/growth.tools.test.ts`:

```typescript
import { GrowthTools } from './growth.tools.js';

test('projectInvestmentGrowth always returns low <= high and non-empty assumptions', async () => {
  const fakeNavCacheService = {
    async getCagrBand() {
      return { low: 0.08, high: 0.12, source: 'live' as const, asOf: '24-07-2026', schemeName: 'Test Fund' };
    }
  };

  const tools = new GrowthTools(fakeNavCacheService as any);
  const result = await tools.projectInvestmentGrowth(
    { monthlyAmount: 5000, years: 10, fundCategory: 'equity' },
    { logger: { info: () => {} } } as any
  );

  assert.ok(result.lowEstimate <= result.highEstimate);
  assert.ok(result.assumptions.length > 0);
  assert.equal(result.educational_only, true);
  assert.match(result.navSource, /Test Fund/);
});
```

- [ ] **Step 6: Run the full file, confirm all tests pass**

Run: `node --import tsx --test src/modules/growth/growth.tools.test.ts`
Expected: 5 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/modules/growth/growth.tools.ts src/modules/growth/growth.tools.test.ts
git commit -m "feat: add project_investment_growth tool"
```

---

### Task 5: `growth.module.ts` — wire the growth module

**Files:**
- Create: `src/modules/growth/growth.module.ts`

**Interfaces:**
- Consumes: `MfApiClient` (Task 1), `NavCacheService` (Task 3), `GrowthTools` (Task 4).
- Produces: `GrowthModule`, handed to Jeevan in Task 7 for registration into `AppModule`.

- [ ] **Step 1: Write the module**

```typescript
// src/modules/growth/growth.module.ts
import { Module } from '@nitrostack/core';
import { MfApiClient } from '../../clients/mfapi.js';
import { NavCacheService } from './growth.service.js';
import { GrowthTools } from './growth.tools.js';

@Module({
  name: 'growth',
  description: 'Live NAV-based investment growth projections',
  providers: [MfApiClient, NavCacheService],
  controllers: [GrowthTools]
})
export class GrowthModule {}
```

- [ ] **Step 2: Verify the module compiles standalone**

Run: `npx tsc --noEmit`
Expected: no new errors introduced by this file (pre-existing template errors, if any, are not this task's concern).

- [ ] **Step 3: Commit**

```bash
git add src/modules/growth/growth.module.ts
git commit -m "feat: wire GrowthModule"
```

---

### Task 6: `financial-health.logic.ts` — pure scoring functions

No external dependency — this is deterministic math over the caller's inputs, so it's the easiest piece to make bulletproof at the boundaries.

**Files:**
- Create: `src/modules/financial-health/financial-health.logic.ts`
- Test: `src/modules/financial-health/financial-health.logic.test.ts`

**Interfaces:**
- Produces: `FinancialHealthInput`, `FinancialHealthResult` types and `calculateFinancialHealth(input: FinancialHealthInput): FinancialHealthResult`. Task 8 imports `calculateFinancialHealth`.

Scoring design (document this in the README handoff, Task 10, so it isn't a mystery to judges):
- `savingsRate` sub-score: `(income - expenses - debtPayment) / income`, scaled so 0% saved = 0 and 30%+ saved = 100, floored at 0.
- `emergencyFund` sub-score: `emergencyFundMonths / 6` scaled to 0-100, capped at 100 (6 months is the standard target).
- `debtRatio` sub-score: `monthlyDebtPayment / monthlyIncome` scaled so 0% DTI = 100 and 40%+ DTI = 0 (40% is the conventional "high risk" debt-to-income threshold).
- Overall `score`: weighted average — savingsRate 40%, emergencyFund 30%, debtRatio 30%.
- `suggestions[]`: always at least one, prioritized — expenses+debt exceeding income beats a low savings-rate suggestion beats a low-emergency-fund suggestion beats a low-debt-ratio suggestion; a savings/emergencyFundMonths mismatch (>1 month off) adds an extra suggestion; an all-strong result gets a positive-reinforcement suggestion instead of a warning.

- [ ] **Step 1: Write the failing boundary tests**

```typescript
// src/modules/financial-health/financial-health.logic.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateFinancialHealth } from './financial-health.logic.js';

test('scores a strong financial position highly with a positive-reinforcement suggestion', () => {
  const result = calculateFinancialHealth({
    monthlyIncome: 100000,
    monthlyExpenses: 40000,
    savings: 600000,
    monthlyDebtPayment: 0,
    emergencyFundMonths: 6
  });
  assert.ok(result.score >= 80);
  assert.match(result.suggestions[0], /strong/i);
});

test('flags when expenses and debt exceed income', () => {
  const result = calculateFinancialHealth({
    monthlyIncome: 30000,
    monthlyExpenses: 25000,
    savings: 5000,
    monthlyDebtPayment: 10000,
    emergencyFundMonths: 0
  });
  assert.equal(result.subScores.savingsRate, 0);
  assert.match(result.suggestions[0], /exceed your income/i);
});

test('scores exactly at the 40% DTI failure threshold as zero on debtRatio', () => {
  const result = calculateFinancialHealth({
    monthlyIncome: 50000,
    monthlyExpenses: 20000,
    savings: 100000,
    monthlyDebtPayment: 20000,
    emergencyFundMonths: 6
  });
  assert.equal(result.subScores.debtRatio, 0);
});

test('caps the emergency fund sub-score at 100 beyond the 6-month target', () => {
  const result = calculateFinancialHealth({
    monthlyIncome: 50000,
    monthlyExpenses: 20000,
    savings: 300000,
    monthlyDebtPayment: 0,
    emergencyFundMonths: 12
  });
  assert.equal(result.subScores.emergencyFund, 100);
});

test('flags a mismatch between stated savings and stated emergency fund months', () => {
  const result = calculateFinancialHealth({
    monthlyIncome: 50000,
    monthlyExpenses: 20000,
    savings: 20000,
    monthlyDebtPayment: 0,
    emergencyFundMonths: 6
  });
  assert.ok(result.suggestions.some((s) => /double-check/i.test(s)));
});
```

- [ ] **Step 2: Run it, confirm it fails because the module doesn't exist yet**

Run: `node --import tsx --test src/modules/financial-health/financial-health.logic.test.ts`
Expected: FAIL — `Cannot find module './financial-health.logic.js'`.

- [ ] **Step 3: Implement the scoring logic**

```typescript
// src/modules/financial-health/financial-health.logic.ts
export interface FinancialHealthInput {
  monthlyIncome: number;
  monthlyExpenses: number;
  savings: number;
  monthlyDebtPayment: number;
  emergencyFundMonths: number;
}

export interface FinancialHealthResult {
  score: number;
  subScores: { savingsRate: number; emergencyFund: number; debtRatio: number };
  suggestions: string[];
}

const EMERGENCY_FUND_TARGET_MONTHS = 6;
const DEBT_RATIO_FAILURE_THRESHOLD = 0.4;
const SAVINGS_RATE_TARGET = 0.3;
const WEIGHTS = { savingsRate: 0.4, emergencyFund: 0.3, debtRatio: 0.3 };

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreSavingsRate(income: number, expenses: number, debtPayment: number): number {
  const rate = (income - expenses - debtPayment) / income;
  return clampScore((rate / SAVINGS_RATE_TARGET) * 100);
}

export function scoreEmergencyFund(months: number): number {
  return clampScore((months / EMERGENCY_FUND_TARGET_MONTHS) * 100);
}

export function scoreDebtRatio(income: number, debtPayment: number): number {
  const ratio = debtPayment / income;
  return clampScore(100 - (ratio / DEBT_RATIO_FAILURE_THRESHOLD) * 100);
}

export function calculateFinancialHealth(input: FinancialHealthInput): FinancialHealthResult {
  const savingsRate = scoreSavingsRate(input.monthlyIncome, input.monthlyExpenses, input.monthlyDebtPayment);
  const emergencyFund = scoreEmergencyFund(input.emergencyFundMonths);
  const debtRatio = scoreDebtRatio(input.monthlyIncome, input.monthlyDebtPayment);

  const score = clampScore(
    savingsRate * WEIGHTS.savingsRate + emergencyFund * WEIGHTS.emergencyFund + debtRatio * WEIGHTS.debtRatio
  );

  const suggestions: string[] = [];

  if (input.monthlyExpenses + input.monthlyDebtPayment > input.monthlyIncome) {
    suggestions.push(
      'Your expenses and debt payments currently exceed your income — address this before setting savings or investment goals.'
    );
  } else if (savingsRate < 50) {
    suggestions.push(
      'Your monthly savings rate is low — review discretionary expenses to free up more income for savings and investing.'
    );
  }

  if (emergencyFund < 50) {
    suggestions.push(
      'You have less than 3 months of expenses in your emergency fund — aim to build toward 6 months before taking on more investment risk.'
    );
  }

  if (debtRatio < 50) {
    suggestions.push(
      'Your monthly debt payments take up a large share of your income — prioritize paying down high-interest debt first.'
    );
  }

  const expectedMonthsFromSavings = input.monthlyExpenses > 0 ? input.savings / input.monthlyExpenses : 0;
  if (Math.abs(expectedMonthsFromSavings - input.emergencyFundMonths) > 1) {
    suggestions.push(
      `Your stated savings imply roughly ${expectedMonthsFromSavings.toFixed(1)} months of expenses covered, versus the ${input.emergencyFundMonths} months provided — double-check this figure.`
    );
  }

  if (suggestions.length === 0) {
    suggestions.push(
      'Your financial fundamentals are strong — consider increasing investment contributions or exploring tax-advantaged schemes.'
    );
  }

  return { score, subScores: { savingsRate, emergencyFund, debtRatio }, suggestions };
}
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `node --import tsx --test src/modules/financial-health/financial-health.logic.test.ts`
Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/financial-health/financial-health.logic.ts src/modules/financial-health/financial-health.logic.test.ts
git commit -m "feat: add financial health scoring logic"
```

---

### Task 7: `financial-health.tools.ts` and `financial-health.module.ts`

**Files:**
- Create: `src/modules/financial-health/financial-health.tools.ts`
- Create: `src/modules/financial-health/financial-health.module.ts`

**Interfaces:**
- Consumes: `calculateFinancialHealth` (Task 6).
- Produces: `FinancialHealthTools`, `CalculateFinancialHealthInputSchema` (zod), `FinancialHealthModule`. Handed to Jeevan in Task 8 for registration.

- [ ] **Step 1: Write the tool**

```typescript
// src/modules/financial-health/financial-health.tools.ts
import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { calculateFinancialHealth } from './financial-health.logic.js';

export const CalculateFinancialHealthInputSchema = z.object({
  monthlyIncome: z.number().positive().describe('Total monthly income in INR'),
  monthlyExpenses: z.number().min(0).describe('Total monthly living expenses in INR'),
  savings: z.number().min(0).describe('Total current savings balance in INR'),
  monthlyDebtPayment: z.number().min(0).describe('Total monthly debt repayment (EMIs, credit cards) in INR'),
  emergencyFundMonths: z.number().min(0).describe('Number of months of expenses currently covered by the emergency fund')
});

export class FinancialHealthTools {
  @Tool({
    name: 'calculate_financial_health',
    description:
      'Scores overall financial health from income, expenses, savings, and debt, with sub-scores and actionable suggestions.',
    inputSchema: CalculateFinancialHealthInputSchema,
    examples: {
      request: {
        monthlyIncome: 60000,
        monthlyExpenses: 35000,
        savings: 150000,
        monthlyDebtPayment: 8000,
        emergencyFundMonths: 4
      },
      response: {
        score: 62,
        subScores: { savingsRate: 58, emergencyFund: 67, debtRatio: 67 },
        suggestions: ['Your monthly savings rate is low — review discretionary expenses to free up more income for savings and investing.'],
        risk_note: 'This is an educational score based on general personal-finance heuristics, not financial advice.',
        educational_only: true
      }
    }
  })
  async calculateFinancialHealthTool(
    input: {
      monthlyIncome: number;
      monthlyExpenses: number;
      savings: number;
      monthlyDebtPayment: number;
      emergencyFundMonths: number;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Calculating financial health', input);

    const result = calculateFinancialHealth(input);

    return {
      ...result,
      risk_note: 'This is an educational score based on general personal-finance heuristics, not financial advice.',
      educational_only: true as const
    };
  }
}
```

- [ ] **Step 2: Write the module**

```typescript
// src/modules/financial-health/financial-health.module.ts
import { Module } from '@nitrostack/core';
import { FinancialHealthTools } from './financial-health.tools.js';

@Module({
  name: 'financial-health',
  description: 'Financial health scoring',
  controllers: [FinancialHealthTools]
})
export class FinancialHealthModule {}
```

- [ ] **Step 3: Add an integration test wrapping the tool method itself**

```typescript
// src/modules/financial-health/financial-health.tools.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FinancialHealthTools, CalculateFinancialHealthInputSchema } from './financial-health.tools.js';

test('calculateFinancialHealthTool always includes the guardrail fields', async () => {
  const tools = new FinancialHealthTools();
  const result = await tools.calculateFinancialHealthTool(
    { monthlyIncome: 60000, monthlyExpenses: 35000, savings: 150000, monthlyDebtPayment: 8000, emergencyFundMonths: 4 },
    { logger: { info: () => {} } } as any
  );

  assert.equal(result.educational_only, true);
  assert.ok(result.risk_note.length > 0);
  assert.ok(result.score >= 0 && result.score <= 100);
});

test('rejects a zero or negative monthlyIncome', () => {
  const result = CalculateFinancialHealthInputSchema.safeParse({
    monthlyIncome: 0,
    monthlyExpenses: 1000,
    savings: 0,
    monthlyDebtPayment: 0,
    emergencyFundMonths: 0
  });
  assert.equal(result.success, false);
});
```

- [ ] **Step 4: Run it, confirm both tests pass**

Run: `node --import tsx --test src/modules/financial-health/financial-health.tools.test.ts`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/financial-health/financial-health.tools.ts src/modules/financial-health/financial-health.module.ts src/modules/financial-health/financial-health.tools.test.ts
git commit -m "feat: add calculate_financial_health tool"
```

---

### Task 8: Add the test runner and run the full suite

**Files:**
- Modify: `package.json`

**Interfaces:** none — this only touches scripts/devDependencies.

- [ ] **Step 1: Add `tsx` as a devDependency and a `test` script**

Edit `package.json`'s `devDependencies` to add `"tsx": "^4"`, and add to `scripts`:

```json
"test": "node --import tsx --test \"src/**/*.test.ts\""
```

- [ ] **Step 2: Install and run the full suite**

Run: `npm install && npm test`
Expected: all tests across `growth.service.test.ts`, `growth.tools.test.ts`, `financial-health.logic.test.ts`, `financial-health.tools.test.ts` PASS (16 tests total).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add tsx test runner and test script"
```

---

### Task 9: Handoff — module registration (Jeevan owns `app.module.ts`)

Not a file this plan touches. Do this out loud, not as a silent commit to someone else's file.

- [ ] **Step 1:** Message Jeevan (or whoever owns `app.module.ts`) asking him to add `GrowthModule` and `FinancialHealthModule` to the root `@Module({ imports: [...] })` array, the same way `CalculatorModule` is registered today.
- [ ] **Step 2:** After he redeploys, sweep both tools through NitroStudio or a real MCP client yourself: call `project_investment_growth` once per `fundCategory` value and `calculate_financial_health` with the boundary inputs from Task 6's tests. Confirm the live responses match what the unit tests predicted.
- [ ] **Step 3:** If `src/shared/contracts.ts` has been frozen by this point and defines its own types for these two tools' inputs/outputs, replace the locally-defined `ProjectInvestmentGrowthInputSchema` / `CalculateFinancialHealthInputSchema` (and the ad hoc return-type literals) with imports from `contracts.ts` instead of maintaining a second copy. Don't do this unilaterally if the shapes disagree — that's a four-people-agree-out-loud conversation, per the frozen-contract rule.

---

### Task 10: README handoff — projection assumptions & health methodology

**Files:**
- Create: `docs/handoff/praneeth-readme-sections.md`

- [ ] **Step 1: Write the handoff doc**

```markdown
<!-- docs/handoff/praneeth-readme-sections.md -->
## How investment growth projections are computed

`project_investment_growth` never returns a single number. For the requested
`fundCategory` (`equity | debt | hybrid | index`), we track one real,
representative mutual fund on mfapi.in:

- equity → Nippon India Large Cap Fund (schemeCode 118632)
- index → UTI Nifty 50 Index Fund (schemeCode 120716)
- hybrid → HDFC Balanced Advantage Fund (schemeCode 118968)
- debt → ICICI Prudential Liquid Fund (schemeCode 120197)

We pull that fund's full NAV history and compute its trailing 3-year and
5-year CAGR. The lower of the two becomes `lowEstimate`'s rate, the higher
becomes `highEstimate`'s rate — the spread between two real historical
windows *is* the range, rather than us inventing a volatility margin on top
of a single guessed number. Both rates are run through the standard monthly
SIP future-value formula for the requested `monthlyAmount` and `years`.

If mfapi.in is unreachable, we serve the last successfully-fetched band from
an in-memory cache (`navSource` says "Cached NAV..."). If there's no cache
either (cold start with a dead API), we fall back to a static, published
long-term category-average band (`navSource` says "Static historical
assumption...") — sourced from [cite: AMFI / Value Research category
averages]. The tool never throws just because the network is down.

## How the financial health score is computed

`calculate_financial_health` has no external dependency — pure scoring over
the caller's inputs:

- **savingsRate** sub-score: share of income left after expenses and debt
  payments, scaled so 0% saved = 0 and 30%+ saved = 100.
- **emergencyFund** sub-score: `emergencyFundMonths / 6`, capped at 100 (6
  months of expenses is the standard target).
- **debtRatio** sub-score: monthly debt payments as a share of income, scaled
  so 0% = 100 and 40%+ (a conventional high-risk debt-to-income threshold) =
  0.
- **score**: weighted average — savings rate 40%, emergency fund 30%, debt
  ratio 30%.

`suggestions[]` always contains at least one entry, prioritized: income
exceeded by expenses+debt, then low savings rate, then thin emergency fund,
then high debt ratio, plus an extra note if the stated `savings` balance
doesn't roughly match the stated `emergencyFundMonths`. An all-strong result
gets a positive-reinforcement suggestion instead of a warning.
```

- [ ] **Step 2: Send it to Jeevan**

Hand the file (or its contents) to Jeevan before 06:00 for README assembly.

- [ ] **Step 3: Commit**

```bash
git add docs/handoff/praneeth-readme-sections.md
git commit -m "docs: add README handoff for growth and financial-health sections"
```

---

## Self-Review

**Spec coverage:**
- `mfapi.ts` fetching real NAV, proven end-to-end → Task 1.
- Cached fallback for a dead API → Task 3 (live/cached/static tiers) + tests.
- `project_investment_growth` always a range with stated assumptions → Task 4.
- `calculate_financial_health` score + three sub-scores + suggestions → Tasks 6-7.
- README sections → Task 10.
- Module registration boundary respected (not touching `app.module.ts`) → Task 9.
- `fundCategory` enum decision flagged for team confirmation → Global Constraints.
- Real, traceable fund data (not invented) → verified table above, used throughout.

**Placeholder scan:** no TBDs; every step has runnable code or an exact command; scoring weights/thresholds are concrete numbers, not "add appropriate logic."

**Type consistency:** `CagrBand` (Task 3) matches the destructured fields used in Task 4 (`low, high, source, asOf, schemeName`). `FinancialHealthResult` (Task 6) matches the spread used in Task 7's tool return. `FundCategory` is defined once (Task 2) and reused everywhere else.
