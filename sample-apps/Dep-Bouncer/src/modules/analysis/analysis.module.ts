import { Module } from '@nitrostack/core';
import { AnalysisService } from './analysis.service.js';
import { CodeDiffSignal } from './signals/code-diff.signal.js';
import { InstallScriptSignal } from './signals/install-script.signal.js';
import { NameCheckSignal } from './signals/name-check.signal.js';
import { NewDepsSignal } from './signals/new-deps.signal.js';
import { ProvenanceDropSignal } from './signals/provenance-drop.signal.js';
import { PublisherChangeSignal } from './signals/publisher-change.signal.js';
import { ReleaseTimingSignal } from './signals/release-timing.signal.js';

/** The signals and the verdict engine. Pure apart from loading files through the context. */
@Module({
  name: 'analysis',
  description: 'Release signals and verdicts',
  providers: [
    ProvenanceDropSignal,
    PublisherChangeSignal,
    InstallScriptSignal,
    NewDepsSignal,
    ReleaseTimingSignal,
    CodeDiffSignal,
    NameCheckSignal,
    AnalysisService,
  ],
  exports: [AnalysisService],
})
export class AnalysisModule {}
