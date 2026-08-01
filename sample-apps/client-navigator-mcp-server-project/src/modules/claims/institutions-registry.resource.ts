/**
 * RESOURCE 1: institutions://registry
 * 
 * Nine silos of institutions where Indians hold assets after death.
 * Each entry carries: name, regulator, what it holds, claim portal, nominee process,
 * non-nominee process, typical duration, statutory deadline if any, source, asOfDate, confidence.
 */

import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { ALL_INSTITUTIONS } from '../../fixtures/institution-registry.js';

export class InstitutionsRegistryResource {
  @Resource({
    uri: 'institutions://registry',
    name: 'Institutions Registry',
    description:
      'Registry of nine silos of institutions where Indians hold assets after death: scheduled banks, co-operative banks, life insurance, EPFO, depositories, mutual fund RTAs, IEPF, post office savings, NPS, and land records. Each entry includes regulator, what it holds, claim portal, nominee/non-nominee process, typical duration, statutory deadline, source, asOfDate, and confidence level.',
    mimeType: 'application/json',
  })
  async getRegistry(uri: string, ctx: ExecutionContext) {
    const registryData = {
      institutions: ALL_INSTITUTIONS.map((inst) => ({
        id: inst.id,
        name: inst.name,
        regulator: inst.regulator,
        whatItHolds: inst.whatItHolds,
        claimPortal: inst.claimPortal,
        nomineeProcess: inst.nomineeProcess,
        nonNomineeProcess: inst.nonNomineeProcess,
        typicalDurationDays: inst.typicalDurationDays,
        statutoryDeadlineDays: inst.statutoryDeadlineDays,
        source: inst.source,
        asOfDate: inst.asOfDate,
        confidence: inst.confidence,
      })),
    };

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(registryData, null, 2),
        },
      ],
    };
  }
}
