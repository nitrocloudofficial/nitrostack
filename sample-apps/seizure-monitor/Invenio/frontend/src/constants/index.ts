/**
 * Invenio — Application Constants
 *
 * Central location for all static configuration values.
 * These are compile-time constants — not runtime config.
 *
 * Runtime config (API URLs, feature flags) lives in:
 * - src/config/env.ts (derived from import.meta.env)
 * - shared/config/index.ts (cross-workspace defaults)
 */

/* ─── App Identity ─────────────────────────────── */
export const APP_NAME = 'Invenio' as const
export const APP_TAGLINE = 'AI Research Operating System' as const
export const APP_VERSION = '0.1.0' as const

/* ─── Navigation ───────────────────────────────── */
export const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: 'LayoutDashboard',
    description: 'Research overview and activity',
  },
  {
    id: 'workflow',
    label: 'Copilot',
    path: '/workflow',
    icon: 'Sparkles',
    description: 'Autonomous research workflow',
  },
  {
    id: 'research',
    label: 'Research',
    path: '/research',
    icon: 'FlaskConical',
    description: 'Explore scientific literature',
  },
  {
    id: 'knowledge-graph',
    label: 'Knowledge Graph',
    path: '/knowledge-graph',
    icon: 'Network',
    description: 'Visual relationship explorer',
  },
  {
    id: 'evidence',
    label: 'Evidence',
    path: '/evidence',
    icon: 'BookOpenCheck',
    description: 'Evidence chains and citations',
  },
  {
    id: 'datasets',
    label: 'Datasets',
    path: '/datasets',
    icon: 'Database',
    description: 'Curated research datasets',
  },
  {
    id: 'repositories',
    label: 'Repositories',
    path: '/repositories',
    icon: 'GitBranch',
    description: 'Code and implementation resources',
  },
  {
    id: 'workspace',
    label: 'Workspace',
    path: '/workspace',
    icon: 'FileText',
    description: 'Generated research reports',
  },
  {
    id: 'authors',
    label: 'Authors',
    path: '/authors',
    icon: 'Users',
    description: 'Explore research authors',
  },
  {
    id: 'contradictions',
    label: 'Contradictions',
    path: '/contradictions',
    icon: 'AlertTriangle',
    description: 'Conflicting claims and gaps',
  },
  {
    id: 'hypotheses',
    label: 'Hypotheses',
    path: '/hypotheses',
    icon: 'Lightbulb',
    description: 'Generated research hypotheses',
  },
] as const

export const NAV_BOTTOM_ITEMS = [
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: 'Settings',
    description: 'Application preferences',
  },
] as const

/* ─── Sidebar ──────────────────────────────────── */
export const SIDEBAR_WIDTH = 240
export const SIDEBAR_COLLAPSED_WIDTH = 60

/* ─── Pagination ───────────────────────────────── */
export const DEFAULT_PAGE_SIZE = 20
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const

/* ─── Module Status ────────────────────────────── */
/**
 * Module readiness states.
 * Phase 1: All modules are PLANNED.
 * Future phases will promote modules to BETA → STABLE.
 */
export const MODULE_STATUS = {
  PLANNED: 'planned',
  IN_DEVELOPMENT: 'in_development',
  BETA: 'beta',
  STABLE: 'stable',
} as const

export type ModuleStatus = (typeof MODULE_STATUS)[keyof typeof MODULE_STATUS]

/* ─── Nitro Agent Modules ──────────────────────── */
export const NITRO_MODULES = [
  { id: 'planner', label: 'Planner', status: MODULE_STATUS.PLANNED },
  { id: 'research', label: 'Research', status: MODULE_STATUS.PLANNED },
  { id: 'datasets', label: 'Datasets', status: MODULE_STATUS.PLANNED },
  { id: 'repositories', label: 'Repositories', status: MODULE_STATUS.PLANNED },
  { id: 'knowledge_graph', label: 'Knowledge Graph', status: MODULE_STATUS.PLANNED },
  { id: 'evidence', label: 'Evidence', status: MODULE_STATUS.PLANNED },
  { id: 'correlation', label: 'Correlation', status: MODULE_STATUS.PLANNED },
  { id: 'hypothesis', label: 'Hypothesis', status: MODULE_STATUS.PLANNED },
  { id: 'reports', label: 'Reports', status: MODULE_STATUS.PLANNED },
] as const

/* ─── API ──────────────────────────────────────── */
/** Future: Move to env.ts — defined here for Phase 1 reference */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
export const API_VERSION = 'v1'
export const API_PREFIX = `/api/${API_VERSION}`
