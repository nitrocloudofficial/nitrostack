/**
 * PassportIQ shared contracts — the single import surface for all four roles.
 *
 *   import { DetectDuplicateSignalsResultSchema } from '../../contracts/index.js';
 *
 * Every schema here either matches contracts.md verbatim or extends it
 * additively. Files marked "DO NOT EDIT" are frozen integration boundaries.
 */
export * from './events.contract.js';
export * from './seed-applicant.contract.js';
export * from './duplicate-signals.contract.js';
export * from './risk-graph.contract.js';
export * from './decision.contract.js';
export * from './verification.contract.js';
export * from './agent.contract.js';
export * from './automation.contract.js';
// The passport case lifecycle — the actual government process the fraud
// pipeline is one station inside. Declares CASE_TRANSITIONS, which is the
// single source of truth for what may happen next to any application.
export * from './caseflow.contract.js';
