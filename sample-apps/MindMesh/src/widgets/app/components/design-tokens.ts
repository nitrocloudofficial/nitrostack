/**
 * Design Tokens — Dark Technical / Console Aesthetic
 * Shared across all ScholarPilot widgets for consistent theming
 */

export const DESIGN = {
  colors: {
    // Background layers
    bg: '#0a0d12',           // Deep slate base
    bgElevated: '#11161d',   // Cards, panels
    bgHover: '#171e2a',      // Hover states
    bgActive: '#1c2533',     // Active/selected

    // Borders
    border: '#1f2a3a',       // Subtle borders
    borderBright: '#2d3d52', // Focus/active borders

    // Text
    fg: '#e8edf2',           // Primary text
    fgMuted: '#8b98a8',      // Secondary text
    fgDim: '#5a6a7a',        // Tertiary/disabled text

    // Accents
    amber: '#ffb800',        // Primary interactive
    amberDim: '#cc9500',     // Hover amber
    amberBg: 'rgba(255, 184, 0, 0.12)',
    amberBorder: 'rgba(255, 184, 0, 0.3)',

    // Status
    green: '#22c55e',        // Success/done
    greenBg: 'rgba(34, 197, 94, 0.12)',
    greenBorder: 'rgba(34, 197, 94, 0.3)',
    red: '#ef4444',          // Error/fail
    redBg: 'rgba(239, 68, 68, 0.12)',
    redBorder: 'rgba(239, 68, 68, 0.3)',
    blue: '#3b82f6',         // Info/primary
    blueBg: 'rgba(59, 130, 246, 0.12)',
    blueBorder: 'rgba(59, 130, 246, 0.3)',

    // Phase group colors
    phaseCore: '#3b82f6',       // Core research phases (blue)
    phaseStretch: '#a855f7',    // Stretch/advanced (purple)
    phaseExport: '#14b8a6',     // Output/export (teal)
  },
  fonts: {
    sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, monospace',
  },
  spacing: {
    xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32,
  },
  radius: {
    sm: 4, md: 8, lg: 12, xl: 16,
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.3)',
    md: '0 4px 12px rgba(0,0,0,0.4)',
    lg: '0 8px 24px rgba(0,0,0,0.5)',
    glowAmber: '0 0 16px rgba(255,184,0,0.3)',
    glowGreen: '0 0 16px rgba(34,197,94,0.3)',
    glowBlue: '0 0 16px rgba(59,130,246,0.3)',
  },
  transitions: {
    fast: '120ms ease',
    normal: '200ms ease',
    slow: '300ms ease',
  },
  zIndex: {
    base: 1, dropdown: 10, modal: 100, toast: 1000,
  },
} as const;

export type DesignTokens = typeof DESIGN;

interface Phase {
  id: number;
  name: string;
  tools: readonly string[];
}

interface PhaseGroup {
  groupId: string;
  label: string;
  color: string;
  phases: readonly Phase[];
}

// Phase group configuration
export const PHASE_GROUPS: readonly PhaseGroup[] = [
  {
    groupId: 'intake',
    label: 'Intake & Search',
    color: DESIGN.colors.phaseCore,
    phases: [
      { id: 0, name: 'Prior Work Search', tools: ['search_prior_work', 'search_prior_ai_sessions'] },
      { id: 1, name: 'Paper Search & Scoring', tools: ['search_papers', 'score_paper_relevance', 'get_paper_metadata'] },
    ],
  },
  {
    groupId: 'analysis',
    label: 'Analysis & Synthesis',
    color: DESIGN.colors.phaseCore,
    phases: [
      { id: 2, name: 'Extraction & Claim Mining', tools: ['extract_paper_claims', 'extract_paper_metadata', 'fetch_full_text'] },
      { id: 3, name: 'Synthesis & Clustering', tools: ['cluster_papers', 'find_contradictory_claims', 'synthesize_clusters'] },
      { id: 4, name: 'Gap Finder', tools: ['assess_novelty', 'propose_gap', 'rank_gaps'] },
      { id: 5, name: 'Adversarial Review', tools: ['simulate_adversarial_review', 'run_gap_review_cycle'] },
      { id: 6, name: 'Verdict & Resilience', tools: ['compute_resilience_score', 'render_verdict'] },
    ],
  },
  {
    groupId: 'stretch',
    label: 'Stretch (Advanced)',
    color: DESIGN.colors.phaseStretch,
    phases: [
      { id: 7, name: 'Cross-Domain Analogist', tools: ['find_cross_domain_analogs', 'verify_technique_match'] },
      { id: 8, name: 'Tech Parameters', tools: ['extract_technical_parameters', 'compare_technical_parameters', 'fetch_and_extract_tech_params'] },
    ],
  },
  {
    groupId: 'export',
    label: 'Output & Persistence',
    color: DESIGN.colors.phaseExport,
    phases: [
      { id: 9, name: 'Citation Management', tools: ['generate_citation', 'export_bibtex', 'manage_bibliography'] },
      { id: 10, name: 'Writing Assistance', tools: ['tone_match', 'check_ai_generic_phrasing', 'verify_meaning_preserved'] },
      { id: 11, name: 'Verification Engine', tools: ['verify_claim', 'verify_citation', 'compile_verification_summary'] },
      { id: 12, name: 'Memory Persistence', tools: ['save_session', 'load_session', 'search_knowledge_graph'] },
      { id: 13, name: 'Overleaf Integration', tools: ['create_overleaf_project', 'push_to_overleaf', 'pull_limitations_from_reviewer', 'export_overleaf_zip'] },
    ],
  },
] as const;

export const ALL_PHASES = PHASE_GROUPS.flatMap(g => g.phases);

export const TOOL_TO_PHASE: Record<string, number> = {
  // Phase 0
  search_prior_work: 0, search_prior_ai_sessions: 0,
  // Phase 1
  search_papers: 1, score_paper_relevance: 1, get_paper_metadata: 1,
  // Phase 2
  extract_paper_claims: 2, extract_paper_metadata: 2, fetch_full_text: 2,
  // Phase 3
  cluster_papers: 3, find_contradictory_claims: 3, synthesize_clusters: 3,
  // Phase 4
  assess_novelty: 4, propose_gap: 4, rank_gaps: 4,
  // Phase 5
  simulate_adversarial_review: 5, run_gap_review_cycle: 5,
  // Phase 6
  compute_resilience_score: 6, render_verdict: 6,
  // Phase 7
  find_cross_domain_analogs: 7, verify_technique_match: 7,
  // Phase 8
  extract_technical_parameters: 8, compare_technical_parameters: 8, fetch_and_extract_tech_params: 8,
  // Phase 9
  generate_citation: 9, export_bibtex: 9, manage_bibliography: 9,
  // Phase 10
  tone_match: 10, check_ai_generic_phrasing: 10, verify_meaning_preserved: 10,
  // Phase 11
  verify_claim: 11, verify_citation: 11, compile_verification_summary: 11,
  // Phase 12
  save_session: 12, load_session: 12, search_knowledge_graph: 12,
  // Phase 13
  create_overleaf_project: 13, push_to_overleaf: 13, pull_limitations_from_reviewer: 13, export_overleaf_zip: 13,
};

// Helper functions
export function getPhaseGroup(phaseId: number) {
  return PHASE_GROUPS.find(g => g.phases.some(p => p.id === phaseId));
}

export function getPhaseColor(phaseId: number) {
  const group = getPhaseGroup(phaseId);
  return group?.color || DESIGN.colors.blue;
}

export function getPhaseInfo(phaseId: number) {
  return ALL_PHASES.find(p => p.id === phaseId);
}