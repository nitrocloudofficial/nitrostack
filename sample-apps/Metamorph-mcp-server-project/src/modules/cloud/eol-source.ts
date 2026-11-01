// End-of-life data for the AWS connector: endoflife.date first, a small checked-in table as the offline fallback.
// Findings say which one they used ("endoflife.date" with the fetch time, or "built-in table" with the check date).
// RDS engines and EKS have NO built-in table on purpose: without the feed those checks are skipped and reported as not checked,
// never guessed.
import { EolClient } from '../feeds/eol.js';

export const BUILTIN_CHECKED = '2026-10-31';

// Lambda runtime DEPRECATION dates (end of security patches). Copied from https://endoflife.date/api/aws-lambda.json on
// 2026-10-31, which follows https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html. Quoted keys are runtime ids.
export const LAMBDA_BUILTIN_URL = 'https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html';
export const LAMBDA_DEPRECATION: Record<string, string> = {
  'java17.al2023': '2029-06-30',
  'java11.al2023': '2029-06-30',
  'java8.al2023': '2029-06-30',
  'ruby4.0': '2029-03-31',
  'dotnet10': '2028-11-14',
  'nodejs24.x': '2028-04-30',
  'python3.14': '2029-06-30',
  'java25': '2029-06-30',
  'ruby3.4': '2028-03-31',
  'dotnet9': '2026-11-10',
  'nodejs22.x': '2027-04-30',
  'python3.13': '2029-06-30',
  'ruby3.3': '2027-03-31',
  'dotnet8': '2026-11-10',
  'python3.12': '2028-10-31',
  'java21': '2029-06-30',
  'nodejs20.x': '2026-04-30',
  'provided.al2023': '2029-06-30',
  'python3.11': '2027-06-30',
  'ruby3.2': '2026-03-31',
  'java17': '2027-06-30',
  'python3.10': '2026-10-31',
  'nodejs18.x': '2025-09-01',
  'dotnet7': '2024-05-14',
  'nodejs16.x': '2024-06-12',
  'dotnet6': '2024-12-20',
  'python3.9': '2025-12-15',
  'nodejs14.x': '2023-12-04',
  'dotnet5.0': '2022-05-10',
  'java8.al2': '2027-06-30',
  'provided.al2': '2026-07-31',
  'dotnetcore3.1': '2023-04-03',
  'ruby2.7': '2023-12-07',
  'nodejs12.x': '2023-03-31',
  'python3.8': '2024-10-14',
  'java11': '2027-06-30',
  'nodejs10.x': '2021-07-30',
  'ruby2.5': '2021-07-30',
  'provided': '2024-01-08',
  'python3.7': '2023-12-04',
  'dotnetcore2.1': '2022-01-05',
  'nodejs8.10': '2020-03-06',
  'dotnetcore2.0': '2019-05-30',
  'go1.x': '2024-01-08',
  'nodejs4.3-edge': '2020-03-05',
  'python3.6': '2022-07-18',
  'nodejs6.10': '2019-08-12',
  'dotnetcore1.0': '2019-06-27',
  'nodejs4.3': '2020-03-05',
  'python2.7': '2021-07-15',
  'java8': '2024-01-08',
  'nodejs': '2016-08-30'
};

// Amazon Linux end of support. Source: https://endoflife.date/api/amazon-linux.json and
// https://aws.amazon.com/amazon-linux-2/faqs/ , checked 2026-10-31. AL1 releases all ended 2023-12-31.
export const AL_BUILTIN_URL = 'https://endoflife.date/amazon-linux';
export const AMAZON_LINUX_EOL: Record<string, string> = { '2023': '2029-06-30', '2': '2026-06-30', '2018.03': '2023-12-31' };

export interface CycleInfo {
  eol?: string | boolean;
  support?: string;
}

export interface ProductEol {
  product: string;
  provenance: 'endoflife.date' | 'built-in table';
  /** ISO time of the fetch, or the check date of the built-in table. */
  asOf: string;
  url: string;
  cycles: Map<string, CycleInfo>;
}

/** Per-run lookups of the allowlisted products. Returns undefined when neither the feed nor a built-in table can answer. */
export class AwsEolSource {
  private readonly memo = new Map<string, Promise<ProductEol | undefined>>();
  constructor(private readonly client: EolClient = new EolClient()) {}

  product(product: string): Promise<ProductEol | undefined> {
    let p = this.memo.get(product);
    if (!p) {
      p = this.load(product);
      this.memo.set(product, p);
    }
    return p;
  }

  private async load(product: string): Promise<ProductEol | undefined> {
    try {
      const cycles = await this.client.cycles(product);
      if (cycles.length > 0) {
        const first = cycles[0];
        return {
          product,
          provenance: 'endoflife.date',
          asOf: first.fetchedAt,
          url: first.source,
          cycles: new Map(cycles.map((c) => [c.cycle, { eol: c.eol, ...(c.support ? { support: c.support } : {}) }]))
        };
      }
    } catch {
      /* fall through to the built-in table */
    }
    if (product === 'aws-lambda') {
      return { product, provenance: 'built-in table', asOf: BUILTIN_CHECKED, url: LAMBDA_BUILTIN_URL, cycles: new Map(Object.entries(LAMBDA_DEPRECATION).map(([k, v]) => [k, { support: v }])) };
    }
    if (product === 'amazon-linux') {
      return { product, provenance: 'built-in table', asOf: BUILTIN_CHECKED, url: AL_BUILTIN_URL, cycles: new Map(Object.entries(AMAZON_LINUX_EOL).map(([k, v]) => [k, { eol: v }])) };
    }
    return undefined;
  }
}
