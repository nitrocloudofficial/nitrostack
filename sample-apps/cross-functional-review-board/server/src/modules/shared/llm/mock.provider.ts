import { LLMProvider, LLMGenerateOptions } from './llm.interface.js';

export class MockProvider implements LLMProvider {
  name = 'Mock (Offline / Intelligent Governance Mode)';

  async generate(system: string, user: string, options?: LLMGenerateOptions): Promise<string> {
    const sysLower = system.toLowerCase();
    const userLower = user.toLowerCase();

    // 1. Dystopian / Severe Breach Proposals -> BLOCKED (🔴)
    const isSurveillance =
      userLower.includes('surveillance') ||
      userLower.includes('termination') ||
      userLower.includes('microphone') ||
      userLower.includes('webcam') ||
      userLower.includes('union') ||
      userLower.includes('prop-2026-099');

    const isAdminLaptops =
      userLower.includes('admin-access') ||
      userLower.includes('prop-2026-004') ||
      (userLower.includes('admin') && userLower.includes('laptops'));

    // 2. Pure Low-Risk Proposals -> APPROVED (🟢)
    const isKnowledgeSearch =
      userLower.includes('knowledge search assistant') ||
      userLower.includes('digital workplace team') ||
      userLower.includes('hr handbooks');

    const isDarkMode =
      userLower.includes('dark mode') ||
      userLower.includes('prop-2026-005');

    // 3. Medium Proposals -> APPROVED WITH CONDITIONS (🟡)
    const isSupportAssistant =
      userLower.includes('prop-2026-021') ||
      userLower.includes('customer support assistant') ||
      userLower.includes('conversation analytics');

    const isCloudMigration =
      userLower.includes('cloudprovider b') ||
      userLower.includes('prop-2026-002') ||
      userLower.includes('cloud provider');

    const isSupportGenie =
      userLower.includes('supportgenie') ||
      userLower.includes('prop-2026-003');

    const isRecommendationEngine =
      userLower.includes('recommendation engine') ||
      userLower.includes('recommendation feature');

    const isMediumProposal = isSupportAssistant || isCloudMigration || isSupportGenie || isRecommendationEngine;

    if (options?.responseMimeType === 'text/plain') {
      if (isSurveillance) {
        return 'The AI Employee Surveillance & Automated Termination Platform proposal has been BLOCKED due to severe, unresolvable privacy, ethical, legal, and security violations (GDPR Art. 22, EU AI Act, zero consent).';
      }
      if (isAdminLaptops) {
        return 'The Issue Admin-Access Laptops proposal has been BLOCKED due to severe security violations of the least-privilege principle across all 450 corporate devices.';
      }
      if (isMediumProposal) {
        return 'The proposal is APPROVED WITH CONDITIONS. It demonstrates clear business value and technical feasibility, but production deployment is contingent upon completing mandatory security, legal, data retention, and privacy impact actions before rollout.';
      }
      return 'The proposal is APPROVED. It complies with enterprise security baselines, respects role-based access control, and operates within secure corporate cloud boundaries.';
    }

    if (sysLower.includes('json array of section_id strings')) {
      return JSON.stringify(['sec-baseline-2', 'leg-baseline-4', 'eng-baseline-2', 'prod-baseline-3']);
    }

    // Debate Round Challenge Response
    if (sysLower.includes('responding to a concern') || sysLower.includes('stance options') || sysLower.includes('structured challenge response')) {
      if (isSurveillance || isAdminLaptops) {
        return JSON.stringify({
          agent: 'legal',
          responds_to: 'target-concern',
          stance: 'disagree',
          response: 'This proposal presents fundamental regulatory, privacy, and security violations (GDPR Art. 22, EU AI Act, and least privilege) that CANNOT be mitigated through technical workarounds.',
          revised_verdict: 'blocked'
        });
      }

      if (isMediumProposal) {
        return JSON.stringify({
          agent: 'product',
          responds_to: 'leg-1',
          stance: 'partially_agree',
          response: 'Agreed that a formal Privacy Impact Assessment (PIA), data retention schedule, SOC 2 report verification, and customer opt-out workflow are required. Product commits to completing these mandatory deliverables before customer-facing rollout.',
          revised_verdict: 'flagged'
        });
      }

      // Good proposal: agree & clear
      return JSON.stringify({
        agent: 'product',
        responds_to: 'target-concern',
        stance: 'agree',
        response: 'All security, RBAC, and encryption controls are fully met within internal cloud boundaries.',
        revised_verdict: 'approved'
      });
    }

    // --- AGENT 1: ENGINEERING ---
    if (sysLower.includes('"agent": "engineering"') || sysLower.includes('engineering reviewer')) {
      if (isSurveillance) {
        return JSON.stringify({
          agent: 'engineering',
          verdict: 'blocked',
          confidence: 0.95,
          summary: 'Unrealistic 2-week implementation timeline, unscalable continuous audio/video surveillance stream ingestion, and dangerous lack of manual override capability.',
          effort_assessment: { size: 'massive', basis: 'novel_integration', confidence: 'high', source: 'initial', revision_reason: null },
          concerns: [
            {
              id: 'eng-surveillance-pipeline-1',
              category: 'architecture_risk',
              tags: ['continuous_monitoring', 'no_human_override'],
              issue: 'Continuous 24/7 ingestion of webcam, microphone, screen, and keystroke streams is architecturally unfeasible within 2 weeks.',
              severity: 'high',
              recommendation: 'REJECT PROPOSAL.',
              responds_to: null,
              status: 'open',
              requested_context: null
            }
          ]
        });
      }

      return JSON.stringify({
        agent: 'engineering',
        verdict: 'approved',
        confidence: 0.92,
        summary: 'Technical architecture is sound, utilizing existing secure cloud infrastructure with RBAC and end-to-end encryption.',
        effort_assessment: { size: 'medium', basis: 'known_pattern', confidence: 'high', source: 'initial', revision_reason: null },
        concerns: []
      });
    }

    // --- AGENT 2: LEGAL ---
    if (sysLower.includes('"agent": "legal"') || sysLower.includes('legal reviewer')) {
      if (isSurveillance) {
        return JSON.stringify({
          agent: 'legal',
          verdict: 'blocked',
          confidence: 0.99,
          summary: 'Fully automated employment termination without human oversight, lack of employee consent, union tracking, and non-compliant international data transfers violate GDPR Art. 22 and labor laws.',
          concerns: [
            {
              id: 'leg-automated-termination-gdpr-1',
              category: 'regulatory_triggers',
              tags: ['gdpr_art_22', 'eu_ai_act', 'no_employee_consent'],
              issue: 'Automated employment termination without human approval and zero employee consent explicitly violates GDPR Article 22 and EU AI Act.',
              severity: 'high',
              recommendation: 'REJECT PROPOSAL IMMEDIATELY.',
              responds_to: null,
              status: 'open',
              requested_context: null
            }
          ]
        });
      }

      if (isMediumProposal) {
        return JSON.stringify({
          agent: 'legal',
          verdict: 'flagged',
          confidence: 0.85,
          summary: 'Customer data processing requires a Privacy Impact Assessment (PIA), finalized opt-out policy, and updated privacy notice disclosures before rollout.',
          concerns: [
            {
              id: 'leg-pia-opt-out-1',
              category: 'compliance',
              tags: ['pia_required', 'privacy_notice', 'customer_opt_out'],
              issue: 'Data processing activities trigger Privacy Impact Assessment (PIA) requirements and privacy notice disclosures under compliance policies.',
              severity: 'medium',
              recommendation: 'Complete Privacy Impact Assessment (PIA), publish updated privacy notices, and establish opt-out controls before customer launch.',
              responds_to: null,
              status: 'open',
              requested_context: 'Privacy Impact Assessment documentation'
            }
          ]
        });
      }

      return JSON.stringify({
        agent: 'legal',
        verdict: 'approved',
        confidence: 0.94,
        summary: 'Proposal respects existing role permissions, intellectual property guidelines, and regulatory requirements.',
        concerns: []
      });
    }

    // --- AGENT 3: SECURITY ---
    if (sysLower.includes('"agent": "security"') || sysLower.includes('security reviewer')) {
      if (isSurveillance) {
        return JSON.stringify({
          agent: 'security',
          verdict: 'blocked',
          confidence: 0.98,
          summary: 'Indefinite retention of un-encrypted employee webcam, microphone, screen, and keystroke surveillance data with unvetted third-party sharing poses extreme security risks.',
          concerns: [
            {
              id: 'sec-surveillance-breach-1',
              category: 'vendor_risk',
              tags: ['continuous_surveillance', 'indefinite_storage'],
              issue: 'Indefinite raw storage of private audio, webcam, screen recordings, and keystrokes creates an extreme data breach target.',
              severity: 'high',
              recommendation: 'REJECT PROPOSAL.',
              responds_to: null,
              status: 'open',
              requested_context: null
            }
          ]
        });
      }

      if (isAdminLaptops) {
        return JSON.stringify({
          agent: 'security',
          verdict: 'blocked',
          confidence: 0.95,
          summary: 'Granting local administrator privileges across all 450 employee devices directly violates the Principle of Least Privilege and renders endpoint security controls ineffective.',
          concerns: [
            {
              id: 'sec-least-privilege-1',
              category: 'security_baseline',
              tags: ['least_privilege_violation', 'malware_risk'],
              issue: 'Local admin access allows employees (or malware executing in user context) to disable antivirus, modify firewall rules, and exfiltrate corporate credentials.',
              severity: 'high',
              recommendation: 'REJECT PROPOSAL. Maintain standard user privileges and implement automated IT software deployment catalog.',
              responds_to: null,
              status: 'open',
              requested_context: null
            }
          ]
        });
      }

      if (isMediumProposal) {
        return JSON.stringify({
          agent: 'security',
          verdict: 'flagged',
          confidence: 0.85,
          summary: 'Third-party vendor data access and behavioral data retention require a formal security assessment and defined deletion schedule.',
          concerns: [
            {
              id: 'sec-retention-vendor-1',
              category: 'vendor_risk',
              tags: ['data_retention', 'vendor_assessment'],
              issue: 'Data retention policy is not defined and third-party vendor SOC 2 compliance reports require verification prior to launch.',
              severity: 'medium',
              recommendation: 'Define explicit 12-month data retention policy and obtain third-party vendor SOC 2 Type II compliance audit reports.',
              responds_to: null,
              status: 'open',
              requested_context: 'Vendor SOC 2 report and retention schedule'
            }
          ]
        });
      }

      return JSON.stringify({
        agent: 'security',
        verdict: 'approved',
        confidence: 0.95,
        summary: 'Operates entirely within secure corporate cloud boundaries with RBAC, end-to-end encryption, and audit logging enabled.',
        concerns: []
      });
    }

    // --- AGENT 4: PRODUCT ---
    if (isSurveillance) {
      return JSON.stringify({
        agent: 'product',
        verdict: 'blocked',
        confidence: 0.95,
        summary: 'Massive employee trust erosion, immediate turnover of key talent, and catastrophic brand reputation damage.',
        opportunity_cost_estimate: { reach: 'massive', impact: 'low', confidence: 'low', effort: 'massive', effort_source: 'provisional' },
        concerns: [
          {
            id: 'prod-trust-erosion-1',
            category: 'problem_solution_fit',
            tags: ['trust_erosion', 'reputational_harm'],
            issue: 'Surveillance and automated termination will trigger severe morale collapse and mass resignations.',
            severity: 'high',
            recommendation: 'REJECT PROPOSAL.',
            responds_to: null,
            status: 'open',
            requested_context: null
          }
        ]
      });
    }

    return JSON.stringify({
      agent: 'product',
      verdict: 'approved',
      confidence: 0.92,
      summary: 'Clear operational productivity benefits and strong ROI alignment.',
      opportunity_cost_estimate: { reach: 'high', impact: 'high', confidence: 'high', effort: 'medium', effort_source: 'provisional' },
      concerns: []
    });
  }
}
