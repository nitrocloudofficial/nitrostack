/**
 * ExternalApiHealthCheck — Bounded probes for required and optional upstreams.
 * Uses the shared HTTP policy with a 3-second, single-attempt health deadline.
 */
import { HealthCheck, HealthCheckInterface, HealthCheckResult, Injectable } from '@nitrostack/core';
import { env } from '../config/env.js';
import { HttpClientService } from '../integrations/http-client.service.js';

interface ProbeDefinition {
  name: string;
  url: string;
  required: boolean;
}

@Injectable({ deps: [HttpClientService] })
@HealthCheck({
  name: 'upstreams',
  description: 'Monitors reachability of required and optional clinical data APIs',
  interval: 60,
})
export class ExternalApiHealthCheck implements HealthCheckInterface {
  constructor(private readonly http: HttpClientService) {}

  async check(): Promise<HealthCheckResult> {
    const probes: ProbeDefinition[] = [
      { name: 'rxnorm', url: `${env.RXNORM_BASE_URL}/rxcui.json?name=aspirin`, required: true },
      { name: 'openfda', url: `${env.OPENFDA_BASE_URL}/drug/label.json?limit=1`, required: true },
      {
        name: 'pubmed',
        url: `${env.NCBI_BASE_URL}/esearch.fcgi?db=pubmed&term=test&retmode=json&retmax=1`,
        required: true,
      },
      { name: 'clinicaltrials', url: `${env.TRIALS_BASE_URL}/studies?pageSize=1`, required: true },
      {
        name: 'clinicaltables',
        url: `${env.CLINTABLES_BASE_URL}/icd10cm/v3/search?terms=test&maxList=1`,
        required: true,
      },
      { name: 'fhir_primary', url: `${env.FHIR_BASE_URL}/metadata`, required: true },
      {
        name: 'fhir_fallback',
        url: `${env.FHIR_BASE_URL_FALLBACK}/metadata`,
        required: false,
      },
    ];

    if (env.ICD_CLIENT_ID && env.ICD_CLIENT_SECRET) {
      probes.push({
        name: 'who_icd',
        url: `${env.ICD_BASE_URL}/release/11/2024-01/mms/search?q=diabetes&subtreesFilter=`,
        required: false,
      });
    }

    const results = await Promise.all(probes.map((probe) => this.probe(probe)));
    const requiredResults = results.filter((result) => result.required);
    const optionalResults = results.filter((result) => !result.required);
    const requiredDown = requiredResults.filter((result) => !result.up).length;
    const optionalDown = optionalResults.filter((result) => !result.up).length;

    let status: 'up' | 'degraded' | 'down' = 'up';
    if (requiredDown >= 3) status = 'down';
    else if (requiredDown > 0 || optionalDown > 0) status = 'degraded';

    return {
      status,
      message: `Upstreams health: ${requiredResults.filter((r) => r.up).length}/${requiredResults.length} required online`,
      details: {
        required_up_count: requiredResults.filter((result) => result.up).length,
        required_down_count: requiredDown,
        optional_up_count: optionalResults.filter((result) => result.up).length,
        optional_down_count: optionalDown,
        upstreams: results,
      },
    };
  }

  private async probe(probe: ProbeDefinition) {
    const startedAt = Date.now();
    try {
      const response = await this.http.getJson({
        api: `health:${probe.name}`,
        url: probe.url,
        timeoutMs: 3_000,
        deadlineMs: 3_000,
        maxRetries: 0,
      });
      return {
        name: probe.name,
        required: probe.required,
        up: true,
        status: response.meta.status,
        latency_ms: Date.now() - startedAt,
      };
    } catch (error: any) {
      const status = typeof error?.status === 'number' ? error.status : null;
      // A reachable upstream returning a valid client/resource response still
      // proves availability for health purposes.
      const reachable = status === 400 || status === 404;
      return {
        name: probe.name,
        required: probe.required,
        up: reachable,
        status,
        error: error?.code ?? 'UPSTREAM_UNAVAILABLE',
        latency_ms: Date.now() - startedAt,
      };
    }
  }
}
