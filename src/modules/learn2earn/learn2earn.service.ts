import { Injectable } from '@nitrostack/core';
import { GoogleGenAI } from '@google/genai';
import { JEE_SYLLABUS } from '../../data/jee-syllabus.js';
import {
  SessionData,
  Concept,
  SourceMode,
  ExternalContext,
  ProgressLogEntry,
  LearningRoadmap,
  RoadmapMilestone,
  TopicAnalysis,
  LessonContent,
} from '../../types/learn2earn.types.js';

/**
 * Learn2EarnService
 *
 * Ported from the original Learn2Earn AI Studio app (server.ts). This keeps the
 * same Gemini prompt engineering, fallback generators, and grading logic — just
 * reorganized as an injectable NitroStack service instead of Express handlers,
 * so it can be called from decorator-based MCP @Tool methods.
 *
 * Session state is held in-memory per server process (single active session),
 * matching the original app's behavior. For a production multi-user deployment
 * you'd key this by ctx.auth.subject / a session id instead.
 */
@Injectable()
export class Learn2EarnService {
  private ai: GoogleGenAI;
  private currentSession: SessionData | null = null;
  private currentRoadmap: LearningRoadmap | null = null;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || '',
    });
  }

  getSession(): SessionData | null {
    return this.currentSession;
  }

  getRoadmap(): LearningRoadmap | null {
    return this.currentRoadmap;
  }

  // ---------------------------------------------------------------------
  // Low-level helpers
  // ---------------------------------------------------------------------

  private addProgressLog(
    event: ProgressLogEntry['event'],
    details: string,
    concept_id?: string,
    concept_name?: string
  ) {
    if (!this.currentSession) return;
    const entry: ProgressLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      event,
      details,
      concept_id,
      concept_name,
    };
    this.currentSession.progress_log.unshift(entry);
  }

  private cleanJsonResponse(raw: string): string {
    let cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      cleaned = cleaned.substring(startIdx, endIdx + 1);
    }
    return cleaned;
  }

  /** Calls Gemini with retry + model fallback. Throws if unavailable so callers can use deterministic fallback generators. */
  private async callGemini(prompt: string, maxRetries = 1): Promise<string> {
    const truncatedPrompt = prompt.length > 16000 ? prompt.substring(0, 16000) + '\n[Truncated input]' : prompt;

    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash'];

    for (const modelName of modelsToTry) {
      let attempts = 0;
      let currentPrompt = truncatedPrompt;

      while (attempts <= maxRetries) {
        try {
          const response = await this.ai.models.generateContent({
            model: modelName,
            contents: currentPrompt,
            config: {
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
          });

          const text = response.text || '';
          const cleaned = this.cleanJsonResponse(text);
          JSON.parse(cleaned);
          return cleaned;
        } catch (err: any) {
          attempts++;
          const errMsg = String(err?.message || err);
          const isQuotaExceeded =
            errMsg.includes('429') ||
            errMsg.includes('RESOURCE_EXHAUSTED') ||
            errMsg.includes('Quota exceeded') ||
            errMsg.includes('rate-limits') ||
            errMsg.includes('free_tier_requests');

          if (isQuotaExceeded) break; // move to next model
          if (attempts > maxRetries) break;
          currentPrompt =
            truncatedPrompt + '\n\nCRITICAL: Return ONLY valid, raw JSON. Do not include markdown or explanatory text.';
        }
      }
    }

    throw new Error('LLM Rate Limit / Quota Exceeded');
  }

  async fetchWikipediaContext(conceptName: string): Promise<ExternalContext> {
    const sanitizedName = conceptName.trim();
    const wikiApiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(sanitizedName)}`;

    try {
      const res = await fetch(wikiApiUrl, {
        headers: { 'User-Agent': 'Learn2Earn-AI-MCP/1.0 (https://learn2earn.ai; contact@learn2earn.ai)' },
      });

      if (res.ok) {
        const data: any = await res.json();
        if (data && (data.extract || data.description)) {
          return {
            source: 'Wikipedia REST API',
            title: data.title || sanitizedName,
            summary: data.extract || data.description || `Reference information for ${sanitizedName}.`,
            url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(sanitizedName)}`,
            thumbnail: data.thumbnail?.source || undefined,
          };
        }
      }
    } catch {
      // fall through to fallback below
    }

    return {
      source: 'Wikipedia Search Reference',
      title: sanitizedName,
      summary: `${sanitizedName} is a core learning concept within this study module. Explore further details and peer-reviewed documentation on Wikipedia.`,
      url: `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(sanitizedName)}`,
    };
  }

  // ---------------------------------------------------------------------
  // Fallback generators (used when GEMINI_API_KEY is missing / rate-limited)
  // ---------------------------------------------------------------------

  private generateFallbackConcepts(topic: string): Concept[] {
    const cleanTopic = topic.trim() || 'Core Subject';
    const names = [
      `1. Foundations & Scope of ${cleanTopic}`,
      `1a. [Small Topic] Key Terms, Notation & Definitions`,
      `2. Core Mathematical & Theoretical Principles`,
      `2a. [Small Topic] Standard Formula Derivations`,
      `3. Primary Mechanisms & Operational Models`,
      `3a. [Small Topic] Step-by-Step Problem Solving`,
      `4. Intermediate Workflows & Structural Analysis`,
      `4a. [Small Topic] Boundary Conditions & Edge Cases`,
      `5. Advanced System Applications & Integration`,
      `5a. [Small Topic] Exam Traps & Common Misconceptions`,
      `6. Comprehensive Synthesis & Practical Mastery`,
    ];

    return names.map((name, index) => ({
      id: `c${index + 1}`,
      name,
      prerequisites: index === 0 ? [] : [`c${index}`],
      status: index === 0 ? ('unlocked_for_study' as const) : ('locked' as const),
      quiz: [],
      reward_amount: 0,
    }));
  }

  private generateJeeFallbackQuiz(chapterName: string, subject: string) {
    const subName = subject ? subject.charAt(0).toUpperCase() + subject.slice(1) : 'Physics';
    return [
      {
        id: `q1_theory_${Date.now()}`,
        type: 'theory_mcq' as const,
        question: `In JEE Mains ${subName} (${chapterName}), which of the following statements correctly describes the fundamental governing law/mechanism?`,
        options: [
          `The primary governing equation holds under ideal conservation conditions with non-dissipative state parameters.`,
          `System response varies inversely with field strength regardless of boundary potential.`,
          `Dissipative energy loss is strictly zero across all transition regimes.`,
          `Intermediate state variables operate independently of initial boundary conditions.`,
        ],
        correct_index: 0,
        explanation: `In ${chapterName}, fundamental conservation laws govern state transformations under specified boundary conditions.`,
      },
      {
        id: `q2_theory_${Date.now()}`,
        type: 'theory_mcq' as const,
        question: `When solving JEE Mains questions on ${chapterName}, which common conceptual pitfall must be avoided?`,
        options: [
          `Assuming simplified linear relationships without verifying constraint limits or dimensional consistency.`,
          `Converting input magnitudes into standard SI units prior to formula substitution.`,
          `Evaluating net directional components using vector decomposition rules.`,
          `Applying conservation principles to isolated closed systems.`,
        ],
        correct_index: 0,
        explanation: `A standard JEE trap involves ignoring constraint boundaries or dimensional parameters before selecting an answer.`,
      },
      {
        id: `q3_num_${Date.now()}`,
        type: 'numerical' as const,
        question: `Calculate the net scalar result for a standard 2-step process in ${chapterName} given initial magnitude X = 10 and scaling factor k = 1.25. (Enter exact numerical value)`,
        correct_value: 12.5,
        tolerance: 0.1,
        unit: subject === 'physics' ? 'm/s' : subject === 'chemistry' ? 'mol/L' : null,
        explanation: `Result = 10 * 1.25 = 12.5. Answers within ±0.1 are graded correct.`,
      },
      {
        id: `q4_num_${Date.now()}`,
        type: 'numerical' as const,
        question: `In a JEE Mains model scenario for ${chapterName}, 4 identical parallel branches each handle 1 unit of capacity. Determine the total throughput value.`,
        correct_value: 4.0,
        tolerance: 0.1,
        unit: null,
        explanation: `Total throughput = 4 branches * 1 = 4.0.`,
      },
    ];
  }

  private generateFallbackQuiz(conceptName: string, topicName: string, count: number = 25) {
    const questionPool: any[] = [];
    const countToGen = Math.min(Math.max(count, 1), 30);

    const templates = [
      {
        q: (c: string, t: string) => `What is a fundamental objective when applying ${c} in ${t}?`,
        correct: (c: string, t: string) => `To understand its core mechanics and practical application within ${t}`,
        wrongs: (c: string, t: string) => [
          `To memorize definitions without understanding practical context`,
          `To replace all prior baseline knowledge in ${t}`,
          `To isolate it completely from other domain principles`,
        ],
        explanation: (c: string, t: string) =>
          `Understanding core mechanics and practical application allows learners to adapt ${c} effectively across diverse contexts within ${t}, rather than relying on shallow memorization.`,
      },
      {
        q: (c: string, t: string) => `Which approach best demonstrates genuine mastery of ${c}?`,
        correct: (c: string, t: string) => `Applying its core principles to solve practical, real-world problems in ${t}`,
        wrongs: (c: string, t: string) => [
          `Ignoring prerequisite relationships and jumping straight to conclusions`,
          `Guessing theoretical outcomes randomly without checking assumptions`,
          `Skipping core validation steps and assuming flawless execution`,
        ],
        explanation: (c: string, t: string) =>
          `Mastery is proven when a learner can apply abstract theoretical principles of ${c} to solve concrete, real-world scenarios within ${t}.`,
      },
      {
        q: (c: string, t: string) => `How does ${c} integrate into the overall study of ${t}?`,
        correct: (c: string, t: string) => `It serves as a critical structural component linking concepts together in ${t}`,
        wrongs: (c: string, t: string) => [
          `It is purely optional with no real-world relevance to ${t}`,
          `It directly contradicts foundational principles of ${t}`,
          `It applies only to temporary test environments and cannot scale`,
        ],
        explanation: (c: string, t: string) =>
          `${c} connects fundamental prerequisites with advanced techniques, serving as a structural bridge across the domain of ${t}.`,
      },
      {
        q: (c: string, t: string) => `What is a common misconception regarding ${c}?`,
        correct: (c: string, t: string) => `Assuming it functions independently without relying on core prerequisites`,
        wrongs: (c: string, t: string) => [
          `Recognizing that structured evaluation improves long-term retention`,
          `Understanding that key concepts require systematic practice`,
          `Expecting real-world scenarios to involve variable conditions`,
        ],
        explanation: (c: string, t: string) =>
          `${c} builds directly upon prerequisite concepts. Treating it as an isolated module ignores its dependencies within ${t}.`,
      },
      {
        q: (c: string, t: string) => `When evaluating ${c}, why is rigorous verification essential?`,
        correct: (c: string, t: string) => `To ensure consistency, prevent edge-case failures, and maintain quality`,
        wrongs: (c: string, t: string) => [
          `To artificially increase complexity without functional benefit`,
          `To bypass standard protocol guidelines and shortcut progress`,
          `To render prior learning obsolete and force complete resets`,
        ],
        explanation: (c: string, t: string) =>
          `Rigorous verification validates edge cases and guarantees consistent performance when executing ${c} in production settings.`,
      },
      {
        q: (c: string, t: string) => `Which metric best indicates that a learner understands ${c}?`,
        correct: (c: string, t: string) => `Consistently scoring 80% or higher on randomized concept evaluations`,
        wrongs: (c: string, t: string) => [
          `Memorizing exact option positions from past quiz attempts`,
          `Answering questions without reading the underlying context`,
          `Completing quizzes without reviewing prerequisite topics`,
        ],
        explanation: () =>
          `Achieving 80%+ on randomized question pools tests conceptual comprehension rather than option position memorization.`,
      },
      {
        q: (c: string, t: string) => `In practical implementations, what role does ${c} play?`,
        correct: (c: string, t: string) => `It acts as an operational building block for advanced workflows in ${t}`,
        wrongs: (c: string, t: string) => [
          `It acts solely as an aesthetic feature with no functional purpose`,
          `It prevents other components from communicating with each other`,
          `It automatically deletes prior session state upon execution`,
        ],
        explanation: (c: string, t: string) =>
          `${c} acts as a modular component that enables higher-level system architecture and workflow execution in ${t}.`,
      },
      {
        q: (c: string, t: string) => `Why does changing quiz questions randomly prevent cheating in ${c}?`,
        correct: () => `Because learners must master concepts rather than memorizing option patterns`,
        wrongs: () => [
          `Because it lowers the passing score requirement below standard levels`,
          `Because option order remains identical across all quiz attempts`,
          `Because it eliminates the need for prerequisite concept tracking`,
        ],
        explanation: () =>
          `Randomizing option choices and question order forces students to evaluate content logic rather than relying on option letter shortcuts.`,
      },
      {
        q: (c: string, t: string) => `What is the primary benefit of achieving 80%+ mastery in ${c}?`,
        correct: () => `It unlocks reward stake and enables progression to dependent concepts`,
        wrongs: () => [
          `It permanently locks all wallet balances from future access`,
          `It disables feedback logs and hides session performance data`,
          `It resets the entire topic map back to initial zero state`,
        ],
        explanation: () => `Meeting the 80% threshold unlocks locked financial stake while opening downstream learning nodes.`,
      },
      {
        q: (c: string, t: string) => `Which step should be taken if a student scores below 80% on ${c}?`,
        correct: () => `Review the concept summary and retry with a fresh set of randomized questions`,
        wrongs: () => [
          `Immediately force reward payout without meeting the pass threshold`,
          `Disable retries and prevent any future attempts on the topic`,
          `Skip the concept completely and lock all remaining sub-topics`,
        ],
        explanation: () => `Reviewing explanation feedback and re-attempting a fresh randomized set builds true mastery before progression.`,
      },
    ];

    for (let i = 0; i < countToGen; i++) {
      const template = templates[i % templates.length];
      const variationSeed = Math.floor(i / templates.length) + 1;
      const varSuffix = variationSeed > 1 ? ` (Scenario Variant ${variationSeed})` : '';

      const questionText = template.q(conceptName, topicName) + varSuffix;
      const correctAns = template.correct(conceptName, topicName);
      const wrongAns = template.wrongs(conceptName, topicName);
      const rawOptions = [correctAns, ...wrongAns];
      const expText = template.explanation(conceptName, topicName);

      const shuffled = [...rawOptions];
      for (let s = shuffled.length - 1; s > 0; s--) {
        const r = Math.floor(Math.random() * (s + 1));
        [shuffled[s], shuffled[r]] = [shuffled[r], shuffled[s]];
      }

      const correctIdx = shuffled.indexOf(correctAns);

      questionPool.push({
        id: `q${i + 1}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`,
        type: 'mcq' as const,
        question: questionText,
        options: shuffled,
        correct_index: correctIdx >= 0 ? correctIdx : 0,
        explanation: expText,
      });
    }

    for (let i = questionPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questionPool[i], questionPool[j]] = [questionPool[j], questionPool[i]];
    }

    return questionPool;
  }

  // ---------------------------------------------------------------------
  // Topic analysis
  // ---------------------------------------------------------------------

  async analyzeTopicDomain(topicTitle: string, conceptName?: string): Promise<TopicAnalysis> {
    const cleanTitle = (topicTitle || 'Study Topic').trim();
    const lower = (cleanTitle + ' ' + (conceptName || '')).toLowerCase();

    let domain: TopicAnalysis['domain'] = 'general';
    let subjectArea = cleanTitle;
    let hasFormulas = false;
    let hasCode = false;
    let keyTerms: string[] = [];
    let standardFormula: string | null = null;
    let concreteExample = '';
    let commonMisconceptions: string[] = [];
    let analogy: string | null = null;

    if (
      lower.includes('quantum') || lower.includes('physics') || lower.includes('thermodynamics') ||
      lower.includes('kinematics') || lower.includes('optics') || lower.includes('electrostatics') ||
      lower.includes('mechanics')
    ) {
      domain = 'physics';
      subjectArea = lower.includes('quantum') ? 'Physics / Quantum Mechanics' : 'Physics / Classical & Applied Physics';
      hasFormulas = true;
      if (lower.includes('quantum')) {
        keyTerms = ['Wavefunction ψ', 'State Vectors & Hilbert Space', 'Superposition Principle', "Planck's Constant h", 'Schrödinger Equation', 'Measurement & Collapse', 'Hamiltonian Operator Ĥ', 'Quantum Entanglement'];
        standardFormula = 'iℏ ∂ψ/∂t = Ĥψ   or   E = hν';
        concreteExample = 'In quantum mechanics, a state |ψ⟩ = (1/√2)|0⟩ + (1/√2)|1⟩ exists in a coherent superposition until measurement collapses it into state |0⟩ or |1⟩ with 50% probability.';
        commonMisconceptions = [
          'Confusing quantum superposition with a physical particle spinning simultaneously in two opposite directions.',
          'Assuming quantum entanglement allows faster-than-light communication.',
        ];
        analogy = 'Think of a spinning coin on a table: while spinning, it is not purely heads or tails (superposition), but measuring it flattens it into a single state.';
      } else {
        keyTerms = ['State Variables', 'Conservation Laws', 'Boundary Conditions', 'Force Vectors', 'Energy Conservation'];
        standardFormula = 'F = m·a,   E_total = K + U';
        concreteExample = 'Evaluating particle motion on an inclined plane by resolving force vectors into parallel (mg sin θ) and perpendicular (mg cos θ) components.';
        commonMisconceptions = [
          'Confusing instantaneous acceleration with constant velocity.',
          'Forgetting to verify SI unit consistency before calculations.',
        ];
        analogy = 'Think of potential energy like money in a savings account: it converts to kinetic energy as spending cash when an object falls.';
      }
    } else if (
      lower.includes('dsa') || lower.includes('computer science') || lower.includes('algorithm') ||
      lower.includes('array') || lower.includes('tree') || lower.includes('graph') ||
      lower.includes('code') || lower.includes('pointer')
    ) {
      domain = 'computer_science';
      subjectArea = 'Computer Science / Data Structures & Algorithms';
      hasCode = true;
      keyTerms = ['Time Complexity O(N)', 'Space Complexity O(1)', 'Memory Pointers & Node Structures', 'Call Stack & Recursion', 'Invariant Checks'];
      standardFormula = 'struct Node {\n    int data;\n    Node* next;\n};';
      concreteExample = 'Reversing a singly linked list in O(N) time and O(1) auxiliary space using three iterative pointers: prev, curr, and next_node.';
      commonMisconceptions = [
        'Confusing average O(N log N) time complexity with worst-case O(N²) without randomized pivot selection.',
        'Forgetting null-pointer checks before dereferencing head nodes.',
      ];
      analogy = 'Think of a singly linked list like a scavenger hunt where each clue directs you exclusively to the location of the next clue.';
    } else if (lower.includes('chemistry') || lower.includes('bonding') || lower.includes('organic') || lower.includes('reaction')) {
      domain = 'chemistry';
      subjectArea = 'Chemistry / Physical & Organic Chemistry';
      hasFormulas = true;
      keyTerms = ['Mole Concept & Stoichiometry', 'Hybridization (sp³, sp²)', 'Electronegativity', 'Equilibrium Constant K_c', 'Enthalpy ΔH'];
      standardFormula = 'K_c = [Products]^c / [Reactants]^a';
      concreteExample = 'Calculating buffer solution pH using Henderson-Hasselbalch equation: pH = pKa + log10([A⁻]/[HA]).';
      commonMisconceptions = [
        'Assuming dynamic equilibrium means chemical reactions have completely stopped.',
        'Confusing SN1 carbocation intermediates with SN2 concerted backside attack.',
      ];
      analogy = 'Think of dynamic equilibrium like a busy subway turnstile where equal numbers enter and leave every minute.';
    } else if (lower.includes('calculus') || lower.includes('math') || lower.includes('integral') || lower.includes('derivative')) {
      domain = 'mathematics';
      subjectArea = 'Mathematics / Calculus & Analysis';
      hasFormulas = true;
      keyTerms = ['Derivative Rate of Change (dy/dx)', 'Definite Integration', 'Limits & Continuity', 'Product Rule & Chain Rule'];
      standardFormula = "d/dx [f(g(x))] = f'(g(x)) · g'(x)";
      concreteExample = "Finding critical points of f(x) = x³ - 3x by solving f'(x) = 3x² - 3 = 0, yielding x = ±1.";
      commonMisconceptions = [
        'Forgetting the constant of integration +C in indefinite integrals.',
        'Confusing derivative of a product with product of derivatives.',
      ];
      analogy = 'Think of a derivative as a speedometer reading versus an integral as total distance on an odometer.';
    }

    try {
      const prompt = `Analyze the study topic "${cleanTitle}"${conceptName ? ` specifically for concept "${conceptName}"` : ''}.

Determine its exact academic/technical domain, key terminologies, whether it uses mathematical formulas or code/pseudocode, common misconceptions, and a domain-grounded example.

Return ONLY valid JSON, no markdown fences, no preamble, in this exact shape:
{
  "topic": "${cleanTitle}",
  "domain": "${domain}",
  "subject_area": "${subjectArea}",
  "core_prerequisites": ["List 2-3 essential prerequisite topics"],
  "key_terminologies": ["List 4-8 exact technical terms used in this topic"],
  "has_formulas": ${hasFormulas},
  "has_code_syntax": ${hasCode},
  "standard_formula_or_syntax": ${standardFormula ? JSON.stringify(standardFormula) : 'null'},
  "concrete_worked_example": ${concreteExample ? JSON.stringify(concreteExample) : `"A realistic example illustrating ${cleanTitle}"`},
  "common_misconceptions": ${commonMisconceptions.length > 0 ? JSON.stringify(commonMisconceptions) : `["Common pitfall when applying ${cleanTitle}"]`},
  "apt_analogy": ${analogy ? JSON.stringify(analogy) : 'null'},
  "learning_objectives": ["Understand core mechanics", "Apply in problem solving", "Identify edge cases"]
}`;

      const jsonStr = await this.callGemini(prompt);
      const parsed = JSON.parse(jsonStr);
      if (parsed && parsed.domain && parsed.key_terminologies) {
        return {
          topic: cleanTitle,
          domain: parsed.domain || domain,
          subject_area: parsed.subject_area || subjectArea,
          core_prerequisites: Array.isArray(parsed.core_prerequisites) ? parsed.core_prerequisites : ['Foundational Definitions'],
          key_terminologies: Array.isArray(parsed.key_terminologies) && parsed.key_terminologies.length > 0 ? parsed.key_terminologies : keyTerms,
          has_formulas: Boolean(parsed.has_formulas),
          has_code_syntax: Boolean(parsed.has_code_syntax),
          standard_formula_or_syntax: parsed.standard_formula_or_syntax || standardFormula,
          concrete_worked_example: parsed.concrete_worked_example || concreteExample,
          common_misconceptions: Array.isArray(parsed.common_misconceptions) && parsed.common_misconceptions.length > 0 ? parsed.common_misconceptions : commonMisconceptions,
          apt_analogy: parsed.apt_analogy || analogy,
          learning_objectives: Array.isArray(parsed.learning_objectives) ? parsed.learning_objectives : ['Master key principles'],
        };
      }
    } catch {
      // fall through to grounded fallback below
    }

    return {
      topic: cleanTitle,
      domain,
      subject_area: subjectArea,
      core_prerequisites: ['Foundational Principles'],
      key_terminologies: keyTerms.length > 0 ? keyTerms : [`${cleanTitle} Mechanics`, 'State Variables', 'System Rules'],
      has_formulas: hasFormulas,
      has_code_syntax: hasCode,
      standard_formula_or_syntax: standardFormula,
      concrete_worked_example: concreteExample || `Realistic worked scenario demonstrating ${cleanTitle} in ${subjectArea}.`,
      common_misconceptions: commonMisconceptions.length > 0 ? commonMisconceptions : [`Confusing core definitions of ${cleanTitle} with edge-case assumptions.`],
      apt_analogy: analogy,
      learning_objectives: [`Master ${cleanTitle} core concepts`, 'Solve practical problems', 'Identify common misconceptions'],
    };
  }

  // ---------------------------------------------------------------------
  // Sessions
  // ---------------------------------------------------------------------

  async startJeeSession(subjects: string[] = ['physics', 'chemistry', 'maths'], depositAmount: number = 1000): Promise<SessionData> {
    const selectedSubjects = Array.isArray(subjects) && subjects.length > 0
      ? subjects.filter((s) => ['physics', 'chemistry', 'maths'].includes(String(s).toLowerCase()))
      : ['physics', 'chemistry', 'maths'];

    if (selectedSubjects.length === 0) selectedSubjects.push('physics', 'chemistry', 'maths');

    const deposit = Math.max(0, Number(depositAmount) || 0);

    const rawConcepts: Concept[] = [];
    let totalChapters = 0;
    selectedSubjects.forEach((subKey) => {
      totalChapters += (JEE_SYLLABUS[subKey] || []).length;
    });

    const rewardPerChapter = totalChapters > 0 ? Math.floor(deposit / totalChapters) : 0;
    const remainder = deposit - rewardPerChapter * totalChapters;

    selectedSubjects.forEach((subKey) => {
      const chapters = JEE_SYLLABUS[subKey] || [];
      chapters.forEach((chapName, idx) => {
        const conceptId = `${subKey.substring(0, 3)}_${idx + 1}`;
        const reward = rewardPerChapter + (rawConcepts.length === 0 ? remainder : 0);
        rawConcepts.push({
          id: conceptId,
          name: chapName,
          subject: subKey,
          prerequisites: [],
          status: idx === 0 ? 'unlocked_for_study' : 'locked',
          quiz: [],
          reward_amount: reward,
        });
      });
    });

    this.currentSession = {
      session_id: `s_jee_${Date.now()}`,
      topic: `JEE Mains Syllabus (${selectedSubjects.map((s) => s.toUpperCase()).join(' • ')})`,
      source_mode: 'jee',
      selected_subjects: selectedSubjects,
      is_free_mode: deposit === 0,
      concepts: rawConcepts,
      wallet: { deposited: deposit, locked: deposit, unlocked: 0 },
      progress_log: [],
      created_at: new Date().toISOString(),
    };

    this.addProgressLog('session_started', `Started JEE Mains learning session across ${selectedSubjects.join(', ')} (${rawConcepts.length} chapters) with ₹${deposit} locked stake.`);

    return this.currentSession;
  }

  async startSession(mode: SourceMode, content: string, depositAmount: number, subjects?: string[]): Promise<SessionData> {
    const sourceMode: SourceMode = mode || 'topic';
    if (sourceMode === 'jee') {
      return this.startJeeSession(subjects, depositAmount);
    }

    const deposit = Math.max(0, Number(depositAmount) || 0);
    const inputContent = String(content || '').trim();
    if (!inputContent) throw new Error('Content parameter is required.');

    let topicTitle = 'Study Topic';
    let prompt = '';

    if (sourceMode === 'topic') {
      topicTitle = inputContent;
      prompt = `The learner wants to study "${topicTitle}". Create an expanded, detailed learning map containing 10 to 15 concepts breaking down this topic into foundational concepts, core mechanisms, key sub-topics/small topics, edge cases, and advanced applications in a logical learning hierarchy. Ensure essential small sub-topics are explicitly included as individual nodes.

Return ONLY valid JSON, no markdown fences, no preamble, in this exact shape:
{
  "concepts": [
    { "id": "c1", "name": "string", "prerequisites": ["c_id"] }
  ]
}
prerequisites must reference earlier concept ids only (no forward or circular refs).`;
    } else {
      const snippet = inputContent.length > 200 ? inputContent.substring(0, 100) + '...' : inputContent;
      topicTitle = snippet.split('\n')[0] || 'Custom Document Study';
      prompt = `Here is study material provided by a learner:
"""
${inputContent.substring(0, 12000)}
"""

Create an expanded, detailed learning map containing 10 to 15 concepts breaking down this study material into foundational concepts, intermediate mechanisms, specific small sub-topics, and advanced applications in a logical hierarchy.

Return ONLY valid JSON, no markdown fences, no preamble, in this exact shape:
{
  "concepts": [
    { "id": "c1", "name": "string", "prerequisites": ["c_id"] }
  ]
}`;
    }

    let rawConcepts: Array<{ id: string; name: string; prerequisites?: string[] }> = [];
    try {
      const jsonStr = await this.callGemini(prompt);
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed.concepts) && parsed.concepts.length > 0) {
        rawConcepts = parsed.concepts;
      } else {
        throw new Error('No concepts returned in JSON');
      }
    } catch {
      rawConcepts = this.generateFallbackConcepts(topicTitle);
    }

    const conceptCount = rawConcepts.length;
    const baseReward = Math.floor(deposit / conceptCount);
    const remainder = deposit - baseReward * conceptCount;
    const validIds = new Set(rawConcepts.map((c, i) => c.id || `c${i + 1}`));

    const formattedConcepts: Concept[] = rawConcepts.map((c, idx) => {
      const id = c.id || `c${idx + 1}`;
      const prereqs = Array.isArray(c.prerequisites) ? c.prerequisites.filter((p) => validIds.has(p) && p !== id) : [];
      const reward = baseReward + (idx === 0 ? remainder : 0);
      return {
        id,
        name: c.name || `Concept ${idx + 1}`,
        prerequisites: prereqs,
        status: 'locked' as const,
        quiz: [],
        reward_amount: reward,
      };
    });

    const topicAnalysis = await this.analyzeTopicDomain(topicTitle);

    this.currentSession = {
      session_id: `s_${Date.now()}`,
      topic: topicTitle,
      source_mode: sourceMode,
      is_free_mode: deposit === 0,
      concepts: formattedConcepts,
      wallet: { deposited: deposit, locked: deposit, unlocked: 0 },
      progress_log: [],
      created_at: new Date().toISOString(),
      topic_analysis: topicAnalysis,
    };

    this.addProgressLog('session_started', `Started learning session for topic "${topicTitle}" with ₹${deposit} locked stake across ${formattedConcepts.length} concepts.`);

    return this.currentSession;
  }

  // ---------------------------------------------------------------------
  // Lessons
  // ---------------------------------------------------------------------

  private generateFallbackLesson(conceptName: string, topic: string, depth: 'quick' | 'deep', topicAnalysis?: TopicAnalysis): LessonContent {
    const isDeep = depth === 'deep';
    const subjectArea = topicAnalysis?.subject_area || topic;
    const terms = topicAnalysis?.key_terminologies || [];
    const termsText = terms.length > 0 ? terms.slice(0, 3).join(', ') : conceptName;
    const formulaOrSyntax = topicAnalysis?.has_formulas || topicAnalysis?.has_code_syntax ? topicAnalysis.standard_formula_or_syntax || null : null;
    const workedExample = topicAnalysis?.concrete_worked_example || `In ${subjectArea}, applying ${conceptName} requires evaluating system parameters and verifying boundary state conditions using standard domain mechanics.`;
    const mistakes = topicAnalysis?.common_misconceptions && topicAnalysis.common_misconceptions.length > 0
      ? topicAnalysis.common_misconceptions
      : [`Confusing core definitions of ${conceptName} with edge-case assumptions.`, `Failing to verify required boundary conditions or initialization checks.`];
    const analogyVal = topicAnalysis?.apt_analogy || null;

    return {
      summary: `${conceptName} is a core topic in ${subjectArea} focusing on ${termsText}.`,
      explanation: `${conceptName} provides the essential framework required to understand key principles in ${subjectArea}. Mastering this concept enables solving standard problem patterns and understanding advanced topics like ${terms[3] || 'system behavior'}.`,
      key_points: terms.length >= 3
        ? [
            `Primary Concept: Focuses on ${terms[0]} and governing domain principles.`,
            `Key Mechanism: Involves ${terms[1]} under standard boundary conditions.`,
            `Practical Utility: Essential for analyzing ${terms[2]} in ${subjectArea}.`,
          ]
        : [
            `Fundamental Principle: Defines primary operational characteristics for ${conceptName}.`,
            `Practical Application: Used in solving standard problem types in ${subjectArea}.`,
            `Core Prerequisite: Links foundational principles to advanced modules.`,
          ],
      example: workedExample,
      examples: isDeep ? [`Worked Example 1: ${workedExample}`, `Worked Example 2 (Advanced): Analyzing boundary conditions or edge cases for ${conceptName}.`] : undefined,
      common_mistakes: mistakes,
      analogy: analogyVal,
      formula_or_syntax: formulaOrSyntax,
      connections: isDeep ? `Connects prerequisite concepts in ${subjectArea} to follow-up advanced analytical modules.` : undefined,
    };
  }

  async generateLessonContent(conceptId: string, depth: 'quick' | 'deep' = 'quick') {
    if (!this.currentSession) throw new Error('No active learning session found. Please start a session first.');

    const concept = this.currentSession.concepts.find((c) => c.id === conceptId || c.name.toLowerCase() === conceptId.toLowerCase());
    if (!concept) throw new Error(`Concept with ID or name "${conceptId}" not found in current session.`);

    if (!concept.lessons) concept.lessons = {};

    if (concept.lessons[depth]) {
      if (concept.status === 'locked') concept.status = 'unlocked_for_study';
      return {
        session_id: this.currentSession.session_id,
        concept_id: concept.id,
        concept_name: concept.name,
        depth,
        lesson: concept.lessons[depth],
        status: concept.status,
        cached: true,
      };
    }

    if (concept.status === 'locked') concept.status = 'unlocked_for_study';

    let topicAnalysis = this.currentSession.topic_analysis;
    if (!topicAnalysis) {
      topicAnalysis = await this.analyzeTopicDomain(this.currentSession.topic, concept.name);
      this.currentSession.topic_analysis = topicAnalysis;
    }

    const subject = topicAnalysis.subject_area || this.currentSession.topic || 'General Science / Engineering';
    let prompt = '';

    if (depth === 'deep') {
      const quickSummary = concept.lessons.quick?.summary || `${concept.name} is a core concept in ${subject}`;
      const prereqs = concept.prerequisites.length > 0 ? concept.prerequisites.join(', ') : 'foundational principles';
      prompt = `You are teaching the concept "${concept.name}" which is part of "${subject}".
Domain Focus: ${topicAnalysis.domain}
Domain Key Terms: ${topicAnalysis.key_terminologies.join(', ')}

The learner wants to go deeper on "${concept.name}" beyond the quick summary they already saw:
"""${quickSummary}"""

CRITICAL RULES — violating these makes the lesson useless, do not violate them:
1. Every fact must be actually true and specific to "${concept.name}" as it is understood in ${subject}. Do not invent formulas, mechanisms, or examples that don't genuinely belong to this concept.
2. If "${concept.name}" has no formula/syntax, set formula_or_syntax to null. Do NOT invent a fake formula to fill the field.
3. The worked example must use REAL terminology and REAL mechanics from "${concept.name}" — not generic placeholder variables.
4. The analogy must map onto the SPECIFIC mechanics of this concept. If none fits well, omit it (set to null).
5. Before answering, silently check every sentence is factually accurate for "${concept.name}" specifically.

Provide a thorough explanation covering edge cases, how this connects to ${prereqs} and follow-up concepts, and 2 worked examples of increasing difficulty.

Return ONLY valid JSON, no markdown fences, no preamble:
{
  "summary": "1-2 sentences: what this concept actually IS, in plain English",
  "explanation": "3-5 sentences: how it actually works in detail, specific to this concept",
  "key_points": ["3 to 5 bullet points, each a specific true fact"],
  "examples": ["Worked Example 1 (Basic)...", "Worked Example 2 (Advanced edge-case)..."],
  "example": "Worked Example 1...",
  "common_mistakes": ["1 to 3 REAL misconceptions learners have about THIS specific concept"],
  "analogy": "a genuinely apt analogy, or null if none fits well",
  "formula_or_syntax": "the real formula/syntax if one exists, or null",
  "connections": "how this links to prerequisite (${prereqs}) and follow-up concepts"
}`;
    } else {
      prompt = `You are teaching the concept "${concept.name}" which is part of "${subject}".
Domain Focus: ${topicAnalysis.domain}
Domain Key Terms: ${topicAnalysis.key_terminologies.join(', ')}

CRITICAL RULES — violating these makes the lesson useless, do not violate them:
1. Every fact must be actually true and specific to "${concept.name}" as it is understood in ${subject}.
2. If "${concept.name}" has no formula, set formula_or_syntax to null. Do NOT invent a fake formula.
3. The worked example must use REAL terminology and REAL mechanics from "${concept.name}".
4. The analogy must map onto the SPECIFIC mechanics of this concept, or be null.
5. Before answering, silently verify every sentence is factually accurate for "${concept.name}" specifically.

Now write the lesson. Be clear, concrete, and specific — this should take under 90 seconds to read.

Return ONLY valid JSON, no markdown fences, no preamble:
{
  "summary": "1-2 sentences: what this concept actually IS, in plain English",
  "explanation": "3-5 sentences: how it actually works, specific to this concept",
  "key_points": ["3 to 5 bullet points, each a specific true fact"],
  "example": "one concrete, concept-specific example",
  "common_mistakes": ["1 to 3 REAL misconceptions learners have about THIS specific concept"],
  "analogy": "a genuinely apt analogy, or null if none fits well",
  "formula_or_syntax": "the real formula/syntax if one exists, or null"
}`;
    }

    let lessonContent: LessonContent | null = null;
    try {
      const jsonStr = await this.callGemini(prompt);
      const parsed = JSON.parse(jsonStr);
      if (parsed && parsed.summary && parsed.explanation) {
        let formula = parsed.formula_or_syntax;
        if (typeof formula === 'string' && (formula.toLowerCase().includes('input_1') || formula.toLowerCase().includes('parameter a') || formula.trim() === 'null' || formula.trim() === 'N/A')) {
          formula = null;
        }
        let analogyVal = parsed.analogy;
        if (typeof analogyVal === 'string' && (analogyVal.trim() === 'null' || analogyVal.trim() === 'N/A' || analogyVal.trim() === 'None')) {
          analogyVal = null;
        }
        lessonContent = {
          summary: parsed.summary,
          explanation: parsed.explanation,
          key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [parsed.summary],
          example: parsed.example || (Array.isArray(parsed.examples) ? parsed.examples[0] : ''),
          examples: Array.isArray(parsed.examples) ? parsed.examples : undefined,
          common_mistakes: Array.isArray(parsed.common_mistakes) ? parsed.common_mistakes : [],
          analogy: analogyVal || null,
          formula_or_syntax: formula || null,
          connections: parsed.connections || undefined,
        };
      }
    } catch {
      // fall through to grounded fallback below
    }

    if (!lessonContent) {
      lessonContent = this.generateFallbackLesson(concept.name, this.currentSession.topic, depth, topicAnalysis);
    }

    concept.lessons[depth] = lessonContent;

    this.addProgressLog('quiz_generated', `Unlocked & cached ${depth} lesson content for concept "${concept.name}".`, concept.id, concept.name);

    return {
      session_id: this.currentSession.session_id,
      concept_id: concept.id,
      concept_name: concept.name,
      depth,
      lesson: lessonContent,
      status: concept.status,
      cached: false,
    };
  }

  // ---------------------------------------------------------------------
  // Quiz generation & grading
  // ---------------------------------------------------------------------

  async generateQuiz(conceptId: string, count: number = 5, forceFresh: boolean = false) {
    if (!this.currentSession) throw new Error('No active session found. Please start a session first.');

    const concept = this.currentSession.concepts.find((c) => c.id === conceptId);
    if (!concept) throw new Error(`Concept with ID "${conceptId}" not found in current session.`);

    const isJeeMode = this.currentSession.source_mode === 'jee' || Boolean(concept.subject);

    if (isJeeMode) {
      if (!forceFresh && concept.quiz && concept.quiz.length > 0) {
        if (concept.status === 'locked') concept.status = 'unlocked_for_study';
        return { quiz: concept.quiz, concept, session: this.currentSession };
      }

      const prompt = `Generate a JEE Mains-level quiz for the chapter "${concept.name}" in ${concept.subject || 'JEE Mains'}.

Create exactly 4 questions total:
- 2 questions of type "theory_mcq": conceptual, testing understanding of definitions, laws, or reasoning. 4 options each, one correct_index.
- 2 questions of type "numerical": a calculation-based problem typical of JEE Mains for this chapter. Include correct_value, tolerance, and unit if applicable.

Match JEE Mains difficulty and style.

Return ONLY valid JSON, no markdown fences, no preamble:
{
  "quiz": [
    { "id": "q1", "type": "theory_mcq", "question": "string", "options": ["...","...","...","..."], "correct_index": 0, "explanation": "string" },
    { "id": "q2", "type": "numerical", "question": "string", "correct_value": 0.0, "tolerance": 0.1, "unit": "string or null", "explanation": "string" }
  ]
}`;

      let quizQuestions: any[] = [];
      try {
        const jsonStr = await this.callGemini(prompt);
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed.quiz) && parsed.quiz.length > 0) quizQuestions = parsed.quiz;
        else throw new Error('No quiz array returned in JSON');
      } catch {
        quizQuestions = this.generateJeeFallbackQuiz(concept.name, concept.subject || 'physics');
      }

      const sanitizedJeeQuiz = quizQuestions.slice(0, 4).map((q: any, idx: number) => {
        if (q.type === 'numerical') {
          return {
            id: `q${idx + 1}_num_${Math.random().toString(36).substring(2, 6)}`,
            type: 'numerical' as const,
            question: q.question || `Calculate the numerical parameter in ${concept.name}.`,
            correct_value: typeof q.correct_value === 'number' ? q.correct_value : 12.5,
            tolerance: typeof q.tolerance === 'number' ? q.tolerance : 0.1,
            unit: q.unit || null,
            explanation: q.explanation || `Numerical answer = ${q.correct_value}.`,
          };
        }
        const originalOptions = Array.isArray(q.options) && q.options.length >= 4 ? q.options.slice(0, 4) : ['Option A', 'Option B', 'Option C', 'Option D'];
        const rawIdx = typeof q.correct_index === 'number' && q.correct_index >= 0 && q.correct_index < 4 ? q.correct_index : 0;
        const correctAnswerText = originalOptions[rawIdx];
        const shuffled = [...originalOptions];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const newIdx = shuffled.indexOf(correctAnswerText);
        return {
          id: `q${idx + 1}_theory_${Math.random().toString(36).substring(2, 6)}`,
          type: 'theory_mcq' as const,
          question: q.question || `Theoretical question on ${concept.name}`,
          options: shuffled,
          correct_index: newIdx >= 0 ? newIdx : 0,
          explanation: q.explanation || `The correct option is "${shuffled[newIdx >= 0 ? newIdx : 0]}".`,
        };
      });

      concept.quiz = sanitizedJeeQuiz;
      if (concept.status !== 'mastered') concept.status = 'unlocked_for_study';

      this.addProgressLog('quiz_generated', `Generated a 4-question JEE Mains quiz (2 theory + 2 numerical) for chapter "${concept.name}".`, concept.id, concept.name);
      return { quiz: concept.quiz, concept, session: this.currentSession };
    }

    const targetCount = Math.min(Math.max(Number(count) || 5, 1), 30);

    if (!forceFresh && concept.quiz && concept.quiz.length === targetCount && concept.quiz.length > 0) {
      if (concept.status === 'locked') concept.status = 'unlocked_for_study';
      return { quiz: concept.quiz, concept, session: this.currentSession };
    }

    const prompt = `Generate an assessment quiz to verify genuine understanding of the concept "${concept.name}" (part of the broader topic "${this.currentSession.topic}").

Create exactly ${targetCount} multiple-choice questions.
Requirements:
1. Each question must have 4 options with exactly one correct answer.
2. Vary the phrasing, scenario details, and focus so questions are distinct and randomized.
3. Distribute the correct answer index randomly across 0, 1, 2, and 3.
4. Include a clear explanation field.

Return ONLY valid JSON, no markdown fences, no preamble:
{
  "quiz": [
    { "id": "q1", "question": "string", "options": ["string","string","string","string"], "correct_index": 0, "explanation": "Detailed explanation." }
  ]
}`;

    let quizQuestions: any[] = [];
    try {
      const jsonStr = await this.callGemini(prompt);
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed.quiz) && parsed.quiz.length > 0) quizQuestions = parsed.quiz;
      else throw new Error('No quiz array returned in JSON');
    } catch {
      quizQuestions = this.generateFallbackQuiz(concept.name, this.currentSession.topic, targetCount);
    }

    const sanitizedQuiz = quizQuestions.slice(0, targetCount).map((q: any, idx: number) => {
      const originalOptions = Array.isArray(q.options) && q.options.length >= 4 ? q.options.slice(0, 4) : ['Option A', 'Option B', 'Option C', 'Option D'];
      const rawCorrectIdx = typeof q.correct_index === 'number' && q.correct_index >= 0 && q.correct_index < 4 ? q.correct_index : 0;
      const correctAnswerText = originalOptions[rawCorrectIdx];
      const shuffledOptions = [...originalOptions];
      for (let i = shuffledOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
      }
      const newCorrectIndex = shuffledOptions.indexOf(correctAnswerText);
      const finalCorrectIdx = newCorrectIndex >= 0 ? newCorrectIndex : 0;
      return {
        id: `q${idx + 1}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'mcq' as const,
        question: q.question || `Question ${idx + 1} on ${concept.name}`,
        options: shuffledOptions,
        correct_index: finalCorrectIdx,
        explanation: q.explanation || `The correct answer is "${shuffledOptions[finalCorrectIdx]}". This aligns directly with core mechanics of ${concept.name}.`,
      };
    });

    for (let i = sanitizedQuiz.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sanitizedQuiz[i], sanitizedQuiz[j]] = [sanitizedQuiz[j], sanitizedQuiz[i]];
    }

    concept.quiz = sanitizedQuiz;
    if (concept.status !== 'mastered') concept.status = 'unlocked_for_study';

    this.addProgressLog('quiz_generated', `Generated a randomized ${sanitizedQuiz.length}-question evaluation quiz for concept "${concept.name}".`, concept.id, concept.name);
    return { quiz: concept.quiz, concept, session: this.currentSession };
  }

  submitAnswers(conceptId: string, answers: (number | string)[]) {
    if (!this.currentSession) throw new Error('No active session found.');

    const concept = this.currentSession.concepts.find((c) => c.id === conceptId);
    if (!concept) throw new Error(`Concept with ID "${conceptId}" not found.`);
    if (!concept.quiz || concept.quiz.length === 0) throw new Error('Quiz not yet generated for this concept.');

    const userAnswers = Array.isArray(answers) ? answers : [];
    let correctCount = 0;
    const totalQuestions = concept.quiz.length;

    const evaluations = concept.quiz.map((q, idx) => {
      const rawUserAns = userAnswers[idx];
      let isCorrect = false;

      if (q.type === 'numerical') {
        const userNum = parseFloat(String(rawUserAns));
        const targetNum = Number(q.correct_value);
        const tol = Number(q.tolerance ?? 0.1);
        isCorrect = !isNaN(userNum) && Math.abs(userNum - targetNum) <= tol;
        if (isCorrect) correctCount++;
        const correctDisplay = `${q.correct_value}${q.unit ? ' ' + q.unit : ''} (±${q.tolerance ?? 0.1})`;
        return {
          question_id: q.id,
          user_answer: rawUserAns !== undefined && rawUserAns !== null ? String(rawUserAns) : '',
          correct_answer: correctDisplay,
          is_correct: isCorrect,
          correct_text: correctDisplay,
          explanation: q.explanation || `Correct numerical answer is ${correctDisplay}.`,
        };
      }

      const userAnsIdx = typeof rawUserAns === 'number' ? rawUserAns : parseInt(String(rawUserAns), 10);
      const targetIdx = typeof q.correct_index === 'number' ? q.correct_index : 0;
      isCorrect = !isNaN(userAnsIdx) && userAnsIdx === targetIdx;
      if (isCorrect) correctCount++;
      const correctText = (q.options && q.options[targetIdx]) || 'Correct Option';
      return {
        question_id: q.id,
        user_answer: userAnsIdx,
        correct_answer: targetIdx,
        is_correct: isCorrect,
        correct_text: correctText,
        explanation: q.explanation || `The correct option is "${correctText}".`,
      };
    });

    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= 80;

    if (passed) {
      if (concept.status !== 'mastered') {
        concept.status = 'mastered';
        const transferAmount = Math.min(concept.reward_amount, this.currentSession.wallet.locked);
        this.currentSession.wallet.locked -= transferAmount;
        this.currentSession.wallet.unlocked += transferAmount;

        this.addProgressLog('concept_mastered', `Mastered concept "${concept.name}" with score ${score}%! Unlocked ₹${transferAmount} from locked stake into cash wallet.`, concept.id, concept.name);
        this.addProgressLog('wallet_unlocked', `Wallet balance updated: Unlocked ₹${this.currentSession.wallet.unlocked} / Locked ₹${this.currentSession.wallet.locked}.`);

        this.syncRoadmapWithProgress();
      }
    } else {
      this.addProgressLog('quiz_submitted', `Submitted quiz for "${concept.name}" with score ${score}% (${correctCount}/${totalQuestions}). Target score is 80%. Retry required with fresh questions.`, concept.id, concept.name);
    }

    return {
      passed,
      score,
      correct_count: correctCount,
      total_questions: totalQuestions,
      wallet: this.currentSession.wallet,
      concept,
      evaluations,
      session: this.currentSession,
    };
  }

  // ---------------------------------------------------------------------
  // Roadmap
  // ---------------------------------------------------------------------

  private generateFallbackRoadmap(goalInput: string): LearningRoadmap {
    const goal = goalInput.trim() || 'AI Engineer';
    const lowerGoal = goal.toLowerCase();
    let milestones: RoadmapMilestone[] = [];

    if (lowerGoal.includes('ai') || lowerGoal.includes('machine learning') || lowerGoal.includes('deep learning')) {
      milestones = [
        { id: 'm1', title: 'Python Foundations & Mathematical Logic', description: 'Master variables, data structures, linear algebra basics, matrix calculus, and probability.', status: 'completed', prerequisites: [], estimated_hours: 15, concepts: ['Python Basics', 'Linear Algebra', 'Calculus & Derivatives', 'Probability & Statistics'] },
        { id: 'm2', title: 'Classical Machine Learning Algorithms', description: 'Build supervised and unsupervised models including Linear Regression, Decision Trees, SVMs, and Random Forests.', status: 'in_progress', prerequisites: ['m1'], estimated_hours: 25, concepts: ['Supervised Learning', 'Regression & Classification', 'Clustering & PCA', 'Model Evaluation'] },
        { id: 'm3', title: 'Neural Networks & Deep Learning Architectures', description: 'Understand backpropagation, loss optimization, Activation Functions, CNNs, and Recurrent Networks.', status: 'unlocked', prerequisites: ['m2'], estimated_hours: 30, concepts: ['Perceptrons & Backprop', 'CNNs & Computer Vision', 'RNNs & LSTMs', 'PyTorch / TensorFlow'] },
        { id: 'm4', title: 'Transformers & Large Language Models (LLMs)', description: 'Master Attention Mechanisms, Transformer Encoders/Decoders, Prompt Engineering, and fine-tuning LLMs.', status: 'locked', prerequisites: ['m3'], estimated_hours: 35, concepts: ['Self-Attention Mechanism', 'Transformer Architecture', 'Fine-Tuning & LoRA', 'RAG & Vector DBs'] },
        { id: 'm5', title: 'AI Agent Frameworks & Production Deployment', description: 'Deploy autonomous AI agents, tool use, function calling, MCP integration, and low-latency API serving.', status: 'locked', prerequisites: ['m4'], estimated_hours: 20, concepts: ['Agentic Workflows', 'Function Calling', 'MCP Servers', 'Model Serving & Docker'] },
      ];
    } else if (lowerGoal.includes('jee') || lowerGoal.includes('physics') || lowerGoal.includes('chemistry') || lowerGoal.includes('math')) {
      milestones = [
        { id: 'm1', title: 'Mechanics & Units-Measurements', description: "Master dimensional analysis, kinematics, Newton's laws of motion, work-energy, and rotational dynamics.", status: 'completed', prerequisites: [], estimated_hours: 40, concepts: ['Units & Measurements', 'Kinematics in 1D & 2D', 'Laws of Motion', 'Work Power Energy'] },
        { id: 'm2', title: 'Electrodynamics & Current Electricity', description: "Understand electrostatics, Gauss's law, capacitors, Ohm's law, Kirchhoff's laws, and magnetic fields.", status: 'in_progress', prerequisites: ['m1'], estimated_hours: 45, concepts: ['Electrostatics', 'Current Electricity', 'Magnetic Effects of Current', 'Electromagnetic Induction'] },
        { id: 'm3', title: 'Organic Chemistry Mechanisms & Reactions', description: 'Master IUPAC nomenclature, isomerism, GOC, reaction mechanisms (SN1, SN2, E1, E2), and functional groups.', status: 'unlocked', prerequisites: ['m2'], estimated_hours: 35, concepts: ['General Organic Chemistry', 'Hydrocarbons', 'Haloalkanes & Haloarenes', 'Alcohols Phenols Ethers'] },
        { id: 'm4', title: 'Calculus, Vectors & 3D Geometry', description: 'Master limits, continuity, differentiation, integration, differential equations, vectors, and 3D lines/planes.', status: 'locked', prerequisites: ['m3'], estimated_hours: 50, concepts: ['Integral Calculus', 'Differential Equations', 'Vector Algebra', '3D Geometry'] },
      ];
    } else if (lowerGoal.includes('web') || lowerGoal.includes('full') || lowerGoal.includes('developer') || lowerGoal.includes('software')) {
      milestones = [
        { id: 'm1', title: 'Modern JavaScript (ES6+) & TypeScript', description: 'Master async/await, closures, promises, type definitions, interfaces, and module bundling.', status: 'completed', prerequisites: [], estimated_hours: 20, concepts: ['ES6+ Syntax', 'Promises & Async/Await', 'TypeScript Fundamentals', 'DOM & Event Handling'] },
        { id: 'm2', title: 'Frontend Architecture with React & Tailwind CSS', description: 'Build reactive UI applications, hooks, state management, component lifecycle, and utility styling.', status: 'in_progress', prerequisites: ['m1'], estimated_hours: 30, concepts: ['React Components & Hooks', 'State Management', 'Tailwind CSS Layouts', 'Vite & Client Build'] },
        { id: 'm3', title: 'Backend API Servers & Node.js/Express', description: 'Design RESTful APIs, Express routing middleware, authentication, error handling, and webhooks.', status: 'unlocked', prerequisites: ['m2'], estimated_hours: 25, concepts: ['Express Server Setup', 'REST API Design', 'Authentication & JWT', 'Middleware & Error Handling'] },
        { id: 'm4', title: 'Database Design, ORMs & Persistence', description: 'Master relational PostgreSQL and Firestore databases, queries, indexing, and transactional integrity.', status: 'locked', prerequisites: ['m3'], estimated_hours: 25, concepts: ['Relational Databases & SQL', 'Firestore & NoSQL', 'ORM & Schema Migrations', 'Caching & Performance'] },
      ];
    } else {
      milestones = [
        { id: 'm1', title: `Foundations of ${goal}`, description: `Master core terminology, fundamental concepts, and primary principles of ${goal}.`, status: 'completed', prerequisites: [], estimated_hours: 15, concepts: [`Introduction to ${goal}`, 'Core Principles', 'Terminology & Standards'] },
        { id: 'm2', title: `Intermediate Workflows in ${goal}`, description: 'Apply essential tools, practical techniques, and problem-solving methodologies.', status: 'in_progress', prerequisites: ['m1'], estimated_hours: 25, concepts: ['Core Mechanics', 'Practical Workflows', 'Tooling & Environment'] },
        { id: 'm3', title: 'Advanced System Architecture & Strategy', description: 'Design scalable solutions, optimize performance, and manage complex real-world edge cases.', status: 'unlocked', prerequisites: ['m2'], estimated_hours: 30, concepts: ['Advanced Techniques', 'Performance Optimization', 'Edge Case Strategy'] },
        { id: 'm4', title: 'Professional Mastery & Capstone Execution', description: 'Demonstrate end-to-end expertise through evaluation assessments and real-world deployment.', status: 'locked', prerequisites: ['m3'], estimated_hours: 20, concepts: ['Capstone Execution', 'Production Readiness', 'Expert Verification'] },
      ];
    }

    const completed = milestones.filter((m) => m.status === 'completed').length;
    return { goal, roadmap: milestones, completed_count: completed, total_count: milestones.length };
  }

  private syncRoadmapWithProgress() {
    if (!this.currentRoadmap) return;

    const masteredNames = new Set<string>();
    if (this.currentSession) {
      this.currentSession.concepts.forEach((c) => {
        if (c.status === 'mastered') masteredNames.add(c.name.toLowerCase());
      });
    }

    let completedSoFar = 0;
    this.currentRoadmap.roadmap.forEach((milestone) => {
      const hasMasteredConcept = milestone.concepts?.some(
        (cName) => masteredNames.has(cName.toLowerCase()) || (this.currentSession && this.currentSession.topic.toLowerCase().includes(cName.toLowerCase()))
      );
      if (hasMasteredConcept) milestone.status = 'completed';

      if (milestone.status === 'completed') {
        completedSoFar++;
      } else {
        const prereqsMet = milestone.prerequisites.every((pId) => {
          const prereqNode = this.currentRoadmap?.roadmap.find((m) => m.id === pId);
          return prereqNode?.status === 'completed';
        });
        if ((prereqsMet || milestone.prerequisites.length === 0) && milestone.status === 'locked') {
          milestone.status = 'unlocked';
        }
      }
    });

    this.currentRoadmap.completed_count = completedSoFar;
  }

  async generateRoadmapForGoal(goalName: string): Promise<LearningRoadmap> {
    const cleanGoal = goalName.trim() || 'AI Engineer';

    const prompt = `Generate a personalized, highly structured learning & career roadmap for the goal "${cleanGoal}".
The roadmap should consist of 4 to 6 progressive milestones leading from beginner/prerequisite skills to full mastery.

Return ONLY valid JSON in this exact shape:
{
  "goal": "${cleanGoal}",
  "roadmap": [
    { "id": "m1", "title": "Milestone Title 1", "description": "Clear 2-sentence description.", "status": "completed", "prerequisites": [], "estimated_hours": 15, "concepts": ["Concept 1", "Concept 2", "Concept 3"] },
    { "id": "m2", "title": "Milestone Title 2", "description": "Clear 2-sentence description.", "status": "in_progress", "prerequisites": ["m1"], "estimated_hours": 25, "concepts": ["Concept 4", "Concept 5"] },
    { "id": "m3", "title": "Milestone Title 3", "description": "Clear 2-sentence description.", "status": "unlocked", "prerequisites": ["m2"], "estimated_hours": 30, "concepts": ["Concept 6", "Concept 7"] },
    { "id": "m4", "title": "Milestone Title 4", "description": "Clear 2-sentence description.", "status": "locked", "prerequisites": ["m3"], "estimated_hours": 35, "concepts": ["Concept 8", "Concept 9"] }
  ]
}`;

    try {
      const jsonStr = await this.callGemini(prompt);
      const parsed = JSON.parse(jsonStr);
      if (parsed && Array.isArray(parsed.roadmap) && parsed.roadmap.length > 0) {
        const completed = parsed.roadmap.filter((m: any) => m.status === 'completed').length;
        this.currentRoadmap = { goal: parsed.goal || cleanGoal, roadmap: parsed.roadmap, completed_count: completed, total_count: parsed.roadmap.length };
        this.syncRoadmapWithProgress();
        return this.currentRoadmap;
      }
    } catch {
      // fall through to grounded fallback below
    }

    this.currentRoadmap = this.generateFallbackRoadmap(cleanGoal);
    this.syncRoadmapWithProgress();
    return this.currentRoadmap;
  }

  // ---------------------------------------------------------------------
  // Map expansion
  // ---------------------------------------------------------------------

  async expandMap(): Promise<SessionData> {
    if (!this.currentSession) throw new Error('No active learning session found to expand.');

    const topic = this.currentSession.topic;
    const existingConcepts = this.currentSession.concepts || [];

    const prompt = `The user is studying "${topic}". The current concept map has ${existingConcepts.length} concepts:
${existingConcepts.map((c) => `- ${c.name}`).join('\n')}

Expand this into a BIGGER, highly detailed concept map (12 to 16 total concept nodes) by inserting granular sub-topics, small sub-concepts, specialized mechanisms, edge cases, and practical sub-modules. Ensure essential small topics are explicitly included.

Return ONLY valid JSON, no markdown fences, no preamble:
{
  "concepts": [
    { "id": "c1", "name": "string", "prerequisites": ["c_id"] }
  ]
}
prerequisites must reference earlier concept ids only (no circular refs).`;

    let expandedRaw: Array<{ id: string; name: string; prerequisites?: string[] }> = [];
    try {
      const jsonStr = await this.callGemini(prompt);
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed.concepts) && parsed.concepts.length > 0) {
        expandedRaw = parsed.concepts;
      } else {
        throw new Error('No concepts returned in expansion JSON');
      }
    } catch {
      expandedRaw = [];
      existingConcepts.forEach((c) => {
        expandedRaw.push({ id: c.id, name: c.name, prerequisites: c.prerequisites });
        expandedRaw.push({ id: `${c.id}_sub`, name: `${c.name}: Sub-Topic & Specific Mechanics`, prerequisites: [c.id] });
      });
    }

    const existingMasteredMap = new Map<string, boolean>();
    existingConcepts.forEach((c) => {
      if (c.status === 'mastered') existingMasteredMap.set(c.name.toLowerCase().trim(), true);
    });

    const validIds = new Set(expandedRaw.map((c, i) => c.id || `c${i + 1}`));
    const deposit = this.currentSession.wallet?.deposited || 1000;
    const conceptCount = expandedRaw.length;
    const baseReward = Math.floor(deposit / conceptCount);
    const remainder = deposit - baseReward * conceptCount;

    const newConcepts: Concept[] = expandedRaw.map((c, idx) => {
      const id = c.id || `c${idx + 1}`;
      const prereqs = Array.isArray(c.prerequisites) ? c.prerequisites.filter((p) => validIds.has(p) && p !== id) : [];
      const reward = baseReward + (idx === 0 ? remainder : 0);
      const isMastered = existingMasteredMap.get((c.name || '').toLowerCase().trim()) || false;
      return {
        id,
        name: c.name || `Concept ${idx + 1}`,
        prerequisites: prereqs,
        status: isMastered ? 'mastered' : idx === 0 || prereqs.length === 0 ? 'unlocked_for_study' : 'locked',
        quiz: [],
        reward_amount: reward,
      };
    });

    if (!newConcepts.some((c) => c.status === 'unlocked_for_study' || c.status === 'mastered')) {
      if (newConcepts.length > 0) newConcepts[0].status = 'unlocked_for_study';
    }

    this.currentSession.concepts = newConcepts;
    this.addProgressLog('map_expanded', `Expanded learning map to ${newConcepts.length} concepts including detailed sub-topics and small topics.`);

    return this.currentSession;
  }
}
