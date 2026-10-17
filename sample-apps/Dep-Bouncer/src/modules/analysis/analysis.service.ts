import { Injectable } from '@nitrostack/core';
import type { AnalysisContext, Finding, Signal } from './signal.js';
import { finding } from './signals/finding.js';
import { ProvenanceDropSignal } from './signals/provenance-drop.signal.js';
import { PublisherChangeSignal } from './signals/publisher-change.signal.js';
import { InstallScriptSignal } from './signals/install-script.signal.js';
import { NewDepsSignal } from './signals/new-deps.signal.js';
import { ReleaseTimingSignal } from './signals/release-timing.signal.js';
import { CodeDiffSignal } from './signals/code-diff.signal.js';
import { NameCheckSignal } from './signals/name-check.signal.js';
import { decide, type VerdictResult } from './verdict.js';

const SIGNAL_TIMEOUT_MS = 25_000;

/** Runs every signal on one release and turns the findings into a verdict. */
@Injectable({
  deps: [
    ProvenanceDropSignal,
    PublisherChangeSignal,
    InstallScriptSignal,
    NewDepsSignal,
    ReleaseTimingSignal,
    CodeDiffSignal,
    NameCheckSignal,
  ],
})
export class AnalysisService {
  private readonly signals: Signal[];

  constructor(
    provenance: ProvenanceDropSignal,
    publisher: PublisherChangeSignal,
    installScript: InstallScriptSignal,
    newDeps: NewDepsSignal,
    timing: ReleaseTimingSignal,
    codeDiff: CodeDiffSignal,
    nameCheck: NameCheckSignal,
  ) {
    this.signals = [provenance, publisher, installScript, newDeps, timing, codeDiff, nameCheck];
  }

  get signalIds(): string[] {
    return this.signals.map((s) => s.id);
  }

  async analyze(ctx: AnalysisContext): Promise<VerdictResult & { checks: string[] }> {
    const results = await Promise.all(this.signals.map((s) => this.run(s, ctx)));
    return { ...decide(results.flat()), checks: this.signalIds };
  }

  /** A failing or slow signal becomes an incomplete-check warning, never a crash or a silent pass. */
  private async run(signal: Signal, ctx: AnalysisContext): Promise<Finding[]> {
    let timer: NodeJS.Timeout | undefined;
    const controller = new AbortController();
    const deadline = Date.now() + SIGNAL_TIMEOUT_MS;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error('timed out'));
        }, SIGNAL_TIMEOUT_MS);
      });
      const evaluationContext = { ...ctx, signal: controller.signal, deadline };
      return await Promise.race([signal.evaluate(evaluationContext), timeout]);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      return [{ ...finding(signal.id, 'warn', `${signal.id} check incomplete: ${reason}`), incomplete: true }];
    } finally {
      clearTimeout(timer);
    }
  }
}
