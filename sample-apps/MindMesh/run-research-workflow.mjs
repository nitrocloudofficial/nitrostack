#!/usr/bin/env node
/**
 * Comprehensive Research Workflow for "Efficient Attention Mechanisms for Long Sequences"
 * Uses mock MCP client to simulate full ScholarPilot pipeline
 */

// Import the mock client from our demo (inline for standalone)
const {
  createMockMCPClient,
  DESIGN,
  PHASE_GROUPS,
  ALL_PHASES,
  TOOL_TO_PHASE,
  formatDate
} = (() => {
  // Inline mock client since we can't import from demo.html
  const DESIGN = {
    colors: {
      bg: '#0a0d12', bgElevated: '#11161d', bgHover: '#171e2a', bgActive: '#1c2533',
      border: '#1f2a3a', borderBright: '#2d3d52',
      fg: '#e8edf2', fgMuted: '#8b98a8', fgDim: '#5a6a7a',
      amber: '#ffb800', amberDim: '#cc9500', amberBg: 'rgba(255,184,0,0.12)', amberBorder: 'rgba(255,184,0,0.3)',
      green: '#22c55e', greenBg: 'rgba(34,197,94,0.12)', greenBorder: 'rgba(34,197,94,0.3)',
      red: '#ef4444', redBg: 'rgba(239,68,68,0.12)', redBorder: 'rgba(239,68,68,0.3)',
      blue: '#3b82f6', blueBg: 'rgba(59,130,246,0.12)', blueBorder: 'rgba(59,130,246,0.3)',
      phaseCore: '#3b82f6', phaseStretch: '#a855f7', phaseExport: '#14b8a6',
    },
    fonts: { sans: 'system-ui', mono: 'ui-monospace' },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
    radius: { sm: 4, md: 8, lg: 12 },
    shadows: { sm: '0 1px 2px rgba(0,0,0,0.3)', md: '0 4px 12px rgba(0,0,0,0.4)', lg: '0 8px 24px rgba(0,0,0,0.5)' },
    transitions: { fast: '120ms ease', normal: '200ms ease' },
  };

  const PHASE_GROUPS = [
    { groupId: 'intake', label: 'Intake & Search', color: '#3b82f6', phases: [
      { id: 0, name: 'Prior Work Search', tools: ['search_prior_work', 'search_prior_ai_sessions'] },
      { id: 1, name: 'Paper Search & Scoring', tools: ['search_papers', 'score_paper_relevance', 'get_paper_metadata'] },
    ]},
    { groupId: 'analysis', label: 'Analysis & Synthesis', color: '#3b82f6', phases: [
      { id: 2, name: 'Extraction & Claim Mining', tools: ['extract_paper_claims', 'extract_paper_metadata', 'fetch_full_text'] },
      { id: 3, name: 'Synthesis & Clustering', tools: ['cluster_papers', 'find_contradictory_claims', 'synthesize_clusters'] },
      { id: 4, name: 'Gap Finder', tools: ['assess_novelty', 'propose_gap', 'rank_gaps'] },
      { id: 5, name: 'Adversarial Review', tools: ['simulate_adversarial_review', 'run_gap_review_cycle'] },
      { id: 6, name: 'Verdict & Resilience', tools: ['compute_resilience_score', 'render_verdict'] },
    ]},
    { groupId: 'stretch', label: 'Stretch (Advanced)', color: '#a855f7', phases: [
      { id: 7, name: 'Cross-Domain Analogist', tools: ['find_cross_domain_analogs', 'verify_technique_match'] },
      { id: 8, name: 'Tech Parameters', tools: ['extract_technical_parameters', 'compare_technical_parameters', 'fetch_and_extract_tech_params'] },
    ]},
    { groupId: 'export', label: 'Output & Persistence', color: '#14b8a6', phases: [
      { id: 9, name: 'Citation Management', tools: ['generate_citation', 'export_bibtex', 'manage_bibliography'] },
      { id: 10, name: 'Writing Assistance', tools: ['check_writing', 'tone_match', 'check_ai_generic_phrasing', 'verify_meaning_preserved'] },
      { id: 11, name: 'Verification Engine', tools: ['verify_claim', 'verify_citation', 'verify_methodology_consistency', 'compile_verification_summary', 'run_all_verifications'] },
      { id: 12, name: 'Memory Persistence', tools: ['save_session', 'load_session', 'search_knowledge_graph'] },
      { id: 13, name: 'Overleaf Export (Mode 2)', tools: ['create_overleaf_project', 'push_section_to_overleaf', 'push_limitations_from_reviewer', 'add_bibliography_to_overleaf', 'sync_session_to_overleaf'] },
    ]},
  ];

  const ALL_PHASES = PHASE_GROUPS.flatMap(g => g.phases.map(p => ({ ...p, groupLabel: g.label, groupColor: g.color, groupId: g.groupId })));
  const TOOL_TO_PHASE = {}; ALL_PHASES.forEach(p => p.tools.forEach(t => { TOOL_TO_PHASE[t] = p.id; }));

  function formatDate(iso) {
    const d = new Date(iso);
    const today = new Date(); const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function createMockMCPClient() {
    const delay = (ms) => new Promise(r => setTimeout(r, ms));
    const sessions = new Map();
    let sessionCounter = 0;

    const mockPapers = [
      { paperId: 'p1', title: 'Attention Is All You Need', authors: ['Vaswani', 'Shazeer', 'Parmar', 'Uszkoreit', 'Jones', 'Gomez', 'Kaiser', 'Polosukhin'], year: 2017, venue: 'NeurIPS', abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks in an encoder-decoder configuration...', citationCount: 186255, quartile: 'Q3', fieldsOfStudy: ['Computer Science'], pdfUrl: '', isOpenAccess: false },
      { paperId: 'p2', title: 'BERT: Pre-training of Deep Bidirectional Transformers', authors: ['Devlin', 'Chang', 'Lee', 'Toutanova'], year: 2019, venue: 'NAACL', abstract: 'We introduce a new language representation model called BERT...', citationCount: 95000, quartile: 'Q1', fieldsOfStudy: ['Computer Science'], pdfUrl: '', isOpenAccess: true },
      { paperId: 'p3', title: 'Longformer: The Long-Document Transformer', authors: ['Beltagy', 'Peters', 'Cohan'], year: 2020, venue: 'arXiv', abstract: 'We present Longformer, which scales linearly with sequence length...', citationCount: 12000, quartile: 'Q1', fieldsOfStudy: ['Computer Science'], pdfUrl: '', isOpenAccess: true },
      { paperId: 'p4', title: 'Big Bird: Transformers for Longer Sequences', authors: ['Zaheer', 'Guruganesh', 'Dubey', 'Ainslie', 'Alberti', 'Ontanon', 'Pham', 'Ravula', 'Wang', 'Yang', 'Ahmed'], year: 2020, venue: 'NeurIPS', abstract: 'Sparse attention mechanisms scale Transformers to longer sequences...', citationCount: 8500, quartile: 'Q1', fieldsOfStudy: ['Computer Science'], pdfUrl: '', isOpenAccess: true },
      { paperId: 'p5', title: 'Linformer: Self-Attention with Linear Complexity', authors: ['Wang', 'Li', 'Khabsa', 'Awad', 'Lin'], year: 2020, venue: 'arXiv', abstract: 'We show that self-attention can be approximated by a low-rank matrix...', citationCount: 4500, quartile: 'Q2', fieldsOfStudy: ['Computer Science'], pdfUrl: '', isOpenAccess: true },
      { paperId: 'p6', title: 'Performer: Fast Attention Via Orthogonal Random Features', authors: ['Choromanski', 'Likhosherstov', 'Dohan', 'Song', 'Gane', 'Sarlos', 'Hawkins', 'Davis', 'Mohiuddin', 'Kaiser', 'Cohan', 'Weller'], year: 2021, venue: 'ICML', abstract: 'We present Performer, a Transformer architecture with linear attention...', citationCount: 6200, quartile: 'Q1', fieldsOfStudy: ['Computer Science'], pdfUrl: '', isOpenAccess: true },
      { paperId: 'p7', title: 'FlashAttention: Fast and Memory-Efficient Exact Attention', authors: ['Dao', 'Fu', 'Ermon', 'Rudd', 'Migrated'], year: 2022, venue: 'ICML', abstract: 'We introduce FlashAttention, an IO-aware exact attention algorithm...', citationCount: 8500, quartile: 'Q1', fieldsOfStudy: ['Computer Science'], pdfUrl: '', isOpenAccess: true },
      { paperId: 'p8', title: 'Scaling Language Models: Methods, Analysis & Insights', authors: ['Hoffmann', 'Borgeaud', 'Mensch', 'Buchatskaya', 'Cai', 'Rutherford', 'Casas', 'Glasee', 'Clark', 'Dieleman'], year: 2022, venue: 'arXiv', abstract: 'We study the empirical scaling laws of language models...', citationCount: 12000, quartile: 'Q2', fieldsOfStudy: ['Computer Science'], pdfUrl: '', isOpenAccess: true },
      { paperId: 'p9', title: 'LLaMA: Open and Efficient Foundation Language Models', authors: ['Touvron', 'Lavril', 'Izmard', 'Martin', 'Lachaux', 'Lacroix', 'Roziere', 'Goyal', 'Hambro', 'Azhar'], year: 2023, venue: 'arXiv', abstract: 'We introduce LLaMA, a collection of foundation language models...', citationCount: 45000, quartile: 'Q2', fieldsOfStudy: ['Computer Science'], pdfUrl: '', isOpenAccess: true },
      { paperId: 'p10', title: 'Retentive Network: A Successor to Transformer for Large Language Models', authors: ['Sun', 'Dong', 'Wang', 'Liu', 'Lin', 'Jiang', 'Hou', 'Zhang'], year: 2023, venue: 'arXiv', abstract: 'We propose RetNet, a neural network architecture with parallel training and constant memory...', citationCount: 3800, quartile: 'Q2', fieldsOfStudy: ['Computer Science'], pdfUrl: '', isOpenAccess: true },
      { paperId: 'p11', title: 'Mamba: Linear-Time Sequence Modeling with Selective State Spaces', authors: ['Gu', 'Goel'], year: 2023, venue: 'arXiv', abstract: 'We present Mamba, a selective state space model for sequence modeling...', citationCount: 5200, quartile: 'Q1', fieldsOfStudy: ['Computer Science'], pdfUrl: '', isOpenAccess: true },
      { paperId: 'p12', title: 'Ring Attention: Memory-Efficient Attention for Long Sequences', authors: ['Liu', 'Wang', 'Chen', 'Li'], year: 2024, venue: 'ICLR', abstract: 'Ring Attention enables distributed attention computation across devices...', citationCount: 1800, quartile: 'Q1', fieldsOfStudy: ['Computer Science'], pdfUrl: '', isOpenAccess: true },
    ];

    async function callTool(name, params) {
      await delay(300 + Math.random() * 500);

      if (name === 'search_prior_work') {
        const topic = (params.topic || '').toLowerCase();
        const filtered = mockPapers.filter(p =>
          p.title.toLowerCase().includes(topic) ||
          p.abstract?.toLowerCase().includes(topic) ||
          p.authors.some(a => a.toLowerCase().includes(topic))
        ).slice(0, params.maxPapers || 10);
        return {
          topic: params.topic,
          papers: filtered,
          repos: [],
          priorSessions: Array.from(sessions.values())
            .filter(s => s.topic?.toLowerCase().includes(topic))
            .map(s => ({ sessionId: s.sessionId, topic: s.topic, phase: s.phase, updatedAt: s.updatedAt }))
        };
      }

      if (name === 'search_prior_ai_sessions') {
        return Array.from(sessions.values()).map(s => ({
          sessionId: s.sessionId, topic: s.topic, phase: s.phase,
          paperCount: s.papers?.length || 0, updatedAt: s.updatedAt
        }));
      }

      if (name === 'search_papers') {
        const q = (params.query || '').toLowerCase();
        const filtered = mockPapers.filter(p =>
          p.title.toLowerCase().includes(q) ||
          p.abstract?.toLowerCase().includes(q) ||
          p.authors.some(a => a.toLowerCase().includes(q))
        ).slice(0, params.limit || 10);
        return { query: params.query, count: filtered.length, papers: filtered };
      }

      if (name === 'get_paper_metadata') {
        const p = mockPapers.find(p => p.paperId === params.paperId);
        if (!p) throw new Error('Paper not found');
        return p;
      }

      if (name === 'score_paper_relevance') {
        return { paperId: params.paperId, score: Math.floor(60 + Math.random() * 40), reasoning: 'Relevant to research question' };
      }

      if (name === 'extract_paper_claims') {
        const claimTemplates = {
          'p1': ['Transformer architecture eliminates recurrence', 'Self-attention scales quadratically with sequence length', 'Multi-head attention improves representation capacity'],
          'p2': ['Bidirectional pre-training captures deeper context', 'Masked language modeling enables bidirectional understanding', 'BERT achieves SOTA on GLUE benchmarks'],
          'p3': ['Local + global attention achieves linear scaling', 'Global tokens attend to all positions', 'Sliding window attention captures local context'],
          'p4': ['Random sparse attention approximates full attention', 'Block sparse patterns enable hardware efficiency', 'Big Bird matches BERT on long benchmarks'],
          'p5': ['Low-rank approximation reduces attention to linear', 'Projection matrices learned during training', 'Linformer maintains performance with less memory'],
          'p6': ['Orthogonal random features approximate softmax kernel', 'Linear attention via feature maps', 'Performer scales to 32k+ tokens'],
          'p7': ['IO-aware tiling eliminates memory bottlenecks', 'Exact attention with linear memory', 'Kernel fusion reduces HBM accesses'],
          'p8': ['Compute-optimal scaling: 20:1 data:params ratio', 'Chinchilla scaling laws redefine training budget', 'Smaller models trained longer outperform larger ones'],
          'p9': ['Open foundation models match GPT-3 performance', 'Efficient inference via grouped-query attention', 'Instruction tuning improves alignment'],
          'p10': ['Retention mechanism replaces attention', 'Parallel training with O(1) memory', 'RetNet matches Transformer scaling laws'],
          'p11': ['Selective state spaces model long-range dependencies', 'Linear-time inference with constant memory', 'Hardware-aware design for GPU efficiency'],
          'p12': ['Ring communication overlaps compute with transfer', 'Distributes attention across devices', 'Scales to 128k+ context on 8 GPUs'],
        };
        const templates = claimTemplates[params.paperId] || [
          'Core methodological contribution scales attention linearly',
          'Novel approximation maintains exact attention quality',
          'Hardware-aware design enables practical deployment'
        ];
        return {
          paperId: params.paperId,
          claimsCount: templates.length,
          claims: templates.map((text, i) => ({
            claimId: `c${i+1}-${params.paperId}`,
            text,
            type: i === 0 ? 'method' : i === 1 ? 'finding' : 'limitation',
            confidence: 70 + Math.floor(Math.random() * 25)
          }))
        };
      }

      if (name === 'extract_paper_metadata') {
        const p = mockPapers.find(p => p.paperId === params.paperId);
        return p ? { ...p, methodologies: ['Transformer', 'Attention'], datasets: ['WikiText', 'PG19'], limitations: ['Quadratic complexity'] } : null;
      }

      if (name === 'fetch_full_text') {
        return { paperId: params.paperId, fullText: `[Simulated full text for ${params.paperId}...]`, pdfUrl: '' };
      }

      if (name === 'cluster_papers') {
        return {
          sessionId: params.sessionId,
          clusters: [
            { clusterId: 'c1', label: 'Sparse & Structured Attention', papers: ['p1', 'p3', 'p4'], summary: 'Sparse attention patterns (Longformer, Big Bird) use fixed/local+global patterns' },
            { clusterId: 'c2', label: 'Low-Rank & Kernel Approximations', papers: ['p5', 'p6'], summary: 'Linformer and Performer approximate attention via low-rank projections and kernel feature maps' },
            { clusterId: 'c3', label: 'IO-Aware & System-Level Optimizations', papers: ['p7', 'p12'], summary: 'FlashAttention and Ring Attention optimize memory access patterns and distributed compute' },
            { clusterId: 'c4', label: 'Alternative Architectures', papers: ['p9', 'p10', 'p11'], summary: 'LLaMA, RetNet, Mamba replace attention with linear recurrences or state spaces' },
            { clusterId: 'c5', label: 'Scaling Laws & Training Efficiency', papers: ['p8'], summary: 'Chinchilla scaling laws inform compute-optimal training budgets' },
          ]
        };
      }

      if (name === 'find_contradictory_claims') {
        return {
          sessionId: params.sessionId,
          contradictions: [
            { claimA: 'c1-p1', claimB: 'c1-p3', description: 'Quadratic bottleneck claimed fundamental, but Longformer achieves linear scaling with local+global', severity: 'medium' },
            { claimA: 'c1-p5', claimB: 'c1-p7', description: 'Linformer claims low-rank approximation sufficient, FlashAttention shows exact attention feasible with IO-awareness', severity: 'high' },
            { claimA: 'c1-p10', claimB: 'c1-p3', description: 'RetNet claims attention replaceable with retention, but Longformer retains attention paradigm', severity: 'medium' },
          ]
        };
      }

      if (name === 'synthesize_clusters') {
        return {
          sessionId: params.sessionId,
          syntheses: [
            { clusterId: 'c1', narrative: 'Sparse attention mechanisms (Longformer, Big Bird) use fixed patterns to achieve linear scaling, trading some expressivity for efficiency.' },
            { clusterId: 'c2', narrative: 'Low-rank and kernel methods (Linformer, Performer) approximate the attention matrix, enabling theoretical linear complexity but with approximation error.' },
            { clusterId: 'c3', narrative: 'System-level optimizations (FlashAttention, Ring Attention) achieve exact attention at scale by optimizing memory hierarchy and distributed communication.' },
            { clusterId: 'c4', narrative: 'Alternative architectures (RetNet, Mamba) abandon attention entirely for linear recurrences, achieving true O(n) but with different inductive biases.' },
            { clusterId: 'c5', narrative: 'Scaling laws dictate that efficient architectures must be evaluated at compute-equivalent budgets, not just parameter counts.' },
          ],
          overallNarrative: 'The field centers on the fundamental tension between attention expressivity (quadratic) and computational efficiency (linear). Three distinct paradigms compete: sparse patterns, low-rank approximations, and architectural alternatives — each with different trade-offs on quality, hardware efficiency, and implementation complexity.'
        };
      }

      if (name === 'assess_novelty') {
        return { noveltyScore: Math.floor(60 + Math.random() * 35), similarClaims: [] };
      }

      if (name === 'propose_gap') {
        const gaps = [
          { claim: 'Hardware-adaptive attention that dynamically selects sparse/dense/linear regime per layer based on sequence length and hardware', noveltyScore: 88, feasibility: 75, impact: 92 },
          { claim: 'Unified attention framework with provable error bounds connecting sparse, low-rank, and kernel approximations', noveltyScore: 82, feasibility: 70, impact: 88 },
          { claim: 'Exact linear attention via structured state space duality without approximation error', noveltyScore: 90, feasibility: 65, impact: 95 },
          { claim: 'Cross-layer attention sharing for long-context efficiency', noveltyScore: 78, feasibility: 80, impact: 82 },
          { claim: 'Attention sink + sliding window with learned importance scores', noveltyScore: 75, feasibility: 85, impact: 78 },
        ];
        const gap = gaps[Math.floor(Math.random() * gaps.length)];
        return { gap, noveltyResult: { noveltyScore: gap.noveltyScore, similarClaims: [] } };
      }

      if (name === 'rank_gaps') {
        return {
          rankedGaps: [
            { claim: 'Hardware-adaptive attention with dynamic regime selection', rank: 1, score: 0.85 },
            { claim: 'Unified attention framework with provable error bounds', rank: 2, score: 0.80 },
            { claim: 'Exact linear attention via structured state space duality', rank: 3, score: 0.78 },
            { claim: 'Cross-layer attention sharing for long-context efficiency', rank: 4, score: 0.75 },
            { claim: 'Attention sink + sliding window with learned importance', rank: 5, score: 0.72 },
          ]
        };
      }

      if (name === 'simulate_adversarial_review') {
        const objections = [
          'Dynamic regime selection adds inference overhead; need latency benchmarks',
          'Error bounds may be vacuous for practical sequence lengths',
          'State space duality requires specific initialization; generalization unproven',
          'Cross-layer sharing may hurt representation diversity',
          'Learned importance scores add parameters; marginal gain unclear',
        ];
        return {
          gapId: params.gapId,
          iteration: params.iteration || 1,
          verdict: Math.random() > 0.4 ? 'PASS' : 'OBJECTION',
          objections: [objections[Math.floor(Math.random() * objections.length)]],
          objectionStrength: Math.floor(40 + Math.random() * 50),
          confidence: Math.floor(60 + Math.random() * 30)
        };
      }

      if (name === 'run_gap_review_cycle') {
        const maxRetries = Math.min(params.maxRetries || 3, 3);
        const reviews = [];
        for (let i = 0; i < maxRetries; i++) {
          const verdict = i === maxRetries - 1 ? 'PASS' : (Math.random() > 0.3 ? 'PASS' : 'OBJECTION');
          reviews.push({
            iteration: i + 1,
            verdict,
            objections: verdict === 'OBJECTION' ? ['Validation needed', 'Baselines incomplete'] : [],
            objectionStrength: verdict === 'OBJECTION' ? Math.floor(50 + Math.random() * 40) : 0,
            confidence: Math.floor(60 + Math.random() * 30)
          });
        }
        return {
          topic: params.topic,
          gap: { claim: 'Hardware-adaptive attention with dynamic regime selection', noveltyScore: 85 },
          reviews,
          passed: reviews[reviews.length - 1].verdict === 'PASS'
        };
      }

      if (name === 'compute_resilience_score') {
        return { gapId: params.gapId, resilienceScore: Math.floor(60 + Math.random() * 30), breakdown: { objectionStrength: 45, recencyPenalty: 5, citationDensity: 8 } };
      }

      if (name === 'render_verdict') {
        const s = Math.floor(60 + Math.random() * 30);
        return { gapId: params.gapId, finalVerdict: s >= 75 ? 'PASS' : s >= 55 ? 'CONDITIONAL' : 'REJECT', resilienceScore: s, reasoning: 'Moderate resilience. Objections addressable with additional experiments.' };
      }

      if (name === 'generate_citation') {
        return { citation: '[1] Vaswani et al., "Attention Is All You Need", NeurIPS 2017.', style: params.style };
      }
      if (name === 'export_bibtex') {
        return { bibtex: '@article{vaswani2017attention,\n  title={Attention is all you need},\n  author={Vaswani, Ashish and others},\n  journal={NeurIPS},\n  year={2017}\n}' };
      }
      if (name === 'manage_bibliography') {
        return { action: params.action, paperIds: params.paperIds, success: true };
      }
      if (name === 'check_writing') {
        return { section: params.section, tone: { score: 78, feedback: 'Good academic tone, minor hedging detected' }, aiGeneric: { flags: ['In this paper, we explore...'], score: 65 }, clarity: { score: 82, suggestions: ['Define "attention mechanism" on first use'] } };
      }
      if (name === 'verify_claim') {
        return { claimId: params.claimId, verified: true, confidence: 88, evidence: ['Extracted from paper abstract', 'Consistent with methodology section'] };
      }
      if (name === 'verify_citation') {
        return { paperId: params.paperId, accurate: true, issues: [] };
      }
      if (name === 'run_all_verifications') {
        return { sessionId: params.sessionId, summary: { total: 12, passed: 10, failed: 2, warnings: 1 } };
      }
      if (name === 'save_session') {
        const id = params.sessionId || `sess_${++sessionCounter}`;
        sessions.set(id, { ...params, sessionId: id, updatedAt: new Date().toISOString() });
        return { sessionId: id, saved: true };
      }
      if (name === 'load_session') {
        return sessions.get(params.sessionId) || { error: 'Not found' };
      }
      if (name === 'search_knowledge_graph') {
        return { entities: ['Transformer', 'Attention', 'Linear Attention', 'FlashAttention'], relations: [] };
      }
      if (name === 'create_overleaf_project') {
        const pid = `proj_${Date.now()}`;
        return { projectId: pid, projectPath: `/tmp/${pid}`, title: params.title, authors: params.authors, template: params.template, sectionsInitialized: 0 };
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
      if (name === 'export_overleaf_zip') {
        throw new Error('Tool disabled: archiver ESM/CJS incompatibility');
      }

      return { error: `Unknown tool: ${name}`, mock: true };
    }

    return { callTool };
  }

  return { DESIGN, PHASE_GROUPS, ALL_PHASES, TOOL_TO_PHASE, formatDate, createMockMCPClient };
})();

// ════════════════════════════════════════════════════════════════════════════════
// RESEARCH WORKFLOW EXECUTION
// ════════════════════════════════════════════════════════════════════════════════

async function runResearchWorkflow() {
  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║  SCHOLARPILOT RESEARCH WORKFLOW — Efficient Attention for Long Sequences  ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  const mcp = createMockMCPClient();
  const sessionId = 'research-attention-long-sequences';
  let currentSession = { sessionId, topic: 'Efficient Attention Mechanisms for Long Sequences', phase: 0, papers: [] };

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 0: PRIOR WORK SEARCH
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('┌──────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ PHASE 0 — PRIOR WORK SEARCH                                                  │');
  console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

  console.log('🔍 Searching prior work: "efficient attention long sequences"...\n');
  const priorWork = await mcp.callTool('search_prior_work', {
    topic: 'efficient attention long sequences',
    maxPapers: 20
  });

  currentSession.papers = priorWork.papers;
  console.log(`📚 Found ${priorWork.papers.length} relevant papers:\n`);
  priorWork.papers.forEach((p, i) => {
    console.log(`  ${i + 1}. [${p.year}] ${p.title}`);
    console.log(`     ${p.authors.slice(0, 3).join(', ')}${p.authors.length > 3 ? ' et al.' : ''} | ${p.venue} | ${p.citationCount?.toLocaleString()} citations | ${p.quartile}`);
  });
  console.log(`\n📋 Prior AI Sessions: ${priorWork.priorSessions.length}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1: PAPER SEARCH & RELEVANCE SCORING
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ PHASE 1 — PAPER SEARCH & RELEVANCE SCORING                                   │');
  console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

  console.log('🔍 Searching papers with query...\n');
  const searchResult = await mcp.callTool('search_papers', {
    query: 'efficient attention mechanism long sequence transformer linear',
    yearFrom: 2020,
    limit: 20
  });

  console.log(`Found ${searchResult.papers.length} papers. Scoring relevance...\n`);

  for (const paper of searchResult.papers) {
    const score = await mcp.callTool('score_paper_relevance', { paperId: paper.paperId });
    paper.relevanceScore = score.score;
    console.log(`  [${score.score}%] ${paper.title} (${paper.year})`);
  }

  // Sort by relevance
  searchResult.papers.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  currentSession.papers = searchResult.papers;

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 2: EXTRACTION & CLAIM MINING
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ PHASE 2 — EXTRACTION & CLAIM MINING                                          │');
  console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

  const allClaims = [];
  for (const paper of currentSession.papers) {
    console.log(`\n📄 Extracting claims from: ${paper.title}`);
    const extraction = await mcp.callTool('extract_paper_claims', { paperId: paper.paperId });
    paper.claims = extraction.claims;
    allClaims.push(...extraction.claims.map(c => ({ ...c, paperId: paper.paperId, paperTitle: paper.title })));
    console.log(`   Extracted ${extraction.claimsCount} claims:`);
    extraction.claims.forEach(c => console.log(`     • [${c.type}] ${c.text} (confidence: ${c.confidence}%)`));

    // Also extract metadata
    await mcp.callTool('extract_paper_metadata', { paperId: paper.paperId });
  }

  console.log(`\n📊 Total claims extracted: ${allClaims.length}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 3: SYNTHESIS & CLUSTERING
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ PHASE 3 — SYNTHESIS & CLUSTERING                                             │');
  console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

  console.log('🔬 Clustering papers by embedding similarity...\n');
  const clusters = await mcp.callTool('cluster_papers', { sessionId });
  clusters.clusters.forEach(c => {
    console.log(`  Cluster ${c.clusterId}: ${c.label}`);
    console.log(`    Papers: ${c.papers.join(', ')}`);
    console.log(`    Summary: ${c.summary}`);
  });

  console.log('\n🔍 Finding contradictory claims...\n');
  const contradictions = await mcp.callTool('find_contradictory_claims', { sessionId });
  contradictions.contradictions.forEach(c => {
    console.log(`  ⚠️  ${c.claimA} vs ${c.claimB} — ${c.description} (${c.severity})`);
  });

  console.log('\n📝 Synthesizing cluster narratives...\n');
  const synthesis = await mcp.callTool('synthesize_clusters', { sessionId });
  synthesis.syntheses.forEach(s => {
    console.log(`  ${s.clusterId}: ${s.narrative}`);
  });
  console.log(`\n📋 Overall: ${synthesis.overallNarrative}`);

  currentSession.clusters = clusters.clusters;
  currentSession.contradictions = contradictions.contradictions;
  currentSession.synthesis = synthesis;

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 4: GAP FINDER
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ PHASE 4 — GAP FINDER & NOVELTY ASSESSMENT                                    │');
  console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

  console.log('🎯 Assessing novelty of top gap candidate...\n');
  const novelty = await mcp.callTool('assess_novelty', { claim: 'Hardware-adaptive attention with dynamic sparse/dense/linear regime selection per layer', evidence: [] });
  console.log(`   Novelty Score: ${novelty.noveltyScore}/100`);

  console.log('\n💡 Proposing research gap...\n');
  const gapProposal = await mcp.callTool('propose_gap', { topic: 'Efficient Attention Mechanisms for Long Sequences', sessionId });
  console.log(`   Gap Claim: ${gapProposal.gap.claim}`);
  console.log(`   Novelty: ${gapProposal.gap.noveltyScore} | Feasibility: ${gapProposal.gap.feasibility} | Impact: ${gapProposal.gap.impact}`);

  console.log('\n📊 Ranking gaps...\n');
  const ranked = await mcp.callTool('rank_gaps', { topic: 'Efficient Attention Mechanisms for Long Sequences', sessionId });
  ranked.rankedGaps.forEach(g => console.log(`   #${g.rank} (${(g.score * 100).toFixed(0)}%): ${g.claim}`));

  currentSession.gap = gapProposal.gap;
  currentSession.rankedGaps = ranked.rankedGaps;

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 5: ADVERSARIAL REVIEW & RETRY LOOP
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ PHASE 5 — ADVERSARIAL REVIEW & RETRY LOOP                                    │');
  console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

  console.log('🛡️  Running gap review cycle (max 3 iterations)...\n');
  const reviewCycle = await mcp.callTool('run_gap_review_cycle', {
    topic: 'Efficient Attention Mechanisms for Long Sequences',
    maxRetries: 3
  });

  reviewCycle.reviews.forEach(r => {
    console.log(`  Iteration ${r.iteration}: ${r.verdict}`);
    if (r.objections.length) {
      r.objections.forEach(o => console.log(`    ↳ ${o}`));
    }
    console.log(`    Objection Strength: ${r.objectionStrength} | Confidence: ${r.confidence}`);
  });
  console.log(`\n✅ Gap survived review: ${reviewCycle.passed ? 'YES' : 'NO'}`);

  // Also run individual adversarial review for detail
  console.log('\n🔍 Single adversarial review on top gap...\n');
  const advReview = await mcp.callTool('simulate_adversarial_review', {
    gapId: 'gap-top',
    gapClaim: reviewCycle.gap.claim,
    evidence: []
  });
  console.log(`   Verdict: ${advReview.verdict}`);
  console.log(`   Objections: ${advReview.objections.join('; ')}`);
  console.log(`   Objection Strength: ${advReview.objectionStrength} | Confidence: ${advReview.confidence}`);

  currentSession.reviews = reviewCycle.reviews;
  currentSession.adversarialReview = advReview;

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 6: VERDICT & RESILIENCE
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ PHASE 6 — VERDICT & RESILIENCE SCORE                                         │');
  console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

  console.log('📐 Computing resilience score...\n');
  const resilience = await mcp.callTool('compute_resilience_score', { gapId: 'gap-top' });
  console.log(`   Resilience Score: ${resilience.resilienceScore}/100`);
  console.log(`   Breakdown: Objection Strength=${resilience.breakdown.objectionStrength}, Recency Penalty=${resilience.breakdown.recencyPenalty}, Citation Density=${resilience.breakdown.citationDensity}`);

  console.log('\n⚖️  Rendering final verdict...\n');
  const verdict = await mcp.callTool('render_verdict', { gapId: 'gap-top' });
  console.log(`   FINAL VERDICT: ${verdict.finalVerdict}`);
  console.log(`   Resilience Score: ${verdict.resilienceScore}/100`);
  console.log(`   Reasoning: ${verdict.reasoning}`);

  currentSession.resilience = resilience;
  currentSession.verdict = verdict;

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 7-8: STRETCH GOALS (Cross-Domain, Tech Params)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ PHASE 7-8 — STRETCH: CROSS-DOMAIN ANALOGS & TECH PARAMETERS                  │');
  console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

  console.log('🔄 Finding cross-domain analogs...\n');
  const analogs = await mcp.callTool('find_cross_domain_analogs', {
    domain: 'machine learning',
    technique: 'hardware-adaptive attention with dynamic regime selection',
    excludeDomains: ['machine learning', 'deep learning', 'nlp']
  });
  console.log(`   Found ${analogs.analogs?.length || 0} analogs`);
  if (analogs.analogs) {
    analogs.analogs.forEach(a => console.log(`   • ${a.domain}: ${a.technique} (similarity: ${a.similarity})`));
  }

  console.log('\n⚙️  Extracting technical parameters from key papers...\n');
  for (const paperId of ['p7', 'p11', 'p12']) {
    const params = await mcp.callTool('extract_technical_parameters', { paperId });
    console.log(`   ${paperId}: hardware=${params.hardwarePlatform}, memory=${params.memoryBudgetMw || 'N/A'}mW, datasetSize=${params.datasetSize || 'N/A'}`);
  }

  const comparison = await mcp.callTool('compare_technical_parameters', { paperIds: ['p7', 'p11', 'p12'] });
  console.log(`\n   Comparison: ${comparison.comparisonSummary || 'Hardware-aware designs dominate efficiency gains'}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 9-11: EXPORT & VERIFICATION
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ PHASE 9-11 — CITATIONS, WRITING, VERIFICATION                                │');
  console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

  console.log('📚 Generating citations...\n');
  const citation = await mcp.callTool('generate_citation', { paperId: 'p1', style: 'IEEE' });
  console.log(`   IEEE: ${citation.citation}`);
  const bibtex = await mcp.callTool('export_bibtex', { paperIds: ['p1', 'p3', 'p4', 'p7', 'p11'] });
  console.log(`   BibTeX entries: ${(bibtex.bibtex.match(/@/g) || []).length}`);

  console.log('\n✍️  Writing assistance check...\n');
  const writing = await mcp.callTool('check_writing', { section: 'We propose a hardware-adaptive attention mechanism that dynamically selects between sparse, dense, and linear attention regimes per layer based on sequence length and hardware characteristics.' });
  console.log(`   Tone Score: ${writing.tone.score}/100`);
  console.log(`   AI Generic Score: ${writing.aiGeneric.score}/100`);
  console.log(`   Clarity Score: ${writing.clarity.score}/100`);
  console.log(`   Flags: ${writing.aiGeneric.flags.join(', ')}`);

  console.log('\n✅ Running verification engine...\n');
  const verification = await mcp.callTool('run_all_verifications', { sessionId });
  console.log(`   Total Checks: ${verification.summary.total}`);
  console.log(`   Passed: ${verification.summary.passed}`);
  console.log(`   Failed: ${verification.summary.failed}`);
  console.log(`   Warnings: ${verification.summary.warnings}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 12: MEMORY PERSISTENCE
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ PHASE 12 — MEMORY PERSISTENCE                                                │');
  console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

  console.log('💾 Saving session...\n');
  const saved = await mcp.callTool('save_session', {
    ...currentSession,
    topic: 'Efficient Attention Mechanisms for Long Sequences',
    phase: 6,
    papers: currentSession.papers.map(p => p.paperId)
  });
  console.log(`   Session saved: ${saved.sessionId}`);

  console.log('\n🔍 Loading session back...\n');
  const loaded = await mcp.callTool('load_session', { sessionId: saved.sessionId });
  console.log(`   Loaded: ${loaded.topic} | Phase: ${loaded.phase} | Papers: ${loaded.papers?.length || 0}`);

  console.log('\n🕸️  Searching knowledge graph...\n');
  const kg = await mcp.callTool('search_knowledge_graph', { query: 'attention linear efficient' });
  console.log(`   Entities: ${kg.entities.join(', ')}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 13: OVERLEAF EXPORT (MODE 2)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ PHASE 13 — OVERLEAF EXPORT (MODE 2)                                          │');
  console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

  console.log('📄 Creating Overleaf project from IEEE template...\n');
  const overleaf = await mcp.callTool('create_overleaf_project', {
    title: 'Hardware-Adaptive Attention for Efficient Long-Sequence Modeling',
    authors: ['Research Team'],
    template: 'ieee',
    sessionId: saved.sessionId
  });
  console.log(`   Project created: ${overleaf.projectId}`);
  console.log(`   Path: ${overleaf.projectPath}`);

  console.log('\n📝 Pushing sections...\n');
  const sections = [
    { section: 'abstract', content: 'We present a hardware-adaptive attention mechanism...' },
    { section: 'introduction', content: 'Attention mechanisms have revolutionized sequence modeling...' },
    { section: 'related-work', content: 'Prior work on efficient attention falls into three categories...' },
    { section: 'methodology', content: 'Our approach dynamically selects attention regime per layer...' },
    { section: 'experiments', content: 'We evaluate on Long-Range Arena and PG-19 benchmarks...' },
    { section: 'results', content: 'Our method achieves 1.8× speedup over FlashAttention-2...' },
    { section: 'discussion', content: 'The dynamic regime selection adapts to hardware constraints...' },
    { section: 'limitations', content: 'Dynamic selection adds inference overhead...' },
    { section: 'conclusion', content: 'We introduced hardware-adaptive attention...' },
  ];

  for (const s of sections) {
    const result = await mcp.callTool('push_section_to_overleaf', { ...s, sessionId: saved.sessionId });
    console.log(`   Pushed ${s.section} (${result.contentLength} chars)`);
  }

  console.log('\n⚠️  Pushing limitations from reviewer objections...\n');
  const limitations = await mcp.callTool('push_limitations_from_reviewer', {
    objections: reviewCycle.reviews.flatMap(r => r.objections).filter(Boolean),
    sessionId: saved.sessionId
  });
  console.log(`   Pushed ${limitations.objectionsCount} objections as limitations`);

  console.log('\n📚 Adding bibliography...\n');
  const bib = await mcp.callTool('add_bibliography_to_overleaf', {
    bibtex: bibtex.bibtex,
    sessionId: saved.sessionId
  });
  console.log(`   Added ${bib.entriesAdded} bibliography entries`);

  console.log('\n🔄 Final sync...\n');
  const sync = await mcp.callTool('sync_session_to_overleaf', { sessionId: saved.sessionId, createIfMissing: false });
  console.log(`   Sections synced: ${sync.sectionsSynced}`);
  console.log(`   Has bibliography: ${sync.hasBibliography}`);
  console.log(`   Has limitations: ${sync.hasLimitations}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                        RESEARCH WORKFLOW COMPLETE                          ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  console.log('📋 SESSION SUMMARY');
  console.log('──────────────────');
  console.log(`   Topic: Efficient Attention Mechanisms for Long Sequences`);
  console.log(`   Session ID: ${saved.sessionId}`);
  console.log(`   Papers Analyzed: ${currentSession.papers.length}`);
  console.log(`   Claims Extracted: ${allClaims.length}`);
  console.log(`   Clusters Found: ${clusters.clusters.length}`);
  console.log(`   Contradictions: ${contradictions.contradictions.length}`);
  console.log(`   Top Gap: Hardware-adaptive attention with dynamic regime selection`);
  console.log(`   Novelty Score: ${gapProposal.gap.noveltyScore}/100`);
  console.log(`   Feasibility: ${gapProposal.gap.feasibility}/100`);
  console.log(`   Impact: ${gapProposal.gap.impact}/100`);
  console.log(`   Review Cycles: ${reviewCycle.reviews.length}`);
  console.log(`   Final Verdict: ${verdict.finalVerdict}`);
  console.log(`   Resilience Score: ${verdict.resilienceScore}/100`);
  console.log(`   Overleaf Project: ${overleaf.projectId}`);
  console.log(`   Sections Synced: ${sync.sectionsSynced}`);
  console.log(`   Verification: ${verification.summary.passed}/${verification.summary.total} passed\n`);

  console.log('🚀 Next Steps:');
  console.log('   1. Review Overleaf project at https://www.overleaf.com');
  console.log('   2. Address verification failures (2 failed checks)');
  console.log('   3. Add missing baselines to experiments section');
  console.log('   4. Submit to target venue (ICLR/ICML/NeurIPS)\n');
}

runResearchWorkflow().catch(console.error);