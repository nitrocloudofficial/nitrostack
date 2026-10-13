/**
 * HybridBindingCapabilityPort
 *
 * Resolution order for predict_mhci / predict_mhcii:
 *   1. IEDB live (when IEDB_LIVE_ENABLED=true and fallbackPolicy permits live)
 *   2. MHCflurry local scientific prediction for MHC-I only (when enabled)
 *   3. Local fixture fallback (on transient connector errors, when policy permits)
 *   4. Typed failure (all other cases)
 *
 * Population coverage:
 *   1. IEDB HTTP live coverage when explicitly configured
 *   2. Local fixture fallback when policy permits
 *
 * GraphBepi remains fixture-only per ADR-017.
 */

import type { CapabilityPort } from './capability-port.js';
import { ToolExecutionError } from './executor.js';
import type { IedbBindingCapabilityOptions } from './iedb-binding-capability-port.js';
import { IedbBindingCapabilityPort } from './iedb-binding-capability-port.js';
import {
  IedbPopulationCoverageCapabilityPort,
  type IedbPopulationCoverageCapabilityOptions,
} from './iedb-population-coverage-capability-port.js';
import { LocalFixtureCapabilityPort } from './local-fixture-capability-port.js';
import {
  MhcflurryBindingCapabilityPort,
  type MhcflurryBindingCapabilityOptions,
} from './mhcflurry-binding-capability-port.js';

const BINDING_CAPABILITIES = new Set(['predict_mhci', 'predict_mhcii']);
const POPULATION_COVERAGE_CAPABILITY = 'calculate_population_coverage';
const MHCFLURRY_METHODS = new Set(['mhcflurry-presentation']);

interface BindingCapabilityResult {
  observations: unknown[];
  provenance: unknown[];
  [key: string]: unknown;
}

interface MethodSplit {
  explicitMethods: boolean;
  iedbMethods: string[];
  mhcflurryMethods: string[];
}

/**
 * Error categories eligible for fixture fallback.
 * Mirrors the API's execution-policy.ts isFallbackEligible().
 */
function isTransient(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as Record<string, unknown>;
  return (
    e.category === 'TIMEOUT' ||
    e.category === 'RATE_LIMIT' ||
    e.category === 'CONNECTOR' ||
    e.code === 'DEPENDENCY_UNAVAILABLE' ||
    e.code === 'SERVICE_UNAVAILABLE' ||
    e.code === 'IEDB_NOT_CONFIGURED' ||
    e.retryable === true
  );
}

function permitsFixture(policy: string): boolean {
  return (
    policy === 'CACHE_THEN_LIVE_THEN_FIXTURE' ||
    policy === 'LIVE_THEN_CACHE_THEN_FIXTURE' ||
    policy === 'FIXTURE_ONLY'
  );
}

export interface HybridBindingCapabilityOptions {
  iedb: IedbBindingCapabilityOptions;
  iedbPopulationCoverage?: IedbPopulationCoverageCapabilityOptions;
  mhcflurry?: MhcflurryBindingCapabilityOptions;
}

export class HybridBindingCapabilityPort implements CapabilityPort {
  private readonly iedbPort: IedbBindingCapabilityPort;
  private readonly iedbPopulationCoveragePort: IedbPopulationCoverageCapabilityPort;
  private readonly mhcflurryPort: MhcflurryBindingCapabilityPort;
  private readonly fixturePort: LocalFixtureCapabilityPort;

  constructor(options: HybridBindingCapabilityOptions) {
    this.iedbPort = new IedbBindingCapabilityPort(options.iedb);
    this.iedbPopulationCoveragePort = new IedbPopulationCoverageCapabilityPort(
      options.iedbPopulationCoverage ?? { enabled: false },
    );
    this.mhcflurryPort = new MhcflurryBindingCapabilityPort(
      options.mhcflurry ?? { enabled: false },
    );
    this.fixturePort = new LocalFixtureCapabilityPort();
  }

  /** True when the IEDB live connector is enabled. Used for diagnostics. */
  get liveEnabled(): boolean {
    return this.iedbPort.liveEnabled;
  }

  async invoke(capability: string, input: unknown): Promise<unknown> {
    // Non-binding capabilities always go to the fixture port.
    if (!BINDING_CAPABILITIES.has(capability)) {
      if (capability === POPULATION_COVERAGE_CAPABILITY) {
        return this.invokePopulationCoverage(input);
      }
      return this.fixturePort.invoke(capability, input);
    }

    const fallbackPolicy = this.extractFallbackPolicy(input);
    const methodSplit = this.splitMethods(input);

    // FIXTURE_ONLY: skip live entirely.
    if (fallbackPolicy === 'FIXTURE_ONLY') {
      return this.fixturePort.invoke(capability, input);
    }

    const liveResults: BindingCapabilityResult[] = [];
    const liveFailures: unknown[] = [];

    // IEDB owns all non-MHCflurry binding methods, plus schema-level method
    // validation when no explicit method list is present.
    if (methodSplit.iedbMethods.length > 0 || !methodSplit.explicitMethods) {
      if (this.iedbPort.liveEnabled) {
        try {
          const result = await this.iedbPort.invoke(
            capability,
            methodSplit.explicitMethods ? this.withMethods(input, methodSplit.iedbMethods) : input,
          );
          liveResults.push(this.asBindingResult(result, 'IEDB'));
        } catch (liveError) {
          liveFailures.push(liveError);
        }
      } else {
        liveFailures.push(
          new ToolExecutionError(
            'LIVE_CONNECTOR_REQUIRED',
            'CONNECTOR',
            `Live IEDB connector is not enabled and fallback policy '${fallbackPolicy}' does not permit fixtures.`,
            false,
          ),
        );
      }
    }

    // MHCflurry is a distinct local scientific MHC-I connector. Do not send
    // its method name to IEDB.
    if (methodSplit.mhcflurryMethods.length > 0) {
      if (capability !== 'predict_mhci') {
        liveFailures.push(
          new ToolExecutionError(
            'MHCFLURRY_CAPABILITY_UNSUPPORTED',
            'VALIDATION',
            `MHCflurry implements MHC-I prediction only, not ${capability}.`,
            false,
          ),
        );
      } else if (this.mhcflurryPort.liveEnabled) {
        try {
          const result = await this.mhcflurryPort.invoke(
            capability,
            this.withMethods(input, methodSplit.mhcflurryMethods),
          );
          liveResults.push(this.asBindingResult(result, 'MHCflurry'));
        } catch (localError) {
          liveFailures.push(localError);
        }
      } else {
        liveFailures.push(
          new ToolExecutionError(
            'MHCFLURRY_NOT_CONFIGURED',
            'CONNECTOR',
            'The MHCflurry local predictor is disabled.',
            false,
          ),
        );
      }
    }

    if (liveResults.length > 0 && liveFailures.length === 0) {
      return this.mergeBindingResults(liveResults);
    }

    if (liveFailures.length > 0) {
      const canFallback =
        liveFailures.every((failure) => isTransient(failure)) && permitsFixture(fallbackPolicy);
      if (!canFallback) throw liveFailures[0];
      // Transient error + fixture-permitting policy: fall through to fixture.
    }

    // Fixture fallback / offline backup mode (also covers IEDB_LIVE_ENABLED=false).
    if (permitsFixture(fallbackPolicy)) {
      return this.fixturePort.invoke(capability, input);
    }

    throw new ToolExecutionError(
      'LIVE_CONNECTOR_REQUIRED',
      'CONNECTOR',
      `Live IEDB connector is not enabled and fallback policy '${fallbackPolicy}' does not permit fixtures.`,
      false,
    );
  }

  private async invokePopulationCoverage(input: unknown): Promise<unknown> {
    const fallbackPolicy = this.extractFallbackPolicy(input);
    if (fallbackPolicy === 'FIXTURE_ONLY') {
      return this.fixturePort.invoke(POPULATION_COVERAGE_CAPABILITY, input);
    }
    try {
      return await this.iedbPopulationCoveragePort.invoke(POPULATION_COVERAGE_CAPABILITY, input);
    } catch (error) {
      if (isTransient(error) && permitsFixture(fallbackPolicy)) {
        return this.fixturePort.invoke(POPULATION_COVERAGE_CAPABILITY, input);
      }
      throw error;
    }
  }

  private extractFallbackPolicy(input: unknown): string {
    if (
      typeof input === 'object' &&
      input !== null &&
      'fallbackPolicy' in input &&
      typeof (input as Record<string, unknown>).fallbackPolicy === 'string'
    ) {
      return (input as Record<string, unknown>).fallbackPolicy as string;
    }
    return 'FIXTURE_ONLY';
  }

  private splitMethods(input: unknown): MethodSplit {
    const methods =
      typeof input === 'object' &&
      input !== null &&
      'methods' in input &&
      Array.isArray((input as Record<string, unknown>).methods)
        ? ((input as Record<string, unknown>).methods as unknown[])
            .filter((method): method is string => typeof method === 'string')
            .map((method) => method.trim())
            .filter((method) => method.length > 0)
        : [];

    const iedbMethods: string[] = [];
    const mhcflurryMethods: string[] = [];

    for (const method of methods) {
      if (MHCFLURRY_METHODS.has(method.toLowerCase())) {
        mhcflurryMethods.push(method);
      } else {
        iedbMethods.push(method);
      }
    }

    return {
      explicitMethods: methods.length > 0,
      iedbMethods,
      mhcflurryMethods,
    };
  }

  private withMethods(input: unknown, methods: string[]): unknown {
    if (typeof input !== 'object' || input === null) return input;
    return { ...(input as Record<string, unknown>), methods };
  }

  private asBindingResult(result: unknown, connectorName: string): BindingCapabilityResult {
    if (
      typeof result !== 'object' ||
      result === null ||
      !Array.isArray((result as Record<string, unknown>).observations) ||
      !Array.isArray((result as Record<string, unknown>).provenance)
    ) {
      throw new ToolExecutionError(
        'CONNECTOR_RESPONSE_INVALID',
        'CONNECTOR',
        `${connectorName} returned an invalid binding prediction response.`,
        false,
      );
    }
    return result as BindingCapabilityResult;
  }

  private mergeBindingResults(results: BindingCapabilityResult[]): BindingCapabilityResult {
    if (results.length === 1) return results[0] as BindingCapabilityResult;

    const first = results[0];
    if (first === undefined) {
      throw new ToolExecutionError(
        'CONNECTOR_RESPONSE_INVALID',
        'CONNECTOR',
        'No binding prediction responses were available to merge.',
        false,
      );
    }
    const remaining = results.slice(1);
    return {
      ...first,
      observations: results.flatMap((result) => result.observations),
      provenance: results.flatMap((result) => result.provenance),
      ...Object.fromEntries(
        remaining.flatMap((result) =>
          Object.entries(result).filter(
            ([key]) => key !== 'observations' && key !== 'provenance' && !(key in first),
          ),
        ),
      ),
    };
  }
}
