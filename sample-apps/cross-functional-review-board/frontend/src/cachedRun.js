// A pre-captured, schema-valid run for Proposal 1 (AI Recommendation Feature).
// Used ONLY as a manual fallback ("Use cached run" toggle) if the live LLM
// call fails or is too slow during a live demo.

export const CACHED_RUN_EVENTS = [
  { event: 'agent_start', data: { agent: 'product' } },
  { event: 'agent_start', data: { agent: 'engineering' } },
  { event: 'agent_start', data: { agent: 'security' } },
  { event: 'agent_start', data: { agent: 'legal' } },

  {
    event: 'agent_done',
    data: {
      agent: 'product',
      output: {
        agent: 'product',
        verdict: 'approved',
        confidence: 0.86,
        summary: 'Strong customer retention rationale. Recommends initial 50-customer beta pilot to validate feature adoption KPIs.',
        concerns: [
          {
            id: 'prod-pilot-rollout-1',
            category: 'product_strategy',
            tags: ['pilot_rollout', 'success_metrics'],
            issue: 'Initial rollout should commence with a 50-customer beta cohort to validate engagement metrics prior to 1,200 enterprise customer launch.',
            severity: 'low',
            recommendation: 'Execute 50-customer beta pilot and establish feature adoption KPIs before general availability.',
            responds_to: null,
            status: 'open',
            requested_context: null
          }
        ],
        opportunity_cost_estimate: {
          reach: 'high',
          impact: 'medium',
          confidence: 'high',
          effort: 'medium',
          effort_source: 'provisional'
        }
      }
    }
  },
  {
    event: 'agent_done',
    data: {
      agent: 'engineering',
      output: {
        agent: 'engineering',
        verdict: 'approved',
        confidence: 0.88,
        summary: 'In-house build on existing infrastructure is technically feasible. Requires automated rollback plan and capacity monitoring before production scale.',
        concerns: [
          {
            id: 'eng-rollback-capacity-1',
            category: 'operational_readiness',
            tags: ['rollback_plan', 'capacity_monitoring'],
            issue: 'Model evaluation telemetry pipeline requires documented rollback procedures and automated peak load capacity alerting.',
            severity: 'low',
            recommendation: 'Document automated rollback strategy and configure capacity monitoring alerts prior to scaling rollout.',
            responds_to: null,
            status: 'open',
            requested_context: null
          }
        ],
        effort_assessment: {
          size: 'medium',
          basis: 'known_pattern',
          confidence: 'high',
          source: 'initial',
          revision_reason: null
        }
      }
    }
  },
  {
    event: 'agent_done',
    data: {
      agent: 'security',
      output: {
        agent: 'security',
        verdict: 'flagged',
        confidence: 0.85,
        summary: 'Behavioral training data retention window requires a documented data deletion schedule and encryption verification.',
        concerns: [
          {
            id: 'sec-data-retention-1',
            category: 'data_protection',
            tags: ['data_retention', 'encryption_at_rest'],
            issue: 'Storing behavioral interaction logs for up to 12 months requires a documented retention schedule and verified encryption at rest.',
            severity: 'medium',
            recommendation: 'Define explicit 12-month data retention policy and verify automated deletion/expiry mechanisms before launch.',
            responds_to: null,
            status: 'open',
            requested_context: null
          }
        ]
      }
    }
  },
  {
    event: 'agent_done',
    data: {
      agent: 'legal',
      output: {
        agent: 'legal',
        verdict: 'flagged',
        confidence: 0.82,
        summary: 'Behavioral profiling and automated in-app personalization require a completed Privacy Impact Assessment (PIA) and updated privacy notice before production deployment.',
        concerns: [
          {
            id: 'leg-pia-required-1',
            category: 'compliance',
            tags: ['pia_required', 'privacy_notice', 'customer_opt_out'],
            issue: 'Using enterprise user browsing history and feature interaction logs for automated personalization triggers Privacy Impact Assessment (PIA) requirements under data protection policies.',
            severity: 'medium',
            recommendation: 'Complete a Privacy Impact Assessment (PIA), publish updated privacy notices, and establish account-level opt-out controls before customer rollout.',
            responds_to: null,
            status: 'open',
            requested_context: null
          }
        ]
      }
    }
  },

  {
    event: 'reconciliation_done',
    data: {
      reconciled: true,
      productOutput: {
        agent: 'product',
        verdict: 'approved',
        confidence: 0.86,
        summary: 'Strong customer retention rationale. Recommends initial 50-customer beta pilot to validate feature adoption KPIs.',
        concerns: [
          {
            id: 'prod-pilot-rollout-1',
            category: 'product_strategy',
            tags: ['pilot_rollout', 'success_metrics'],
            issue: 'Initial rollout should commence with a 50-customer beta cohort to validate engagement metrics prior to 1,200 enterprise customer launch.',
            severity: 'low',
            recommendation: 'Execute 50-customer beta pilot and establish feature adoption KPIs before general availability.',
            responds_to: null,
            status: 'open',
            requested_context: null
          }
        ],
        opportunity_cost_estimate: {
          reach: 'high',
          impact: 'medium',
          confidence: 'high',
          effort: 'medium',
          effort_source: 'reconciled_with_engineering'
        }
      }
    }
  },

  {
    event: 'debate_exchange',
    data: {
      exchange: {
        agent: 'product',
        responds_to: 'leg-pia-required-1',
        stance: 'partially_agree',
        response: 'Agreed that a formal Privacy Impact Assessment (PIA) and data retention policy definition are required. Product commits to completing these mandatory deliverables before customer-facing launch, rather than delaying initial engineering sprint setup.',
        revised_verdict: 'flagged'
      }
    }
  },

  {
    event: 'debate_done',
    data: {
      outputs: [
        {
          agent: 'product',
          verdict: 'approved',
          confidence: 0.86,
          summary: 'Strong customer retention rationale. Recommends initial 50-customer beta pilot to validate feature adoption KPIs.',
          concerns: [
            {
              id: 'prod-pilot-rollout-1',
              category: 'product_strategy',
              tags: ['pilot_rollout', 'success_metrics'],
              issue: 'Initial rollout should commence with a 50-customer beta cohort to validate engagement metrics prior to 1,200 enterprise customer launch.',
              severity: 'low',
              recommendation: 'Execute 50-customer beta pilot and establish feature adoption KPIs before general availability.',
              responds_to: null,
              status: 'open',
              requested_context: null
            }
          ],
          opportunity_cost_estimate: {
            reach: 'high',
            impact: 'medium',
            confidence: 'high',
            effort: 'medium',
            effort_source: 'reconciled_with_engineering'
          }
        },
        {
          agent: 'engineering',
          verdict: 'approved',
          confidence: 0.88,
          summary: 'In-house build on existing infrastructure is technically feasible. Requires automated rollback plan and capacity monitoring before production scale.',
          concerns: [
            {
              id: 'eng-rollback-capacity-1',
              category: 'operational_readiness',
              tags: ['rollback_plan', 'capacity_monitoring'],
              issue: 'Model evaluation telemetry pipeline requires documented rollback procedures and automated peak load capacity alerting.',
              severity: 'low',
              recommendation: 'Document automated rollback strategy and configure capacity monitoring alerts prior to scaling rollout.',
              responds_to: null,
              status: 'open',
              requested_context: null
            }
          ],
          effort_assessment: {
            size: 'medium',
            basis: 'known_pattern',
            confidence: 'high',
            source: 'initial',
            revision_reason: null
          }
        },
        {
          agent: 'security',
          verdict: 'flagged',
          confidence: 0.85,
          summary: 'Behavioral training data retention window requires a documented data deletion schedule and encryption verification.',
          concerns: [
            {
              id: 'sec-data-retention-1',
              category: 'data_protection',
              tags: ['data_retention', 'encryption_at_rest'],
              issue: 'Storing behavioral interaction logs for up to 12 months requires a documented retention schedule and verified encryption at rest.',
              severity: 'medium',
              recommendation: 'Define explicit 12-month data retention policy and verify automated deletion/expiry mechanisms before launch.',
              responds_to: null,
              status: 'open',
              requested_context: null
            }
          ]
        },
        {
          agent: 'legal',
          verdict: 'flagged',
          confidence: 0.82,
          summary: 'Behavioral profiling and automated in-app personalization require a completed Privacy Impact Assessment (PIA) and updated privacy notice before production deployment.',
          concerns: [
            {
              id: 'leg-pia-required-1',
              category: 'compliance',
              tags: ['pia_required', 'privacy_notice', 'customer_opt_out'],
              issue: 'Using enterprise user browsing history and feature interaction logs for automated personalization triggers Privacy Impact Assessment (PIA) requirements under data protection policies.',
              severity: 'medium',
              recommendation: 'Complete a Privacy Impact Assessment (PIA), publish updated privacy notices, and establish account-level opt-out controls before customer rollout.',
              responds_to: null,
              status: 'open',
              requested_context: null
            }
          ]
        }
      ]
    }
  },

  {
    event: 'final_report',
    data: {
      finalReport: {
        decision: 'approved_with_conditions',
        decision_basis: 'Rule 3: The proposal demonstrates clear business value and is technically feasible. However, production deployment is contingent upon completion of mandatory security, legal, and engineering actions.',
        overall_summary: 'The AI-Powered Product Recommendation Feature demonstrates strong customer retention value and technical feasibility. However, production rollout is contingent upon completing mandatory compliance deliverables—specifically a Privacy Impact Assessment (PIA), data retention policy, and automated rollback strategy.',
        unresolved_risks: [
          {
            concern_id: 'sec-data-retention-1',
            agent: 'security',
            why_unresolved: 'Explicit 12-month behavioral data deletion schedule must be formally documented before production scale.'
          },
          {
            concern_id: 'leg-pia-required-1',
            agent: 'legal',
            why_unresolved: 'Privacy Impact Assessment (PIA) covering behavioral profiling must be signed off prior to customer rollout.'
          }
        ],
        required_actions: [
          {
            action: 'Complete Privacy Impact Assessment (PIA) covering behavioral data collection and automated recommendations prior to rollout.',
            owner_agent: 'legal',
            concern_id: 'leg-pia-required-1'
          },
          {
            action: 'Define explicit 12-month behavioral data retention policy and verify automated deletion/expiry mechanisms.',
            owner_agent: 'security',
            concern_id: 'sec-data-retention-1'
          },
          {
            action: 'Publish updated privacy notice and configure account-level opt-out controls for enterprise administrators.',
            owner_agent: 'legal',
            concern_id: 'leg-pia-required-1'
          },
          {
            action: 'Document automated rollback strategy and configure capacity monitoring alerts prior to general availability.',
            owner_agent: 'engineering',
            concern_id: 'eng-rollback-capacity-1'
          }
        ],
        agent_alignment: {
          product: 'approved',
          engineering: 'approved',
          security: 'flagged',
          legal: 'flagged'
        }
      }
    }
  },

  { event: 'done', data: {} }
];
