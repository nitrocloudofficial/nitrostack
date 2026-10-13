/**
 * Shared Constants
 * Used across frontend, backend, and Nitro agents.
 */

export const APP_NAME = 'Invenio' as const
export const APP_VERSION = '0.1.0' as const
export const API_VERSION = 'v1' as const

export const ENTITY_TYPES = [
  'paper', 'dataset', 'repository', 'patent',
  'phenomenon', 'mathematical_concept', 'algorithm', 'engineering_technique',
] as const

export const RELATIONSHIP_TYPES = [
  'cites', 'implements', 'validates', 'inspires',
  'contradicts', 'uses_dataset', 'produces_dataset', 'is_analogous_to',
] as const

export const PHASES = ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'] as const
export const NITRO_AGENT_IDS = [
  'planner', 'research', 'datasets', 'repositories',
  'knowledge_graph', 'evidence', 'correlation', 'hypothesis', 'reports',
] as const
