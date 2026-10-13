#!/usr/bin/env node
/**
 * Comprehensive Research Workflow for "Federated Learning Privacy"
 * Uses mock MCP client to simulate full ScholarPilot pipeline
 */

const DESIGN = {
  colors: { amber: '#ffb800', green: '#22c55e', red: '#ef4444', blue: '#3b82f6' },
  fonts: { sans: 'system-ui', mono: 'ui-monospace' },
};

function createMockMCPClient() {
  const delay = (ms) => new Promise(r => setTimeout(r, ms));
  const sessions = new Map();

  // Federated Learning Privacy mock papers (2020+)
  const mockPapers = [
    { paperId: 'fl1', title: 'Privacy-Preserving Federated Learning with Differential Privacy', authors: ['Abadi', 'Chu', 'Goodfellow', 'McMahan', 'Mironov', 'Talwar', 'Zhang'], year: 2020, venue: 'ACM CCS', abstract: 'We present DP-FedAvg, a differentially private federated learning algorithm that adds calibrated noise to client updates...', citationCount: 3200, quartile: 'Q1', fieldsOfStudy: ['Computer Science', 'Cryptography'], pdfUrl: '', isOpenAccess: true },
    { paperId: 'fl2', title: 'Secure Aggregation for Federated Learning', authors: ['Bonawitz', 'Ivanov', 'Kreuter', 'Marcedone', 'McMahan', 'Patel', 'Ramage', 'Segal', 'Seth'], year: 2020, venue: 'USENIX Security', abstract: 'We design a secure aggregation protocol that allows a server to compute the sum of client updates without learning individual contributions...', citationCount: 2800, quartile: 'Q1', fieldsOfStudy: ['Computer Science', 'Security'], pdfUrl: '', isOpenAccess: true },
    { paperId: 'fl3', title: 'Federated Learning with Homomorphic Encryption', authors: ['Zhang', 'Zhu', 'Lyu', 'Zhou', 'Liu'], year: 2021, venue: 'IEEE S&P', abstract: 'We propose HE-FL, a federated learning framework using CKKS homomorphic encryption for secure model aggregation...', citationCount: 1800, quartile: 'Q1', fieldsOfStudy: ['Computer Science', 'Cryptography'], pdfUrl: '', isOpenAccess: false },
    { paperId: 'fl4', title: 'Split Learning for Privacy-Preserving Federated Learning', authors: ['Vepakomma', 'Gupta', 'Swedish', 'Raskar'], year: 2021, venue: 'arXiv', abstract: 'We introduce split learning where clients compute forward pass locally and server computes backward pass, reducing data exposure...', citationCount: 1500, quartile: 'Q2', fieldsOfStudy: ['Computer Science', 'Machine Learning'], pdfUrl: '', isOpenAccess: true },
    { paperId: 'fl5', title: 'Byzantine-Robust Federated Learning with Privacy Guarantees', authors: ['Fang', 'Cao', 'Jia', 'Gong'], year: 2022, venue: 'ICML', abstract: 'We combine Byzantine-robust aggregation with differential privacy to achieve both security and privacy in federated learning...', citationCount: 900, quartile: 'Q1', fieldsOfStudy: ['Computer Science', 'ML Security'], pdfUrl: '', isOpenAccess: true },
    { paperId: 'fl6', title: 'Federated Learning with Local Differential Privacy', authors: ['Kairouz', 'McMahan', 'Song', 'Thakkar', 'Abadi', 'Erlingsson', 'Diaz', 'Ramaswamy'], year: 2022, venue: 'JMLR', abstract: 'We analyze local differential privacy in federated learning, showing tighter privacy accounting and utility trade-offs...', citationCount: 2100, quartile: 'Q1', fieldsOfStudy: ['Computer Science', 'Privacy'], pdfUrl: '', isOpenAccess: true },
    { paperId: 'fl7', title: 'Privacy Amplification by Subsampling in Federated Learning', authors: ['Balle', 'Barthe', 'Gaboardi', 'Hsu', 'Sato'], year: 2022, venue: 'NeurIPS', abstract: 'We prove privacy amplification via client subsampling, enabling tighter (ε,δ)-DP guarantees for federated learning...', citationCount: 1200, quartile: 'Q1', fieldsOfStudy: ['Computer Science', 'Privacy Theory'], pdfUrl: '', isOpenAccess: true },
    { paperId: 'fl8', title: 'Secure Multi-Party Computation for Federated Learning', authors: ['Knott', 'Venkataraman', 'Yakoubov', 'Bennett', 'Kosba', 'Miller'], year: 2023, venue: 'USENIX Security', abstract: 'We present MP-FL, an MPC-based federated learning framework achieving information-theoretic security against semi-honest adversaries...', citationCount: 650, quartile: 'Q1', fieldsOfStudy: ['Computer Science', 'MPC'], pdfUrl: '', isOpenAccess: true },
    { paperId: 'fl9', title: 'Federated Unlearning: Removing Client Data Influence', authors: ['Guo', 'Goldfarb', 'Mironov', 'Thakkar'], year: 2023, venue: 'ICML', abstract: 'We formalize federated unlearning and propose efficient algorithms to remove specific client data from the global model...', citationCount: 480, quartile: 'Q1', fieldsOfStudy: ['Computer Science', 'Privacy/Unlearning'], pdfUrl: '', isOpenAccess: true },
    { paperId: 'fl10', title: 'Membership Inference Attacks on Federated Learning', authors: ['Nasr', 'Shokri', 'Houmansadr'], year: 2023, venue: 'IEEE S&P', abstract: 'We demonstrate powerful membership inference attacks against federated learning, even with differential privacy...', citationCount: 800, quartile: 'Q1', fieldsOfStudy: ['Computer Science', 'ML Attacks'], pdfUrl: '', isOpenAccess: true },
    { paperId: 'fl11', title: 'Federated Learning with Trusted Execution Environments', authors: ['Hunt', 'Song', 'Shokri', 'San Fratello', 'Ristenpart'], year: 2023, venue: 'ACM CCS', abstract: 'We leverage Intel SGX to provide hardware-enforced privacy for federated learning aggregation...', citationCount: 550, quartile: 'Q1', fieldsOfStudy: ['Computer Science', 'Hardware Security'], pdfUrl: '', isOpenAccess: false },
    { paperId: 'fl12', title: 'Communication-Efficient Private Federated Learning', authors: ['Roth', 'Kulkarni', 'Suresh', 'McMahan', 'Thakkar'], year: 2024, venue: 'ICLR', abstract: 'We propose compressed private federated learning achieving 10x communication reduction with minimal privacy loss...', citationCount: 220, quartile: 'Q1', fieldsOfStudy: ['Computer Science', 'FL Optimization'], pdfUrl: '', isOpenAccess: true },
    { paperId: 'fl13', title: 'Label Differential Privacy in Federated Learning', authors: ['Ghazi', 'Golowich', 'Kumar', 'Manurangsi', 'Prasad'], year: 2024, venue: 'ICML', abstract: 'We study label-only differential privacy, showing strong utility when only labels need protection...', citationCount: 180, quartile: 'Q1', fieldsOfStudy: ['Computer Science', 'Privacy Theory'], pdfUrl: '', isOpenAccess: true },
    { paperId: 'fl14', title: 'Federated Learning with Byzantine-Resilient Privacy', authors: ['El-Mhamdi', 'Farhadkhani', 'Guerraoui', 'Nguyen', 'Rouault'], year: 2024, venue: 'NeurIPS', abstract: 'We unify Byzantine robustness and differential privacy in a single framework with optimal trade-offs...', citationCount: 150, quartile: 'Q1', fieldsOfStudy: ['Computer Science', 'Robust FL'], pdfUrl: '', isOpenAccess: true },
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
      return { paperId: params.paperId, score: Math.floor(60 + Math.random() * 40), reasoning: 'Relevant to federated learning privacy research' };
    }

    if (name === 'extract_paper_claims') {
      const claimTemplates = {
        'fl1': ['DP-FedAvg adds Gaussian noise to client updates for (ε,δ)-DP', 'Moments accountant provides tight privacy composition', 'Utility drops <2% at ε=1.0 on CIFAR-10'],
        'fl2': ['Secure aggregation hides individual updates via pairwise masking', 'Protocol tolerates up to 50% dropout', 'Communication overhead 2x baseline'],
        'fl3': ['CKKS encryption supports approximate arithmetic for FL', 'Batching enables efficient matrix operations', 'Ciphertext size limits model dimensionality'],
        'fl4': ['Split learning reduces client computation by 40%', 'Server sees only smashed data, not raw inputs', 'Vulnerable to gradient inversion attacks'],
        'fl5': ['Krum + DP achieves Byzantine robustness with privacy', 'Privacy budget split between selection and noise', 'Stronger assumptions on honest majority'],
        'fl6': ['Local DP provides per-sample privacy without trusted server', 'Randomized response on gradients', 'Significant utility loss vs central DP'],
        'fl7': ['Subsampling amplifies privacy by factor ~1/q', 'Poisson subsampling gives tightest bounds', 'Practical with partial participation'],
        'fl8': ['MPC provides information-theoretic security', '3-party honest-majority protocol', '100x slower than plaintext aggregation'],
        'fl9': ['Federated unlearning via influence function approximation', 'Requires storing per-client gradients', 'Exact unlearning computationally prohibitive'],
        'fl10': ['MI attacks succeed even with ε=1 DP-FedAvg', 'Attack exploits inter-client similarity', 'Defense requires ε<0.5, hurting utility'],
        'fl11': ['TEE-based aggregation with remote attestation', 'Side-channel attacks remain concern', 'Hardware dependency limits deployment'],
        'fl12': ['Top-k sparsification + DP preserves privacy', 'Error feedback compensates for compression', 'Privacy accounting with compression non-trivial'],
        'fl13': ['Label DP sufficient for many FL tasks', 'Feature extractor can be public', 'Weaker threat model than full DP'],
        'fl14': ['Unified Byzantine+DP framework with optimal trade-offs', 'Trimmed mean + Gaussian noise', 'Matches separate lower bounds'],
      };
      const templates = claimTemplates[params.paperId] || [
        'Novel privacy mechanism for federated learning',
        'Improved privacy-utility trade-off demonstrated',
        'Theoretical guarantees under realistic threat models'
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
      const metadataById = {
        'fl1': { methodologies: ['Differential Privacy', 'Moments Accountant'], datasets: ['CIFAR-10', 'EMNIST'], limitations: ['Central DP requires trusted server', 'Gaussian noise assumption'] },
        'fl2': { methodologies: ['Secure Multiparty Computation', 'Pairwise Masking'], datasets: ['CIFAR-100', 'Shakespeare'], limitations: ['Dropout tolerance limit', 'No privacy guarantee if server colludes'] },
        'fl3': { methodologies: ['Homomorphic Encryption (CKKS)'], datasets: ['MNIST', 'CIFAR-10'], limitations: ['Ciphertext expansion', 'Limited to polynomial activations'] },
        'fl4': { methodologies: ['Split Learning', 'Model Partitioning'], datasets: ['CIFAR-10', 'ImageNet-32'], limitations: ['Gradient inversion vulnerability', 'Server sees smashed data'] },
        'fl5': { methodologies: ['Byzantine-Robust Aggregation', 'Differential Privacy'], datasets: ['CIFAR-10', 'FEMNIST'], limitations: ['Honest majority assumption', 'Privacy budget division'] },
        'fl6': { methodologies: ['Local Differential Privacy', 'Randomized Response'], datasets: ['StackOverflow', 'Reddit'], limitations: ['High noise for utility', 'No composition across rounds'] },
        'fl7': { methodologies: ['Privacy Amplification', 'Poisson Subsampling'], datasets: ['CIFAR-10', 'Synthetic'], limitations: ['Requires subsampling', 'Partial participation assumption'] },
        'fl8': { methodologies: ['Shamir Secret Sharing', 'Beaver Triples'], datasets: ['CIFAR-10', 'Synthetic'], limitations: ['Honest majority required', 'High communication/computation'] },
        'fl9': { methodologies: ['Influence Functions', 'Gradient Approximation'], datasets: ['CIFAR-10', 'CIFAR-100'], limitations: ['Approximation error', 'Storage overhead'] },
        'fl10': { methodologies: ['Membership Inference', 'Shadow Modeling'], datasets: ['Purchase100', 'CIFAR-10'], limitations: ['White-box attack', 'Requires shadow data'] },
        'fl11': { methodologies: ['TEE (Intel SGX)', 'Remote Attestation'], datasets: ['CIFAR-10', 'FEMNIST'], limitations: ['Side channels', 'Hardware dependency'] },
        'fl12': { methodologies: ['Gradient Sparsification', 'Error Feedback', 'DP'], datasets: ['CIFAR-10', 'Shakespeare'], limitations: ['Compression-privacy interaction', 'Top-k bias'] },
        'fl13': { methodologies: ['Label DP', 'Public Feature Extractor'], datasets: ['CIFAR-10', 'ImageNet-Subset'], limitations: ['Weaker threat model', 'Feature extractor privacy ignored'] },
        'fl14': { methodologies: ['Trimmed Mean', 'Gaussian Mechanism', 'Byzantine Analysis'], datasets: ['CIFAR-10', 'FEMNIST'], limitations: ['Requires known Byzantine fraction', 'Adaptive attacks possible'] },
      };
      return p ? { ...p, ...metadataById[params.paperId] } : null;
    }

    if (name === 'fetch_full_text') {
      return { paperId: params.paperId, fullText: `[Simulated full text for ${params.paperId}...]`, pdfUrl: '' };
    }

    if (name === 'cluster_papers') {
      return {
        sessionId: params.sessionId,
        clusters: [
          { clusterId: 'c1', label: 'Differential Privacy in FL', papers: ['fl1', 'fl6', 'fl7', 'fl12', 'fl13'], summary: 'Central DP, Local DP, Privacy Amplification, Compressed DP, Label DP variants' },
          { clusterId: 'c2', label: 'Secure Aggregation & MPC', papers: ['fl2', 'fl3', 'fl8', 'fl11'], summary: 'Pairwise masking, HE, MPC, TEE-based secure aggregation protocols' },
          { clusterId: 'c3', label: 'Byzantine-Robust Privacy', papers: ['fl5', 'fl14'], summary: 'Unified Byzantine resilience + DP frameworks with optimal trade-offs' },
          { clusterId: 'c4', label: 'Privacy Attacks & Defenses', papers: ['fl4', 'fl9', 'fl10'], summary: 'Split learning vulnerabilities, federated unlearning, membership inference attacks' },
        ]
      };
    }

    if (name === 'find_contradictory_claims') {
      return {
        sessionId: params.sessionId,
        contradictions: [
          { claimA: 'c1-fl1', claimB: 'c1-fl6', description: 'Central DP (DP-FedAvg) requires trusted server; Local DP avoids trust but sacrifices utility drastically', severity: 'high' },
          { claimA: 'c1-fl2', claimB: 'c1-fl4', description: 'Secure aggregation hides updates from server; but split learning exposes smashed data to gradient inversion', severity: 'medium' },
          { claimA: 'c1-fl3', claimB: 'c1-fl8', description: 'HE supports only polynomial ops; MPC supports arbitrary computation but 100x slower', severity: 'medium' },
          { claimA: 'c1-fl9', claimB: 'c1-fl10', description: 'Unlearning removes data influence; but MI attacks show data persists in model even with DP', severity: 'high' },
          { claimA: 'c1-fl11', claimB: 'c1-fl3', description: 'TEE provides hardware trust; but side channels break isolation assumptions', severity: 'medium' },
        ]
      };
    }

    if (name === 'synthesize_clusters') {
      return {
        sessionId: params.sessionId,
        syntheses: [
          { clusterId: 'c1', narrative: 'DP-based FL spans a spectrum: central DP (DP-FedAvg) offers best utility but needs trusted server; local DP provides strong per-client guarantees at high utility cost; privacy amplification via subsampling bridges the gap; compression adds efficiency but complicates privacy accounting.' },
          { clusterId: 'c2', narrative: 'Secure aggregation protocols form a hierarchy: pairwise masking (SecAgg) is efficient but limited to sum; HE (CKKS) enables general computation with ciphertext expansion; MPC gives information-theoretic security at 100x overhead; TEE provides hardware trust but side-channels persist.' },
          { clusterId: 'c3', narrative: 'Byzantine-robust privacy unifies two threat models: trimmed mean + Gaussian noise achieves optimal trade-offs matching separate lower bounds, but require known Byzantine fraction and may fail under adaptive attacks.' },
          { clusterId: 'c4', narrative: 'Attacks reveal fundamental limits: split learning is vulnerable to gradient inversion; MI attacks succeed even with DP at reasonable ε; unlearning approximates removal but exact unlearning is prohibitive. Defenses must address both attack vectors.' },
        ],
        overallNarrative: 'Federated learning privacy research has converged on three pillars: differential privacy (utility vs trust), secure computation (efficiency vs guarantees), and attack resilience (adaptive threats). The field needs unified frameworks combining all three, with rigorous composition across rounds, heterogeneity, and adaptive adversaries.'
      };
    }

    if (name === 'assess_novelty') {
      return { noveltyScore: Math.floor(60 + Math.random() * 35), similarClaims: [] };
    }

    if (name === 'propose_gap') {
      const gaps = [
        { claim: 'Adaptive differential privacy that allocates privacy budget dynamically per client per round based on data heterogeneity and contribution', noveltyScore: 85, feasibility: 78, impact: 88 },
        { claim: 'Unified secure aggregation framework composing DP, MPC, and TEE with formal composition theorems across heterogeneous threat models', noveltyScore: 88, feasibility: 65, impact: 92 },
        { claim: 'Certified defense against adaptive membership inference in federated learning with provable robustness guarantees', noveltyScore: 90, feasibility: 60, impact: 95 },
        { claim: 'Communication-efficient federated unlearning with exact removal guarantees and bounded privacy leakage', noveltyScore: 82, feasibility: 72, impact: 85 },
        { claim: 'Label-conditional differential privacy for federated learning exploiting public feature extractors', noveltyScore: 78, feasibility: 85, impact: 80 },
      ];
      const gap = gaps[Math.floor(Math.random() * gaps.length)];
      return { gap, noveltyResult: { noveltyScore: gap.noveltyScore, similarClaims: [] } };
    }

    if (name === 'rank_gaps') {
      return {
        rankedGaps: [
          { claim: 'Adaptive differential privacy with dynamic per-client budget allocation', rank: 1, score: 0.84 },
          { claim: 'Unified secure aggregation framework with formal composition theorems', rank: 2, score: 0.81 },
          { claim: 'Certified defense against adaptive membership inference', rank: 3, score: 0.79 },
          { claim: 'Communication-efficient federated unlearning with exact guarantees', rank: 4, score: 0.77 },
          { claim: 'Label-conditional differential privacy with public feature extractors', rank: 5, score: 0.74 },
        ]
      };
    }

    if (name === 'simulate_adversarial_review') {
      const objections = [
        'Dynamic budget allocation requires per-client sensitivity estimation; may leak information',
        'Composition across heterogeneous mechanisms (DP+MPC+TEE) lacks formal framework',
        'Certified robustness typically assumes fixed attack family; adaptive adversaries break certificates',
        'Exact unlearning with communication efficiency is fundamentally at odds; influence functions approximate',
        'Label-conditional DP assumes feature extractor is public; if compromised, full data exposed',
      ];
      return {
        gapId: params.gapId,
        iteration: params.iteration || 1,
        verdict: Math.random() > 0.35 ? 'PASS' : 'OBJECTION',
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
          objections: verdict === 'OBJECTION' ? ['Dynamic sensitivity estimation leaks meta-information', 'Cross-round composition needs formal proof'] : [],
          objectionStrength: verdict === 'OBJECTION' ? Math.floor(50 + Math.random() * 40) : 0,
          confidence: Math.floor(60 + Math.random() * 30)
        });
      }
      return {
        topic: params.topic,
        gap: { claim: 'Adaptive differential privacy with dynamic per-client budget allocation', noveltyScore: 85 },
        reviews,
        passed: reviews[reviews.length - 1].verdict === 'PASS'
      };
    }

    if (name === 'compute_resilience_score') {
      return { gapId: params.gapId, resilienceScore: Math.floor(65 + Math.random() * 30), breakdown: { objectionStrength: 42, recencyPenalty: 3, citationDensity: 12 } };
    }

    if (name === 'render_verdict') {
      const s = Math.floor(70 + Math.random() * 25);
      return { gapId: params.gapId, finalVerdict: s >= 80 ? 'PASS' : s >= 60 ? 'CONDITIONAL' : 'REJECT', resilienceScore: s, reasoning: 'Strong resilience with addressable objections. Adaptive DP budgeting is theoretically grounded and empirically validated.' };
    }

    if (name === 'generate_citation') {
      return { citation: '[1] Abadi et al., "Deep Learning with Differential Privacy", ACM CCS 2016.', style: params.style };
    }
    if (name === 'export_bibtex') {
      return { bibtex: '@article{abadi2016deep,\n  title={Deep learning with differential privacy},\n  author={Abadi, Martin and others},\n  journal={ACM CCS},\n  year={2016}\n}' };
    }
    if (name === 'manage_bibliography') {
      return { action: params.action, paperIds: params.paperIds, success: true };
    }
    if (name === 'check_writing') {
      return { section: params.section, tone: { score: 80, feedback: 'Strong academic tone, precise terminology' }, aiGeneric: { flags: ['In this paper, we propose...'], score: 70 }, clarity: { score: 85, suggestions: ['Define "client" vs "server" threat model early'] } };
    }
    if (name === 'verify_claim') {
      return { claimId: params.claimId, verified: true, confidence: 85, evidence: ['Extracted from paper', 'Consistent with methodology'] };
    }
    if (name === 'verify_citation') {
      return { paperId: params.paperId, accurate: true, issues: [] };
    }
    if (name === 'run_all_verifications') {
      return { sessionId: params.sessionId, summary: { total: 14, passed: 11, failed: 2, warnings: 1 } };
    }
    if (name === 'save_session') {
      const id = params.sessionId || `fl_sess_${Date.now()}`;
      sessions.set(id, { ...params, sessionId: id, updatedAt: new Date().toISOString() });
      return { sessionId: id, saved: true };
    }
    if (name === 'load_session') {
      return sessions.get(params.sessionId) || { error: 'Not found' };
    }
    if (name === 'search_knowledge_graph') {
      return { entities: ['Federated Learning', 'Differential Privacy', 'Secure Aggregation', 'Byzantine Robustness', 'Membership Inference'], relations: [] };
    }
    if (name === 'create_overleaf_project') {
      const pid = `fl_proj_${Date.now()}`;
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

async function runFLPrivacyWorkflow() {
  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║     SCHOLARPILOT RESEARCH WORKFLOW — Federated Learning Privacy (2020+)    ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  const mcp = createMockMCPClient();
  const sessionId = 'fl-privacy-research-2026';
  let currentSession = { sessionId, topic: 'Federated Learning Privacy', phase: 0, papers: [] };

  console.log('┌──────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ PHASE 0 — PRIOR WORK SEARCH                                                  │');
  console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

  console.log('🔍 Searching prior work: "federated learning privacy"...\n');
  const priorWork = await mcp.callTool('search_prior_work', { topic: 'federated learning privacy', maxPapers: 20 });
  currentSession.papers = priorWork.papers;
  console.log(`📚 Found ${priorWork.papers.length} relevant papers (2020+):\n`);
  priorWork.papers.forEach((p, i) => {
    console.log(`  ${i + 1}. [${p.year}] ${p.title}`);
    console.log(`     ${p.authors.slice(0, 3).join(', ')}${p.authors.length > 3 ? ' et al.' : ''} | ${p.venue} | ${p.citationCount?.toLocaleString()} citations | ${p.quartile}`);
  });

  console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ PHASE 1 — PAPER SEARCH & RELEVANCE SCORING                                   │');
  console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

  console.log('🔍 Searching and scoring papers...\n');
  const searchResult = await mcp.callTool('search_papers', { query: 'federated learning privacy differential privacy secure aggregation', yearFrom: 2020, limit: 20 });
  for (const paper of searchResult.papers) {
    const score = await mcp.callTool('score_paper_relevance', { paperId: paper.paperId });
    paper.relevanceScore = score.score;
    console.log(`  [${score.score}%] ${paper.title} (${paper.year})`);
  }
  searchResult.papers.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  currentSession.papers = searchResult.papers;

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
    await mcp.callTool('extract_paper_metadata', { paperId: paper.paperId });
  }
  console.log(`\n📊 Total claims extracted: ${allClaims.length}`);

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
  synthesis.syntheses.forEach(s => console.log(`  ${s.clusterId}: ${s.narrative}`));
  console.log(`\n📋 Overall: ${synthesis.overallNarrative}`);

  currentSession.clusters = clusters.clusters;
  currentSession.contradictions = contradictions.contradictions;
  currentSession.synthesis = synthesis;

  console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ PHASE 4 — GAP FINDER & NOVELTY ASSESSMENT                                    │');
  console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

  console.log('🎯 Assessing novelty of top gap candidate...\n');
  const novelty = await mcp.callTool('assess_novelty', { claim: 'Adaptive differential privacy with dynamic per-client budget allocation based on data heterogeneity', evidence: [] });
  console.log(`   Novelty Score: ${novelty.noveltyScore}/100`);

  console.log('\n💡 Proposing research gap...\n');
  const gapProposal = await mcp.callTool('propose_gap', { topic: 'Federated Learning Privacy', sessionId });
  console.log(`   Gap Claim: ${gapProposal.gap.claim}`);
  console.log(`   Novelty: ${gapProposal.gap.noveltyScore} | Feasibility: ${gapProposal.gap.feasibility} | Impact: ${gapProposal.gap.impact}`);

  console.log('\n📊 Ranking gaps...\n');
  const ranked = await mcp.callTool('rank_gaps', { topic: 'Federated Learning Privacy', sessionId });
  ranked.rankedGaps.forEach(g => console.log(`   #${g.rank} (${(g.score * 100).toFixed(0)}%): ${g.claim}`));

  currentSession.gap = gapProposal.gap;
  currentSession.rankedGaps = ranked.rankedGaps;

  console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ PHASE 5 — ADVERSARIAL REVIEW & RETRY LOOP                                    │');
  console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

  console.log('🛡️  Running gap review cycle (max 3 iterations)...\n');
  const reviewCycle = await mcp.callTool('run_gap_review_cycle', { topic: 'Federated Learning Privacy', maxRetries: 3 });
  reviewCycle.reviews.forEach(r => {
    console.log(`  Iteration ${r.iteration}: ${r.verdict}`);
    if (r.objections.length) r.objections.forEach(o => console.log(`    ↳ ${o}`));
    console.log(`    Objection Strength: ${r.objectionStrength} | Confidence: ${r.confidence}`);
  });
  console.log(`\n✅ Gap survived review: ${reviewCycle.passed ? 'YES' : 'NO'}`);

  console.log('\n🔍 Single adversarial review on top gap...\n');
  const advReview = await mcp.callTool('simulate_adversarial_review', { gapId: 'gap-top', gapClaim: reviewCycle.gap.claim, evidence: [] });
  console.log(`   Verdict: ${advReview.verdict}`);
  console.log(`   Objections: ${advReview.objections.join('; ')}`);
  console.log(`   Objection Strength: ${advReview.objectionStrength} | Confidence: ${advReview.confidence}`);

  currentSession.reviews = reviewCycle.reviews;
  currentSession.adversarialReview = advReview;

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

  console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ PHASE 9-11 — CITATIONS, WRITING, VERIFICATION                                │');
  console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

  console.log('📚 Generating citations...\n');
  const citation = await mcp.callTool('generate_citation', { paperId: 'fl1', style: 'IEEE' });
  console.log(`   IEEE: ${citation.citation}`);
  const bibtex = await mcp.callTool('export_bibtex', { paperIds: ['fl1', 'fl2', 'fl5', 'fl7', 'fl14'] });
  console.log(`   BibTeX entries: ${(bibtex.bibtex.match(/@/g) || []).length}`);

  console.log('\n✍️  Writing assistance check...\n');
  const writing = await mcp.callTool('check_writing', { section: 'We propose an adaptive differential privacy mechanism for federated learning that dynamically allocates privacy budget per client per round based on local data heterogeneity and gradient contribution magnitude.' });
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

  console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ PHASE 12 — MEMORY PERSISTENCE                                                │');
  console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

  console.log('💾 Saving session...\n');
  const saved = await mcp.callTool('save_session', { ...currentSession, topic: 'Federated Learning Privacy', phase: 6, papers: currentSession.papers.map(p => p.paperId) });
  console.log(`   Session saved: ${saved.sessionId}`);

  console.log('\n🔍 Loading session back...\n');
  const loaded = await mcp.callTool('load_session', { sessionId: saved.sessionId });
  console.log(`   Loaded: ${loaded.topic} | Phase: ${loaded.phase} | Papers: ${loaded.papers?.length || 0}`);

  console.log('\n🕸️  Searching knowledge graph...\n');
  const kg = await mcp.callTool('search_knowledge_graph', { query: 'federated learning privacy differential privacy' });
  console.log(`   Entities: ${kg.entities.join(', ')}`);

  console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ PHASE 13 — OVERLEAF EXPORT (MODE 2)                                          │');
  console.log('└──────────────────────────────────────────────────────────────────────────────┘\n');

  console.log('📄 Creating Overleaf project from IEEE template...\n');
  const overleaf = await mcp.callTool('create_overleaf_project', { title: 'Adaptive Differential Privacy for Heterogeneous Federated Learning', authors: ['Research Team'], template: 'ieee', sessionId: saved.sessionId });
  console.log(`   Project created: ${overleaf.projectId}`);

  console.log('\n📝 Pushing sections...\n');
  const sections = [
    { section: 'abstract', content: 'We present AdaDP-FL, an adaptive differential privacy framework for heterogeneous federated learning...' },
    { section: 'introduction', content: 'Federated learning enables collaborative training without raw data sharing...' },
    { section: 'related-work', content: 'Prior work on FL privacy spans differential privacy, secure aggregation, and attack defenses...' },
    { section: 'methodology', content: 'AdaDP-FL dynamically allocates privacy budget based on client contribution and data heterogeneity...' },
    { section: 'experiments', content: 'We evaluate on CIFAR-10, FEMNIST, and Shakespeare with non-IID partitions...' },
    { section: 'results', content: 'AdaDP-FL achieves 3.2% higher accuracy at ε=1.0 vs DP-FedAvg baseline...' },
    { section: 'discussion', content: 'Dynamic budget allocation adapts to client heterogeneity...' },
    { section: 'limitations', content: 'Sensitivity estimation may leak meta-information; assumes honest server...' },
    { section: 'conclusion', content: 'We introduced adaptive differential privacy for FL...' },
  ];
  for (const s of sections) {
    const result = await mcp.callTool('push_section_to_overleaf', { ...s, sessionId: saved.sessionId });
    console.log(`   Pushed ${s.section} (${result.contentLength} chars)`);
  }

  console.log('\n⚠️  Pushing limitations from reviewer objections...\n');
  const limitations = await mcp.callTool('push_limitations_from_reviewer', { objections: reviewCycle.reviews.flatMap(r => r.objections).filter(Boolean), sessionId: saved.sessionId });
  console.log(`   Pushed ${limitations.objectionsCount} objections as limitations`);

  console.log('\n📚 Adding bibliography...\n');
  const bib = await mcp.callTool('add_bibliography_to_overleaf', { bibtex: bibtex.bibtex, sessionId: saved.sessionId });
  console.log(`   Added ${bib.entriesAdded} bibliography entries`);

  console.log('\n🔄 Final sync...\n');
  const sync = await mcp.callTool('sync_session_to_overleaf', { sessionId: saved.sessionId, createIfMissing: false });
  console.log(`   Sections synced: ${sync.sectionsSynced}`);
  console.log(`   Has bibliography: ${sync.hasBibliography}`);
  console.log(`   Has limitations: ${sync.hasLimitations}`);

  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                        RESEARCH WORKFLOW COMPLETE                          ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  console.log('📋 SESSION SUMMARY — Federated Learning Privacy (2020+)');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`   Session ID: ${saved.sessionId}`);
  console.log(`   Papers Analyzed: ${currentSession.papers.length}`);
  console.log(`   Claims Extracted: ${allClaims.length}`);
  console.log(`   Clusters Found: ${clusters.clusters.length}`);
  console.log(`   Contradictions Identified: ${contradictions.contradictions.length}`);
  console.log(`\n   Top 3 Research Gaps (Ranked):`);
  ranked.rankedGaps.slice(0, 3).forEach(g => console.log(`     #${g.rank}: ${g.claim}`));
  console.log(`\n   Top Gap: ${gapProposal.gap.claim}`);
  console.log(`     Novelty: ${gapProposal.gap.noveltyScore}/100 | Feasibility: ${gapProposal.gap.feasibility}/100 | Impact: ${gapProposal.gap.impact}/100`);
  console.log(`   Review Cycles: ${reviewCycle.reviews.length} (Final: ${reviewCycle.reviews[reviewCycle.reviews.length - 1].verdict})`);
  console.log(`   Adversarial Review: ${advReview.verdict} (Objection Strength: ${advReview.objectionStrength})`);
  console.log(`   Resilience Score: ${verdict.resilienceScore}/100`);
  console.log(`   FINAL VERDICT: ${verdict.finalVerdict}`);
  console.log(`   Verification: ${verification.summary.passed}/${verification.summary.total} passed`);
  console.log(`   Overleaf Project: ${overleaf.projectId} (${sync.sectionsSynced} sections)`);
  console.log(`\n🚀 Next Steps:`);
  console.log(`   1. Review Overleaf draft and address 2 failed verification checks`);
  console.log(`   2. Formalize adaptive sensitivity estimation proof`);
  console.log(`   3. Run experiments on FEMNIST + Shakespeare benchmarks`);
  console.log(`   4. Submit to IEEE S&P / ACM CCS / NeurIPS 2026\n`);
}

runFLPrivacyWorkflow().catch(console.error);