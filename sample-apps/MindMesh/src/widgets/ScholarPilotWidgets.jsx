'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  createContext,
  useContext,
  useRef,
  Suspense,
} from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Design Tokens — Dark Technical / Console Aesthetic
// ─────────────────────────────────────────────────────────────────────────────

const DESIGN = {
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
    blue: '#3b82f6',         // Running/in-progress
    blueBg: 'rgba(59, 130, 246, 0.12)',
    blueBorder: 'rgba(59, 130, 246, 0.3)',

    // Phase badges
    phaseCore: '#3b82f6',    // Core phases 0-6
    phaseStretch: '#a855f7', // Stretch phases 7-8
    phaseExport: '#14b8a6',  // Phase 9-13
  },

  fonts: {
    sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, monospace',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },

  radius: {
    sm: 4,
    md: 8,
    lg: 12,
  },

  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.3)',
    md: '0 4px 12px rgba(0,0,0,0.4)',
    lg: '0 8px 24px rgba(0,0,0,0.5)',
  },

  transitions: {
    fast: '120ms ease',
    normal: '200ms ease',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase & Tool Definitions
// ─────────────────────────────────────────────────────────────────────────────

export const PHASE_GROUPS = [
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
      { id: 10, name: 'Writing Assistance', tools: ['check_writing', 'tone_match', 'check_ai_generic_phrasing', 'verify_meaning_preserved'] },
      { id: 11, name: 'Verification Engine', tools: ['verify_claim', 'verify_citation', 'verify_methodology_consistency', 'compile_verification_summary', 'run_all_verifications'] },
      { id: 12, name: 'Memory Persistence', tools: ['save_session', 'load_session', 'search_knowledge_graph'] },
      { id: 13, name: 'Overleaf Export (Mode 2)', tools: ['create_overleaf_project', 'push_section_to_overleaf', 'push_limitations_from_reviewer', 'add_bibliography_to_overleaf', 'sync_session_to_overleaf'] },
    ],
  },
];

// Flattened phase list for dropdown
export const ALL_PHASES = PHASE_GROUPS.flatMap(g =>
  g.phases.map(p => ({ ...p, groupLabel: g.label, groupColor: g.color, groupId: g.groupId }))
);

// Tool → Phase mapping for reverse lookup
export const TOOL_TO_PHASE = {};
ALL_PHASES.forEach(p => {
  p.tools.forEach(t => { TOOL_TO_PHASE[t] = p.id; });
});

// ─────────────────────────────────────────────────────────────────────────────
// MCP Client Context — injectable, swappable
// ─────────────────────────────────────────────────────────────────────────────

export const MCPClientContext = createContext(null);

export function createMockMCPClient() {
  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  // Mock session store
  const sessions = new Map();
  let sessionCounter = 0;

  // Mock paper database
  const mockPapers = [
    { paperId: 'p1', title: 'Attention Is All You Need', authors: ['Vaswani', 'Shazeer', 'Parmar', 'Uszkoreit', 'Jones', 'Gomez', 'Kaiser', 'Polosukhin'], year: 2017, venue: 'NeurIPS', abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...', citationCount: 186255, quartile: 'Q3', fieldsOfStudy: ['Computer Science'], pdfUrl: '', isOpenAccess: false },
    { paperId: 'p2', title: 'BERT: Pre-training of Deep Bidirectional Transformers', authors: ['Devlin', 'Chang', 'Lee', 'Toutanova'], year: 2019, venue: 'NAACL', abstract: 'We introduce a new language representation model called BERT...', citationCount: 95000, quartile: 'Q1', fieldsOfStudy: ['Computer Science'], pdfUrl: '', isOpenAccess: true },
    { paperId: 'p3', title: 'GPT-3: Language Models are Few-Shot Learners', authors: ['Brown', 'Mann', 'Ryder', 'Subbiah', 'Kaplan', 'Dhariwal', 'Neelakantan', 'Shyam', 'Sastry', 'Askell', 'Agarwal', 'Herbert-Voss', 'Krueger', 'Henighan', 'Child', 'Ramesh', 'Ziegler', 'Wu', 'Winter', 'Hesse', 'Chen', 'Sigler', 'Litwin', 'Gray', 'Chess', 'Clark', 'Bernier', 'McCandlish', 'Radford', 'Sutskever', 'Amodei'], year: 2020, venue: 'NeurIPS', abstract: 'Recent work has demonstrated substantial gains on many NLP tasks...', citationCount: 85000, quartile: 'Q1', fieldsOfStudy: ['Computer Science'], pdfUrl: '', isOpenAccess: false },
    { paperId: 'p4', title: 'Scaling Language Models: Methods, Analysis & Insights', authors: ['Hoffmann', 'Borgeaud', 'Mensch', 'Buchatskaya', 'Cai', 'Rutherford', 'Casas', 'Glasee', 'Clark', 'Dieleman', 'Hoffmann', 'Jordan', 'Keck', 'Nematzadeh', 'Ring', 'Rudolph', 'Sifre', 'Sabol', 'Wenzel', 'Wu', 'Yogatama'], year: 2022, venue: 'arXiv', abstract: 'We study the empirical scaling laws of language models...', citationCount: 12000, quartile: 'Q2', fieldsOfStudy: ['Computer Science'], pdfUrl: '', isOpenAccess: true },
    { paperId: 'p5', title: 'LLaMA: Open and Efficient Foundation Language Models', authors: ['Touvron', 'Lavril', 'Izmard', 'Martin', 'Lachaux', 'Lacroix', 'Roziere', 'Goyal', 'Hambro', 'Azhar', 'Rodriguez', 'Joulin', 'Grave', 'Lample'], year: 2023, venue: 'arXiv', abstract: 'We introduce LLaMA, a collection of foundation language models...', citationCount: 45000, quartile: 'Q2', fieldsOfStudy: ['Computer Science'], pdfUrl: '', isOpenAccess: true },
    { paperId: 'p6', title: 'FlashAttention: Fast and Memory-Efficient Exact Attention', authors: ['Dao', 'Fu', 'Ermon', 'Rudd', 'Migrated'], year: 2022, venue: 'ICML', abstract: 'We introduce FlashAttention, an IO-aware exact attention algorithm...', citationCount: 8500, quartile: 'Q1', fieldsOfStudy: ['Computer Science'], pdfUrl: '', isOpenAccess: true },
  ];

  async function callTool(name, params) {
    await delay(300 + Math.random() * 500); // Simulate network

    // Phase 0 - Prior Work Search
    if (name === 'search_prior_work') {
      const topic = params.topic?.toLowerCase() || '';
      const filtered = mockPapers.filter(p =>
        p.title.toLowerCase().includes(topic) ||
        p.abstract?.toLowerCase().includes(topic) ||
        p.authors.some(a => a.toLowerCase().includes(topic))
      ).slice(0, params.maxPapers || 10);

      return {
        topic: params.topic,
        papers: filtered,
        repos: [],
        priorSessions: Array.from(sessions.values()).filter(s => s.topic?.toLowerCase().includes(topic)).map(s => ({
          sessionId: s.sessionId,
          topic: s.topic,
          phase: s.phase,
          updatedAt: s.updatedAt,
        })),
      };
    }

    if (name === 'search_prior_ai_sessions') {
      return Array.from(sessions.values()).map(s => ({
        sessionId: s.sessionId,
        topic: s.topic,
        phase: s.phase,
        paperCount: s.papers?.length || 0,
        updatedAt: s.updatedAt,
      }));
    }

    // Phase 1 - Paper Search
    if (name === 'search_papers') {
      return {
        query: params.query,
        count: mockPapers.length,
        papers: mockPapers.slice(0, params.limit || 10),
      };
    }

    if (name === 'get_paper_metadata') {
      const paper = mockPapers.find(p => p.paperId === params.paperId);
      if (!paper) throw new Error('Paper not found');
      return paper;
    }

    if (name === 'score_paper_relevance') {
      return { paperId: params.paperId, score: Math.floor(60 + Math.random() * 40), reasoning: 'Relevant to research question' };
    }

    // Phase 2 - Extraction
    if (name === 'extract_paper_claims') {
      return {
        paperId: params.paperId,
        claimsCount: 3,
        claims: [
          { claimId: `c1-${params.paperId}`, text: 'Transformer architecture eliminates recurrence', type: 'method', confidence: 85 },
          { claimId: `c2-${params.paperId}`, text: 'Self-attention scales quadratically with sequence length', type: 'limitation', confidence: 92 },
          { claimId: `c3-${params.paperId}`, text: 'Multi-head attention improves representation capacity', type: 'finding', confidence: 78 },
        ],
      };
    }

    if (name === 'extract_paper_metadata') {
      const paper = mockPapers.find(p => p.paperId === params.paperId);
      return paper ? { ...paper, methodologies: ['Transformer', 'Attention'], datasets: ['WMT14'], limitations: ['Quadratic complexity'] } : null;
    }

    if (name === 'fetch_full_text') {
      return { paperId: params.paperId, fullText: '[Simulated full text content...]', pdfUrl: '' };
    }

    // Phase 3 - Synthesis
    if (name === 'cluster_papers') {
      return {
        sessionId: params.sessionId,
        clusters: [
          { clusterId: 'c1', label: 'Attention Mechanisms', papers: ['p1', 'p2', 'p5'], summary: 'Core attention variants' },
          { clusterId: 'c2', label: 'Efficiency Optimizations', papers: ['p4', 'p6'], summary: 'FlashAttention, scaling laws' },
          { clusterId: 'c3', label: 'Foundation Models', papers: ['p3'], summary: 'Large-scale pre-training' },
        ],
      };
    }

    if (name === 'find_contradictory_claims') {
      return {
        sessionId: params.sessionId,
        contradictions: [
          { claimA: 'c1-p1', claimB: 'c2-p1', description: 'Attention eliminates recurrence but introduces quadratic bottleneck', severity: 'medium' },
        ],
      };
    }

    if (name === 'synthesize_clusters') {
      return {
        sessionId: params.sessionId,
        syntheses: [
          { clusterId: 'c1', narrative: 'Attention mechanisms have evolved from additive to scaled dot-product to multi-head variants, each improving parallelization and representational capacity.' },
          { clusterId: 'c2', narrative: 'Efficiency research focuses on reducing the O(n²) complexity through sparse attention, flash attention, and linear approximations.' },
        ],
        overallNarrative: 'The field centers on the tension between attention expressivity and computational efficiency.',
      };
    }

    // Phase 4 - Gap Finder
    if (name === 'assess_novelty') {
      return { noveltyScore: Math.floor(60 + Math.random() * 35), similarClaims: [] };
    }

    if (name === 'propose_gap') {
      const gaps = [
        { claim: 'Linear attention with exact equivalence to softmax for sequences >100k tokens', noveltyScore: 85, feasibility: 70, impact: 90 },
        { claim: 'Hardware-aware attention kernels that exploit tensor cores for 10x speedup', noveltyScore: 75, feasibility: 80, impact: 85 },
        { claim: 'Dynamic sparse attention patterns learned end-to-end per layer', noveltyScore: 80, feasibility: 65, impact: 80 },
      ];
      return { gap: gaps[Math.floor(Math.random() * gaps.length)], noveltyResult: { noveltyScore: 80, similarClaims: [] } };
    }

    if (name === 'rank_gaps') {
      return { rankedGaps: [
        { claim: 'Linear attention with exact equivalence', rank: 1, score: 0.82 },
        { claim: 'Hardware-aware attention kernels', rank: 2, score: 0.78 },
        { claim: 'Dynamic sparse attention patterns', rank: 3, score: 0.74 },
      ]};
    }

    // Phase 5 - Adversarial Review
    if (name === 'simulate_adversarial_review') {
      return {
        gapId: params.gapId,
        iteration: 1,
        verdict: Math.random() > 0.3 ? 'PASS' : 'OBJECTION',
        objections: ['Scalability claims need empirical validation', 'Comparison to FlashAttention-2 missing', 'Memory analysis incomplete'],
        objectionStrength: Math.floor(40 + Math.random() * 50),
        confidence: Math.floor(60 + Math.random() * 30),
      };
    }

    if (name === 'run_gap_review_cycle') {
      const iterations = Math.min(params.maxRetries || 3, 3);
      const reviews = [];
      for (let i = 0; i < iterations; i++) {
        reviews.push({
          iteration: i + 1,
          verdict: i === iterations - 1 ? 'PASS' : 'OBJECTION',
          objections: ['Validation needed', 'Baselines incomplete'],
        });
      }
      return { topic: params.topic, gap: { claim: 'Final refined gap claim', noveltyScore: 82 }, reviews, passed: true };
    }

    // Phase 6 - Verdict
    if (name === 'compute_resilience_score') {
      return { gapId: params.gapId, resilienceScore: Math.floor(60 + Math.random() * 30), breakdown: { objectionStrength: 45, recencyPenalty: 5, citationDensity: 8 } };
    }

    if (name === 'render_verdict') {
      const score = Math.floor(60 + Math.random() * 30);
      return { gapId: params.gapId, finalVerdict: score >= 75 ? 'PASS' : score >= 55 ? 'CONDITIONAL' : 'REJECT', resilienceScore: score, reasoning: 'Moderate resilience. Objections addressable with additional experiments.' };
    }

    // Phase 9 - Citations
    if (name === 'generate_citation') {
      return { citation: '[1] Vaswani et al., "Attention Is All You Need", NeurIPS 2017.', style: params.style };
    }

    if (name === 'export_bibtex') {
      return { bibtex: '@article{vaswani2017attention,\n  title={Attention is all you need},\n  author={Vaswani, Ashish and others},\n  journal={NeurIPS},\n  year={2017}\n}' };
    }

    if (name === 'manage_bibliography') {
      return { action: params.action, paperIds: params.paperIds, success: true };
    }

    // Phase 10 - Writing
    if (name === 'check_writing') {
      return {
        section: params.section,
        tone: { score: 78, feedback: 'Good academic tone, minor hedging detected' },
        aiGeneric: { flags: ['In this paper, we explore...'], score: 65 },
        clarity: { score: 82, suggestions: ['Define "attention mechanism" on first use'] },
      };
    }

    // Phase 11 - Verification
    if (name === 'verify_claim') {
      return { claimId: params.claimId, verified: true, confidence: 88, evidence: ['Extracted from paper abstract', 'Consistent with methodology section'] };
    }

    if (name === 'verify_citation') {
      return { paperId: params.paperId, accurate: true, issues: [] };
    }

    if (name === 'run_all_verifications') {
      return { sessionId: params.sessionId, summary: { total: 12, passed: 10, failed: 2, warnings: 1 } };
    }

    // Phase 12 - Memory
    if (name === 'save_session') {
      const id = params.sessionId || `sess_${++sessionCounter}`;
      sessions.set(id, { ...params, sessionId: id, updatedAt: new Date().toISOString() });
      return { sessionId: id, saved: true };
    }

    if (name === 'load_session') {
      const session = sessions.get(params.sessionId);
      return session || { error: 'Not found' };
    }

    if (name === 'search_knowledge_graph') {
      return { entities: ['Transformer', 'Attention', 'BERT'], relations: [] };
    }

    // Phase 13 - Overleaf
    if (name === 'create_overleaf_project') {
      const projectId = `proj_${Date.now()}`;
      return { projectId, projectPath: `/tmp/${projectId}`, title: params.title, authors: params.authors, template: params.template, sectionsInitialized: 0 };
    }

    if (name === 'push_section_to_overleaf') {
      return { section: params.section, pushed: true, contentLength: params.content?.length || 0 };
    }

    if (name === 'push_limitations_from_reviewer') {
      return { objectionsCount: params.objections?.length || 0, pushed: true };
    }

    if (name === 'add_bibliography_to_overleaf') {
      return { entriesAdded: (params.bibtex?.match(/@/g) || []).length, pushed: true };
    }

    if (name === 'sync_session_to_overleaf') {
      return { sessionId: params.sessionId, projectCreated: true, sectionsSynced: 9, hasBibliography: true, hasLimitations: true };
    }

    // export_overleaf_zip is disabled
    if (name === 'export_overleaf_zip') {
      throw new Error('Tool disabled: archiver ESM/CJS incompatibility');
    }

    return { error: `Unknown tool: ${name}`, mock: true };
  }

  return { callTool };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Components
// ─────────────────────────────────────────────────────────────────────────────

const Mono = ({ children, className, style, ...props }) => (
  <code className={className} style={{ fontFamily: DESIGN.fonts.mono, fontSize: 11, ...style }} {...props}>
    {children}
  </code>
);

const Badge = ({ children, variant = 'default', style, ...props }) => {
  const variants = {
    default: { bg: DESIGN.colors.bgHover, color: DESIGN.colors.fgMuted, border: DESIGN.colors.border },
    amber: { bg: DESIGN.colors.amberBg, color: DESIGN.colors.amber, border: DESIGN.colors.amberBorder },
    green: { bg: DESIGN.colors.greenBg, color: DESIGN.colors.green, border: DESIGN.colors.greenBorder },
    red: { bg: DESIGN.colors.redBg, color: DESIGN.colors.red, border: DESIGN.colors.redBorder },
    blue: { bg: DESIGN.colors.blueBg, color: DESIGN.colors.blue, border: DESIGN.colors.blueBorder },
    phaseCore: { bg: 'rgba(59, 130, 246, 0.15)', color: DESIGN.colors.phaseCore, border: 'rgba(59, 130, 246, 0.3)' },
    phaseStretch: { bg: 'rgba(168, 85, 247, 0.15)', color: DESIGN.colors.phaseStretch, border: 'rgba(168, 85, 247, 0.3)' },
    phaseExport: { bg: 'rgba(20, 184, 166, 0.15)', color: DESIGN.colors.phaseExport, border: 'rgba(20, 184, 166, 0.3)' },
  };
  const v = variants[variant] || variants.default;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        fontSize: 10,
        fontWeight: 600,
        fontFamily: DESIGN.fonts.mono,
        borderRadius: DESIGN.radius.sm,
        backgroundColor: v.bg,
        color: v.color,
        border: `1px solid ${v.border}`,
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  );
};

const Button = ({ children, variant = 'secondary', onClick, disabled, style, className, ...props }) => {
  const variants = {
    primary: { bg: DESIGN.colors.amber, color: DESIGN.colors.bg, border: 'none', hover: DESIGN.colors.amberDim },
    secondary: { bg: DESIGN.colors.bgHover, color: DESIGN.colors.fg, border: DESIGN.colors.border, hover: DESIGN.colors.bgActive },
    ghost: { bg: 'transparent', color: DESIGN.colors.fgMuted, border: 'none', hover: DESIGN.colors.bgHover },
    danger: { bg: DESIGN.colors.redBg, color: DESIGN.colors.red, border: DESIGN.colors.redBorder, hover: DESIGN.colors.red },
  };
  const v = variants[variant] || variants.secondary;
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: DESIGN.spacing.xs,
        padding: `${DESIGN.spacing.xs}px ${DESIGN.spacing.md}px`,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: DESIGN.fonts.sans,
        borderRadius: DESIGN.radius.md,
        backgroundColor: disabled ? DESIGN.colors.bgHover : (hovered ? v.hover : v.bg),
        color: disabled ? DESIGN.colors.fgDim : v.color,
        border: `1px solid ${disabled ? DESIGN.colors.border : v.border}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: `background-color ${DESIGN.transitions.fast}, border-color ${DESIGN.transitions.fast}, color ${DESIGN.transitions.fast}`,
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ value, onChange, placeholder, style, ...props }) => (
  <input
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    style={{
      width: '100%',
      padding: `${DESIGN.spacing.xs}px ${DESIGN.spacing.md}px`,
      fontSize: 13,
      fontFamily: DESIGN.fonts.sans,
      backgroundColor: DESIGN.colors.bg,
      color: DESIGN.colors.fg,
      border: `1px solid ${DESIGN.colors.border}`,
      borderRadius: DESIGN.radius.md,
      outline: 'none',
      transition: `border-color ${DESIGN.transitions.fast}, box-shadow ${DESIGN.transitions.fast}`,
      boxSizing: 'border-box',
      ...style,
    }}
    onFocus={e => e.target.style.borderColor = DESIGN.colors.amber}
    onBlur={e => e.target.style.borderColor = DESIGN.colors.border}
    {...props}
  />
);

const Select = ({ value, onChange, options, placeholder, style, ...props }) => (
  <select
    value={value}
    onChange={onChange}
    style={{
      width: '100%',
      padding: `${DESIGN.spacing.xs}px ${DESIGN.spacing.md}px`,
      fontSize: 13,
      fontFamily: DESIGN.fonts.sans,
      backgroundColor: DESIGN.colors.bg,
      color: DESIGN.colors.fg,
      border: `1px solid ${DESIGN.colors.border}`,
      borderRadius: DESIGN.radius.md,
      outline: 'none',
      cursor: 'pointer',
      appearance: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b98a8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 8px center',
      paddingRight: 32,
      ...style,
    }}
    onFocus={e => e.target.style.borderColor = DESIGN.colors.amber}
    onBlur={e => e.target.style.borderColor = DESIGN.colors.border}
    {...props}
  >
    {placeholder && <option value="" disabled>{placeholder}</option>}
    {options.map(opt => (
      <option key={opt.value} value={opt.value} style={{ background: DESIGN.colors.bg, color: DESIGN.colors.fg }}>
        {opt.label}
      </option>
    ))}
  </select>
);

const Card = ({ children, style, className, ...props }) => (
  <div
    style={{
      backgroundColor: DESIGN.colors.bgElevated,
      border: `1px solid ${DESIGN.colors.border}`,
      borderRadius: DESIGN.radius.lg,
      padding: DESIGN.spacing.lg,
      ...style,
    }}
    className={className}
    {...props}
  >
    {children}
  </div>
);

const Panel = ({ children, style, className, ...props }) => (
  <div
    style={{
      backgroundColor: DESIGN.colors.bgElevated,
      border: `1px solid ${DESIGN.colors.border}`,
      borderRadius: DESIGN.radius.lg,
      ...style,
    }}
    className={className}
    {...props}
  >
    {children}
  </div>
);

const ScrollArea = ({ children, style, className, ...props }) => (
  <div
    style={{
      overflow: 'auto',
      ...style,
    }}
    className={className}
    {...props}
  >
    {children}
  </div>
);

const Divider = ({ style, ...props }) => (
  <hr style={{ border: 'none', borderTop: `1px solid ${DESIGN.colors.border}`, margin: `${DESIGN.spacing.md}px 0`, ...style }} {...props} />
);

const Tooltip = ({ content, children, position = 'top' }) => {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  return (
    <span
      ref={ref}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      {children}
      {visible && (
        <div
          style={{
            position: 'absolute',
            [position === 'top' ? 'bottom' : 'top']: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: position === 'top' ? 6 : 0,
            marginBottom: position === 'bottom' ? 6 : 0,
            padding: `${DESIGN.spacing.xs}px ${DESIGN.spacing.sm}px`,
            fontSize: 11,
            fontFamily: DESIGN.fonts.sans,
            backgroundColor: DESIGN.colors.bg,
            color: DESIGN.colors.fg,
            border: `1px solid ${DESIGN.colors.borderBright}`,
            borderRadius: DESIGN.radius.sm,
            whiteSpace: 'nowrap',
            zIndex: 1000,
            boxShadow: DESIGN.shadows.md,
          }}
        >
          {content}
        </div>
      )}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. CHAT HISTORY SIDEBAR — Session Directory
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function SessionItem({ session, onSelect, selected, mcpClient }) {
  const phaseInfo = ALL_PHASES.find(p => p.id === session.phase) || { name: 'Unknown', groupColor: DESIGN.colors.fgMuted };

  return (
    <div
      onClick={() => onSelect(session)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: DESIGN.spacing.xs,
        padding: DESIGN.spacing.md,
        backgroundColor: selected ? DESIGN.colors.bgActive : 'transparent',
        border: `1px solid ${selected ? DESIGN.colors.amberBorder : DESIGN.colors.border}`,
        borderRadius: DESIGN.radius.md,
        cursor: 'pointer',
        transition: `all ${DESIGN.transitions.fast}`,
      }}
      onMouseEnter={e => !selected && (e.currentTarget.style.backgroundColor = DESIGN.colors.bgHover, e.currentTarget.style.borderColor = DESIGN.colors.borderBright)}
      onMouseLeave={e => !selected && (e.currentTarget.style.backgroundColor = 'transparent', e.currentTarget.style.borderColor = DESIGN.colors.border)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: DESIGN.spacing.sm }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: DESIGN.colors.fg, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {session.topic || 'Untitled Session'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN.spacing.xs, marginTop: 2 }}>
            <Badge variant={phaseInfo.groupId === 'stretch' ? 'phaseStretch' : phaseInfo.groupId === 'export' ? 'phaseExport' : 'phaseCore'}>
              P{phaseInfo.id}
            </Badge>
            <span style={{ fontSize: 11, color: DESIGN.colors.fgDim, fontFamily: DESIGN.fonts.mono }}>
              {session.paperCount || 0} papers
            </span>
          </div>
        </div>
        <Mono style={{ color: DESIGN.colors.fgDim, whiteSpace: 'nowrap' }}>
          {session.sessionId?.slice(0, 12)}
        </Mono>
      </div>
      <div style={{ fontSize: 11, color: DESIGN.colors.fgDim, fontFamily: DESIGN.fonts.mono }}>
        {formatDate(session.updatedAt || session.createdAt)}
      </div>
    </div>
  );
}

function SessionGroup({ dateLabel, sessions, onSelect, selectedSessionId, mcpClient }) {
  return (
    <div style={{ marginBottom: DESIGN.spacing.lg }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: DESIGN.colors.fgDim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: DESIGN.spacing.sm, fontFamily: DESIGN.fonts.mono }}>
        {dateLabel}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN.spacing.xs }}>
        {sessions.map(s => (
          <SessionItem key={s.sessionId} session={s} onSelect={onSelect} selected={s.sessionId === selectedSessionId} mcpClient={mcpClient} />
        ))}
      </div>
    </div>
  );
}

export function ChatHistorySidebar({
  mcpClient = createMockMCPClient(),
  selectedSessionId,
  onSessionSelect,
  onNewSession,
  style,
  className,
}) {
  const [sessions, setSessions] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState({});

  useEffect(() => {
    loadSessions();
  }, [mcpClient]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      // Try to load from memory first
      const result = await mcpClient.callTool('search_prior_ai_sessions', {});
      if (result && Array.isArray(result)) {
        setSessions(result);
      } else {
        // Fallback mock data
        setSessions([
          { sessionId: 'sess_1', topic: 'Efficient Attention Mechanisms', phase: 5, paperCount: 12, updatedAt: new Date(Date.now() - 2*3600*1000).toISOString() },
          { sessionId: 'sess_2', topic: 'Transformer Scaling Laws', phase: 3, paperCount: 8, updatedAt: new Date(Date.now() - 24*3600*1000).toISOString() },
          { sessionId: 'sess_3', topic: 'Cross-Domain Analogies in ML', phase: 7, paperCount: 15, updatedAt: new Date(Date.now() - 48*3600*1000).toISOString() },
          { sessionId: 'sess_4', topic: 'Sparse Attention Patterns', phase: 4, paperCount: 6, updatedAt: new Date(Date.now() - 72*3600*1000).toISOString() },
          { sessionId: 'sess_5', topic: 'BERT Fine-tuning Strategies', phase: 2, paperCount: 10, updatedAt: new Date(Date.now() - 5*24*3600*1000).toISOString() },
        ]);
      }
    } catch (e) {
      console.warn('Session load failed:', e);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  // Group sessions by date
  const grouped = useMemo(() => {
    const filtered = sessions.filter(s =>
      s.topic?.toLowerCase().includes(filter.toLowerCase()) ||
      s.sessionId?.toLowerCase().includes(filter.toLowerCase())
    );

    const groups = {};
    filtered.forEach(s => {
      const date = new Date(s.updatedAt || s.createdAt).toDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(s);
    });
    return groups;
  }, [sessions, filter]);

  const sortedDates = useMemo(() =>
    Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a)),
  [grouped]);

  return (
    <div
      style={{
        width: 320,
        height: '100%',
        backgroundColor: DESIGN.colors.bg,
        borderRight: `1px solid ${DESIGN.colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        ...style,
      }}
      className={className}
    >
      {/* Header */}
      <div style={{
        padding: DESIGN.spacing.lg,
        borderBottom: `1px solid ${DESIGN.colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: DESIGN.spacing.sm,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN.spacing.sm }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: DESIGN.colors.fg }}>Sessions</span>
          <Badge variant="amber" style={{ fontSize: 9 }}>{sessions.length}</Badge>
        </div>
        <Button variant="ghost" onClick={loadSessions} disabled={loading} style={{ padding: '4px 8px' }}>
          ↻
        </Button>
      </div>

      {/* Filter */}
      <div style={{ padding: DESIGN.spacing.md }}>
        <Input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter by topic..."
          style={{ width: '100%' }}
        />
      </div>

      {/* Session List */}
      <ScrollArea style={{ flex: 1, padding: '0 12px 12px' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: DESIGN.colors.fgDim }}>
            Loading sessions...
          </div>
        ) : sortedDates.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: DESIGN.colors.fgDim, textAlign: 'center', padding: DESIGN.spacing.lg }}>
            No sessions found. Start a new research session.
          </div>
        ) : (
          <>
            {sortedDates.map(date => (
              <SessionGroup
                key={date}
                dateLabel={date}
                sessions={grouped[date]}
                onSelect={onSessionSelect}
                selectedSessionId={selectedSessionId}
                mcpClient={mcpClient}
              />
            ))}
          </>
        )}
      </ScrollArea>

      {/* New Session Button */}
      <div style={{ padding: DESIGN.spacing.md, borderTop: `1px solid ${DESIGN.colors.border}` }}>
        <Button
          variant="primary"
          onClick={onNewSession}
          style={{ width: '100%', padding: `${DESIGN.spacing.sm}px` }}
        >
          + New Session
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PHASE SEARCH BAR — Title Search + Phase Dropdown
// ─────────────────────────────────────────────────────────────────────────────

function PhaseOption({ phase, selected, onSelect, mcpClient }) {
  const isSelected = selected === phase.id;
  return (
    <div
      onClick={() => onSelect(phase.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: DESIGN.spacing.sm,
        padding: `${DESIGN.spacing.xs}px ${DESIGN.spacing.sm}px`,
        borderRadius: DESIGN.radius.sm,
        backgroundColor: isSelected ? DESIGN.colors.bgActive : 'transparent',
        color: DESIGN.colors.fg,
        cursor: 'pointer',
        transition: `background-color ${DESIGN.transitions.fast}`,
      }}
      onMouseEnter={e => !isSelected && (e.currentTarget.style.backgroundColor = DESIGN.colors.bgHover)}
      onMouseLeave={e => !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <Badge
        variant={phase.groupId === 'stretch' ? 'phaseStretch' : phase.groupId === 'export' ? 'phaseExport' : 'phaseCore'}
        style={{ minWidth: 36, textAlign: 'center', fontSize: 9 }}
      >
        P{phase.id}
      </Badge>
      <span style={{ fontSize: 12, flex: 1 }}>{phase.name}</span>
      <Mono style={{ color: DESIGN.colors.fgDim, fontSize: 10 }}>
        {phase.tools.length} tools
      </Mono>
    </div>
  );
}

function PhaseDropdown({ value, onChange, triggerRef, open, mcpClient }) {
  if (!open) return null;

  return (
    <div
      ref={triggerRef}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: 4,
        backgroundColor: DESIGN.colors.bgElevated,
        border: `1px solid ${DESIGN.colors.borderBright}`,
        borderRadius: DESIGN.radius.md,
        boxShadow: DESIGN.shadows.lg,
        zIndex: 100,
        overflow: 'hidden',
        maxHeight: 400,
        overflowY: 'auto',
      }}
    >
      {PHASE_GROUPS.map(group => (
        <div key={group.groupId} style={{ borderBottom: `1px solid ${DESIGN.colors.border}` }}>
          <div style={{
            padding: `${DESIGN.spacing.xs}px ${DESIGN.spacing.sm}px`,
            fontSize: 10,
            fontWeight: 700,
            color: group.color,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            fontFamily: DESIGN.fonts.mono,
            backgroundColor: DESIGN.colors.bg,
            borderBottom: `1px solid ${DESIGN.colors.border}`,
          }}>
            {group.label}
          </div>
          {group.phases.map(phase => (
            <PhaseOption key={phase.id} phase={phase} selected={value} onSelect={onChange} mcpClient={mcpClient} />
          ))}
        </div>
      ))}
    </div>
  );
}

function ResultCard({ paper, selected, onSelect, mcpClient }) {
  // Color-code relevance score if present
  const score = paper.relevanceScore ?? paper.score;
  let scoreColor = DESIGN.colors.fgMuted;
  let scoreBg = DESIGN.colors.bgHover;
  if (typeof score === 'number') {
    if (score >= 80) { scoreColor = DESIGN.colors.green; scoreBg = DESIGN.colors.greenBg; }
    else if (score >= 60) { scoreColor = DESIGN.colors.amber; scoreBg = DESIGN.colors.amberBg; }
    else { scoreColor = DESIGN.colors.red; scoreBg = DESIGN.colors.redBg; }
  }

  const year = paper.year?.toString() || '—';

  return (
    <div
      onClick={() => onSelect?.(paper)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: DESIGN.spacing.xs,
        padding: DESIGN.spacing.md,
        backgroundColor: selected ? DESIGN.colors.bgActive : DESIGN.colors.bgElevated,
        border: `1px solid ${selected ? DESIGN.colors.amberBorder : DESIGN.colors.border}`,
        borderRadius: DESIGN.radius.md,
        cursor: onSelect ? 'pointer' : 'default',
        transition: `all ${DESIGN.transitions.fast}`,
      }}
      onMouseEnter={e => !selected && (e.currentTarget.style.backgroundColor = DESIGN.colors.bgHover, e.currentTarget.style.borderColor = DESIGN.colors.borderBright)}
      onMouseLeave={e => !selected && (e.currentTarget.style.backgroundColor = DESIGN.colors.bgElevated, e.currentTarget.style.borderColor = DESIGN.colors.border)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: DESIGN.spacing.sm }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: DESIGN.colors.fg, lineHeight: 1.4, marginBottom: 4 }}>
            {paper.title}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: DESIGN.spacing.xs, fontSize: 11, color: DESIGN.colors.fgDim, fontFamily: DESIGN.fonts.mono }}>
            <span>{paper.venue}</span>
            <span>•</span>
            <span>{year}</span>
            {paper.quartile && (
              <>
                <span>•</span>
                <Badge variant={paper.quartile === 'Q1' ? 'green' : paper.quartile === 'Q2' ? 'blue' : paper.quartile === 'Q3' ? 'amber' : 'default'} style={{ fontSize: 9 }}>
                  {paper.quartile}
                </Badge>
              </>
            )}
            {paper.citationCount && (
              <>
                <span>•</span>
                <span>{paper.citationCount.toLocaleString()} citations</span>
              </>
            )}
          </div>
        </div>
        {typeof score === 'number' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            <Badge variant={score >= 80 ? 'green' : score >= 60 ? 'amber' : 'red'} style={{ fontSize: 10, fontWeight: 700 }}>
              {score}%
            </Badge>
            <Mono style={{ color: DESIGN.colors.fgDim }}>relevance</Mono>
          </div>
        )}
      </div>

      {paper.abstract && (
        <div style={{ fontSize: 12, color: DESIGN.colors.fgMuted, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {paper.abstract}
        </div>
      )}

      {paper.authors && paper.authors.length > 0 && (
        <div style={{ fontSize: 11, color: DESIGN.colors.fgDim, display: 'flex', flexWrap: 'wrap', gap: DESIGN.spacing.xs }}>
          {paper.authors.slice(0, 3).map((a, i) => (
            <span key={i} style={{ fontFamily: DESIGN.fonts.mono }}>{a}{i < paper.authors.length - 1 && i < 2 ? ',' : ''}</span>
          ))}
          {paper.authors.length > 3 && <span style={{ fontFamily: DESIGN.fonts.mono }}>+{paper.authors.length - 3} more</span>}
        </div>
      )}
    </div>
  );
}

function ResultsList({ papers, selectedPaperId, onSelectPaper, phase, mcpClient, loading }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: DESIGN.spacing.xxl, color: DESIGN.colors.fgDim }}>
        Searching...
      </div>
    );
  }

  if (!papers || papers.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: DESIGN.spacing.xxl, color: DESIGN.colors.fgDim, textAlign: 'center' }}>
        No results found. Try a different query or phase.
      </div>
    );
  }

  return (
    <ScrollArea style={{ flex: 1, padding: '0 4px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN.spacing.sm }}>
        {papers.slice(0, 20).map(paper => (
          <ResultCard
            key={paper.paperId}
            paper={paper}
            selected={paper.paperId === selectedPaperId}
            onSelect={onSelectPaper}
            mcpClient={mcpClient}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

export function PhaseSearchBar({
  mcpClient = createMockMCPClient(),
  selectedPhase = 1,
  onPhaseChange,
  selectedPaperId,
  onPaperSelect,
  placeholder = 'Search papers by title, topic, or author...',
  style,
  className,
}) {
  const [query, setQuery] = useState('');
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const search = useCallback(async () => {
    if (!query.trim()) { setPapers([]); return; }

    setLoading(true);
    setError(null);

    try {
      // Determine which tool to call based on selected phase
      const phaseInfo = ALL_PHASES.find(p => p.id === selectedPhase) || ALL_PHASES[1];
      const primaryTool = phaseInfo.tools[0];

      let result;
      if (primaryTool === 'search_prior_work') {
        result = await mcpClient.callTool(primaryTool, { topic: query, maxPapers: 20 });
        setPapers(result.papers || []);
      } else if (primaryTool === 'search_papers') {
        result = await mcpClient.callTool(primaryTool, { query, limit: 20 });
        setPapers(result.papers || []);
      } else {
        // For other phases, we might search then apply the phase tool
        result = await mcpClient.callTool('search_papers', { query, limit: 20 });
        setPapers(result.papers || []);
      }
    } catch (e) {
      setError(e.message);
      console.error('Search error:', e);
    } finally {
      setLoading(false);
    }
  }, [query, selectedPhase, mcpClient]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handlePhaseSelect = useCallback((phaseId) => {
    onPhaseChange?.(phaseId);
    setDropdownOpen(false);
  }, [onPhaseChange]);

  const currentPhase = ALL_PHASES.find(p => p.id === selectedPhase) || ALL_PHASES[1];

  return (
    <div ref={triggerRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: DESIGN.spacing.md, ...style }} className={className}>
      {/* Search Input + Phase Dropdown */}
      <div style={{ display: 'flex', gap: DESIGN.spacing.sm, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={placeholder}
            onKeyDown={e => e.key === 'Enter' && search()}
            style={{ width: '100%' }}
          />
          {dropdownOpen && <PhaseDropdown
            value={selectedPhase}
            onChange={handlePhaseSelect}
            triggerRef={dropdownRef}
            open={dropdownOpen}
            mcpClient={mcpClient}
          />}
        </div>

        <div style={{ position: 'relative' }}>
          <Button
            variant="secondary"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{ minWidth: 140, padding: '8px 12px', whiteSpace: 'nowrap' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: DESIGN.spacing.xs }}>
              <Badge
                variant={currentPhase.groupId === 'stretch' ? 'phaseStretch' : currentPhase.groupId === 'export' ? 'phaseExport' : 'phaseCore'}
                style={{ fontSize: 10, minWidth: 28, textAlign: 'center' }}
              >
                P{currentPhase.id}
              </Badge>
              <span style={{ fontSize: 12, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentPhase.name}
              </span>
            </span>
            <Mono style={{ marginLeft: DESIGN.spacing.xs }}>▼</Mono>
          </Button>
          {dropdownOpen && <PhaseDropdown
            value={selectedPhase}
            onChange={handlePhaseSelect}
            triggerRef={dropdownRef}
            open={dropdownOpen}
            mcpClient={mcpClient}
          />}
        </div>

        <Button variant="primary" onClick={search} disabled={loading || !query.trim()} style={{ minWidth: 80 }}>
          {loading ? '⟳' : 'Search'}
        </Button>
      </div>

      {error && (
        <div style={{ padding: DESIGN.spacing.sm, backgroundColor: DESIGN.colors.redBg, border: `1px solid ${DESIGN.colors.redBorder}`, borderRadius: DESIGN.radius.md, color: DESIGN.colors.red, fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* Results */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <ResultsList
          papers={papers}
          selectedPaperId={selectedPaperId}
          onSelectPaper={onPaperSelect}
          phase={currentPhase}
          mcpClient={mcpClient}
          loading={loading}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. OVERLEAF FLOW BUTTON — Decoupled Phase 13 Chain
// ─────────────────────────────────────────────────────────────────────────────

const OVERLEAF_STEPS = [
  { id: 'create', label: 'Create Project', tool: 'create_overleaf_project', description: 'Initialize IEEE template repo' },
  { id: 'sections', label: 'Push Sections', tool: 'push_section_to_overleaf', description: 'Write all 9 section files', multi: true },
  { id: 'limitations', label: 'Push Limitations', tool: 'push_limitations_from_reviewer', description: 'Auto-generate from review objections' },
  { id: 'bibliography', label: 'Add Bibliography', tool: 'add_bibliography_to_overleaf', description: 'Write BibTeX to references.bib' },
  { id: 'sync', label: 'Final Sync', tool: 'sync_session_to_overleaf', description: 'Commit & push all changes' },
];

function StepBadge({ step, status }) {
  const variants = {
    pending: { bg: DESIGN.colors.bgHover, color: DESIGN.colors.fgDim, border: DESIGN.colors.border },
    running: { bg: DESIGN.colors.blueBg, color: DESIGN.colors.blue, border: DESIGN.colors.blueBorder },
    done: { bg: DESIGN.colors.greenBg, color: DESIGN.colors.green, border: DESIGN.colors.greenBorder },
    error: { bg: DESIGN.colors.redBg, color: DESIGN.colors.red, border: DESIGN.colors.redBorder },
  };
  const v = variants[status] || variants.pending;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: v.bg,
        border: `2px solid ${v.border}`,
        color: v.color,
        fontSize: 12,
        fontWeight: 700,
        fontFamily: DESIGN.fonts.mono,
        transition: `all ${DESIGN.transitions.normal}`,
      }}>
        {status === 'pending' && '○'}
        {status === 'running' && (
          <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round" />
          </svg>
        )}
        {status === 'done' && '✓'}
        {status === 'error' && '✗'}
      </div>
      <Mono style={{ fontSize: 9, color: DESIGN.colors.fgDim, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 80 }}>
        {step.label}
      </Mono>
    </div>
  );
}

function StepConnector({ status }) {
  return (
    <div style={{
      flex: 1,
      height: 2,
      marginTop: 15,
      backgroundColor: status === 'done' ? DESIGN.colors.green : DESIGN.colors.border,
      borderRadius: 1,
      transition: `background-color ${DESIGN.transitions.normal}`,
    }} />
  );
}

function StatusPopover({ steps, open, onClose, anchorRef }) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: DESIGN.colors.bgElevated,
          border: `1px solid ${DESIGN.colors.borderBright}`,
          borderRadius: DESIGN.radius.lg,
          padding: DESIGN.spacing.lg,
          minWidth: 380,
          maxWidth: 480,
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: DESIGN.shadows.lg,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: DESIGN.spacing.lg }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: DESIGN.colors.fg }}>Overleaf Export Pipeline</div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: DESIGN.spacing.md }}>
          {OVERLEAF_STEPS.map((step, i) => (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: DESIGN.spacing.md, padding: DESIGN.spacing.sm, backgroundColor: DESIGN.colors.bg, borderRadius: DESIGN.radius.md }}>
              <StepBadge step={step} status={steps[step.id]?.status || 'pending'} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: DESIGN.colors.fg }}>{step.label}</div>
                <div style={{ fontSize: 11, color: DESIGN.colors.fgDim, marginTop: 2, fontFamily: DESIGN.fonts.mono }}>
                  {step.tool}
                </div>
                <div style={{ fontSize: 11, color: DESIGN.colors.fgMuted, marginTop: 2 }}>{step.description}</div>
                {steps[step.id]?.error && (
                  <div style={{ fontSize: 11, color: DESIGN.colors.red, marginTop: 4, fontFamily: DESIGN.fonts.mono }}>
                    Error: {steps[step.id].error}
                  </div>
                )}
                {steps[step.id]?.result && (
                  <div style={{ fontSize: 10, color: DESIGN.colors.green, marginTop: 4, fontFamily: DESIGN.fonts.mono }}>
                    {JSON.stringify(steps[step.id].result).slice(0, 120)}...
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {steps.sync?.status === 'done' && (
          <div style={{ marginTop: DESIGN.spacing.lg, padding: DESIGN.spacing.md, backgroundColor: DESIGN.colors.greenBg, border: `1px solid ${DESIGN.colors.greenBorder}`, borderRadius: DESIGN.radius.md, color: DESIGN.colors.green, fontSize: 12 }}>
            ✓ Export complete! Project pushed to Overleaf Git remote.
          </div>
        )}

        {steps.sync?.status === 'error' && (
          <div style={{ marginTop: DESIGN.spacing.lg, padding: DESIGN.spacing.md, backgroundColor: DESIGN.colors.redBg, border: `1px solid ${DESIGN.colors.redBorder}`, borderRadius: DESIGN.radius.md, color: DESIGN.colors.red, fontSize: 12 }}>
            ✗ Export failed: {steps.sync.error}
          </div>
        )}
      </div>
    </div>
  );
}

export function OverleafFlowButton({
  mcpClient = createMockMCPClient(),
  sessionId,
  paperTitle = 'Research Paper',
  paperAuthors = ['Author'],
  paperTemplate = 'ieee',
  reviewObjections = [],
  bibliographyBibtex = '',
  sections = {},
  style,
  className,
}) {
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState({});
  const [popoverOpen, setPopoverOpen] = useState(false);
  const buttonRef = useRef(null);

  const resetSteps = useCallback(() => {
    setSteps(OVERLEAF_STEPS.reduce((acc, s) => ({ ...acc, [s.id]: { status: 'pending' }}), {}));
  }, []);

  useEffect(() => { resetSteps(); }, [resetSteps]);

  const executePipeline = useCallback(async () => {
    if (running || !sessionId) return;

    setRunning(true);
    setPopoverOpen(true);
    resetSteps();

    const updateStep = (id, status, data = {}) => {
      setSteps(prev => ({ ...prev, [id]: { ...prev[id], status, ...data } }));
    };

    try {
      // Step 1: Create project
      updateStep('create', 'running');
      const project = await mcpClient.callTool('create_overleaf_project', {
        title: paperTitle,
        authors: paperAuthors,
        template: paperTemplate,
        sessionId,
      });
      updateStep('create', 'done', { result: project });

      // Step 2: Push sections (sequential)
      updateStep('sections', 'running');
      const sectionOrder = ['abstract', 'introduction', 'related-work', 'methodology', 'experiments', 'results', 'discussion', 'limitations', 'conclusion'];
      for (const section of sectionOrder) {
        if (sections[section]) {
          await mcpClient.callTool('push_section_to_overleaf', {
            section,
            content: sections[section],
            sessionId,
          });
        }
      }
      updateStep('sections', 'done');

      // Step 3: Push limitations
      if (reviewObjections.length > 0) {
        updateStep('limitations', 'running');
        await mcpClient.callTool('push_limitations_from_reviewer', {
          objections: reviewObjections,
          sessionId,
        });
        updateStep('limitations', 'done');
      } else {
        updateStep('limitations', 'done', { result: { skipped: true, reason: 'No objections provided' } });
      }

      // Step 4: Add bibliography
      if (bibliographyBibtex) {
        updateStep('bibliography', 'running');
        await mcpClient.callTool('add_bibliography_to_overleaf', {
          bibtex: bibliographyBibtex,
          sessionId,
        });
        updateStep('bibliography', 'done');
      } else {
        updateStep('bibliography', 'done', { result: { skipped: true, reason: 'No bibliography provided' } });
      }

      // Step 5: Final sync
      updateStep('sync', 'running');
      const syncResult = await mcpClient.callTool('sync_session_to_overleaf', {
        sessionId,
        createIfMissing: false,
      });
      updateStep('sync', 'done', { result: syncResult });

    } catch (error) {
      console.error('Overleaf pipeline error:', error);
      // Find first non-done step and mark error
      const stepIds = OVERLEAF_STEPS.map(s => s.id);
      for (const id of stepIds) {
        if (steps[id]?.status === 'running' || steps[id]?.status === 'pending') {
          updateStep(id, 'error', { error: error.message || String(error) });
          break;
        }
      }
    } finally {
      setRunning(false);
    }
  }, [running, sessionId, mcpClient, paperTitle, paperAuthors, paperTemplate, reviewObjections, bibliographyBibtex, sections, steps, resetSteps]);

  const overallStatus = useMemo(() => {
    if (running) return 'running';
    const statuses = OVERLEAF_STEPS.map(s => steps[s.id]?.status || 'pending');
    if (statuses.every(s => s === 'done')) return 'done';
    if (statuses.some(s => s === 'error')) return 'error';
    if (statuses.some(s => s === 'running')) return 'running';
    return 'pending';
  }, [running, steps]);

  return (
    <div style={{ position: 'relative', ...style }} className={className}>
      <Button
        ref={buttonRef}
        variant={overallStatus === 'done' ? 'primary' : overallStatus === 'error' ? 'danger' : 'secondary'}
        onClick={executePipeline}
        disabled={running || !sessionId}
        style={{
          minWidth: 180,
          padding: `${DESIGN.spacing.sm}px ${DESIGN.spacing.lg}px`,
          backgroundColor: overallStatus === 'done' ? DESIGN.colors.green : overallStatus === 'error' ? DESIGN.colors.redBg : DESIGN.colors.amber,
          color: overallStatus === 'done' ? DESIGN.colors.bg : overallStatus === 'error' ? DESIGN.colors.red : DESIGN.colors.bg,
          borderColor: overallStatus === 'done' ? DESIGN.colors.green : overallStatus === 'error' ? DESIGN.colors.redBorder : DESIGN.colors.amber,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: DESIGN.spacing.xs }}>
          {overallStatus === 'running' && (
            <svg width="14" height="14" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round" />
            </svg>
          )}
          {overallStatus === 'done' && '✓'}
          {overallStatus === 'error' && '✗'}
          {overallStatus === 'pending' && '□'}
          <span>Export to Overleaf</span>
        </span>
      </Button>

      <StatusPopover
        steps={steps}
        open={popoverOpen}
        onClose={() => setPopoverOpen(false)}
        anchorRef={buttonRef}
      />

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. COMPOSED SHELL — ResearchPilotShell
// ─────────────────────────────────────────────────────────────────────────────

export function ResearchPilotShell({
  mcpClient = createMockMCPClient(),
  initialSessionId,
  style,
  className,
}) {
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId);
  const [selectedPhase, setSelectedPhase] = useState(1);
  const [selectedPaperId, setSelectedPaperId] = useState(null);
  const [showOverleaf, setShowOverleaf] = useState(false);
  const [sessionData, setSessionData] = useState({});

  const handleNewSession = useCallback(async () => {
    const result = await mcpClient.callTool('save_session', {
      topic: 'New Research Session',
      phase: 0,
      papers: [],
    });
    if (result.sessionId) {
      setSelectedSessionId(result.sessionId);
      setSessionData({ topic: 'New Research Session', phase: 0, papers: [] });
    }
  }, [mcpClient]);

  const handleSessionSelect = useCallback(async (session) => {
    setSelectedSessionId(session.sessionId);
    const loaded = await mcpClient.callTool('load_session', { sessionId: session.sessionId });
    setSessionData(loaded);
    setSelectedPhase(loaded.phase || 0);
  }, [mcpClient]);

  // Overleaf button config from session
  const overleafConfig = useMemo(() => ({
    sessionId: selectedSessionId,
    paperTitle: sessionData.topic || 'Research Paper',
    paperAuthors: sessionData.authors || ['Author'],
    paperTemplate: sessionData.template || 'ieee',
    reviewObjections: sessionData.reviewObjections || [],
    bibliographyBibtex: sessionData.bibtex || '',
    sections: sessionData.sections || {},
  }), [selectedSessionId, sessionData]);

  return (
    <MCPClientContext.Provider value={mcpClient}>
      <div
        style={{
          display: 'flex',
          height: '100vh',
          backgroundColor: DESIGN.colors.bg,
          color: DESIGN.colors.fg,
          fontFamily: DESIGN.fonts.sans,
          fontSize: 13,
          lineHeight: 1.5,
          ...style,
        }}
        className={className}
      >
        {/* LEFT: Chat History Sidebar */}
        <ChatHistorySidebar
          mcpClient={mcpClient}
          selectedSessionId={selectedSessionId}
          onSessionSelect={handleSessionSelect}
          onNewSession={handleNewSession}
        />

        {/* MAIN: Phase Search Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Top Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${DESIGN.spacing.md}px ${DESIGN.spacing.lg}px`,
            borderBottom: `1px solid ${DESIGN.colors.border}`,
            backgroundColor: DESIGN.colors.bgElevated,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN.spacing.md }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: DESIGN.colors.fg }}>ScholarPilot</span>
              {selectedSessionId && (
                <Badge variant="amber" style={{ fontSize: 10 }}>
                  {selectedSessionId.slice(0, 12)}
                </Badge>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: DESIGN.spacing.sm }}>
              <Button variant="ghost" onClick={() => setShowOverleaf(!showOverleaf)}>
                {showOverleaf ? 'Hide' : 'Show'} Overleaf
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <PhaseSearchBar
              mcpClient={mcpClient}
              selectedPhase={selectedPhase}
              onPhaseChange={setSelectedPhase}
              selectedPaperId={selectedPaperId}
              onPaperSelect={setSelectedPaperId}
            />
          </div>
        </div>

        {/* RIGHT: Overleaf Flow (conditional) */}
        {showOverleaf && (
          <div style={{
            width: 340,
            borderLeft: `1px solid ${DESIGN.colors.border}`,
            backgroundColor: DESIGN.colors.bg,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: DESIGN.spacing.xl,
          }}>
            <OverleafFlowButton
              mcpClient={mcpClient}
              {...overleafConfig}
            />
            <div style={{ marginTop: DESIGN.spacing.lg, textAlign: 'center', color: DESIGN.colors.fgDim, fontSize: 11, fontFamily: DESIGN.fonts.mono, maxWidth: 280 }}>
              Decoupled Phase 13 pipeline. Runs create → push sections → limitations → bibliography → sync independently of main search phase.
            </div>
          </div>
        )}
      </div>
    </MCPClientContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Export & Named Exports
// ─────────────────────────────────────────────────────────────────────────────

export const ScholarPilotWidgets = {
  ChatHistorySidebar,
  PhaseSearchBar,
  OverleafFlowButton,
  ResearchPilotShell,
  // Utilities
  createMockMCPClient,
  PHASE_GROUPS,
  ALL_PHASES,
  TOOL_TO_PHASE,
  DESIGN,
};

export default ScholarPilotWidgets;