import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class PipelinePrompts {
  @Prompt({
    name: 'enterprise_analysis',
    description:
      'Generate an enterprise-grade analysis prompt for any business query. ' +
      'Covers strategy, risks, recommendations, and actionable insights.',
    arguments: [
      { name: 'topic', description: 'The business topic or question to analyze', required: true },
      { name: 'context', description: 'Additional business context or constraints', required: false },
    ],
  })
  async enterpriseAnalysis(args: { topic: string; context?: string }, ctx: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: [
          `Perform a comprehensive enterprise analysis on: ${args.topic}`,
          args.context ? `Context: ${args.context}` : '',
          '',
          'Please provide:',
          '1. Executive Summary',
          '2. Key Findings and Analysis',
          '3. Risk Assessment (identify potential risks and mitigation strategies)',
          '4. Strategic Recommendations (prioritized, actionable)',
          '5. Implementation Roadmap',
          '6. Success Metrics and KPIs',
        ].filter(Boolean).join('\n'),
      },
    ];
  }

  @Prompt({
    name: 'security_review',
    description:
      'Generate a security review prompt covering threat analysis, ' +
      'vulnerability assessment, and compliance recommendations.',
    arguments: [
      { name: 'system', description: 'The system or application to review', required: true },
      { name: 'scope', description: 'Scope of the review', required: false },
    ],
  })
  async securityReview(args: { system: string; scope?: string }, ctx: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: [
          `Conduct a comprehensive security review for: ${args.system}`,
          args.scope ? `Scope: ${args.scope}` : 'Scope: Full system review',
          '',
          'Please analyze:',
          '1. Threat Landscape',
          '2. Vulnerability Assessment',
          '3. Access Control Review',
          '4. Data Protection',
          '5. Compliance Status (SOC2, GDPR, HIPAA)',
          '6. Remediation Priorities',
          '7. Security Roadmap',
        ].join('\n'),
      },
    ];
  }

  @Prompt({
    name: 'architecture_review',
    description:
      'Generate an architecture review prompt for system design evaluation.',
    arguments: [
      { name: 'system', description: 'The system or architecture to review', required: true },
      { name: 'concerns', description: 'Specific architectural concerns', required: false },
    ],
  })
  async architectureReview(args: { system: string; concerns?: string }, ctx: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: [
          `Review the architecture of: ${args.system}`,
          args.concerns ? `Key concerns: ${args.concerns}` : '',
          '',
          'Please evaluate:',
          '1. Architecture Overview',
          '2. Scalability Analysis',
          '3. Reliability and Resilience',
          '4. Performance Characteristics',
          '5. Maintainability',
          '6. Integration Points',
          '7. Recommendations',
        ].filter(Boolean).join('\n'),
      },
    ];
  }

  @Prompt({
    name: 'planning_assistant',
    description: 'Generate a project planning prompt with timeline, milestones, and risk management.',
    arguments: [
      { name: 'project', description: 'The project to plan', required: true },
      { name: 'timeline', description: 'Target timeline or deadline', required: false },
      { name: 'team_size', description: 'Available team size', required: false },
    ],
  })
  async planningAssistant(args: { project: string; timeline?: string; team_size?: string }, ctx: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: [
          `Create a comprehensive project plan for: ${args.project}`,
          args.timeline ? `Timeline: ${args.timeline}` : '',
          args.team_size ? `Team size: ${args.team_size}` : '',
          '',
          'Include:',
          '1. Project Scope and Objectives',
          '2. Work Breakdown Structure',
          '3. Timeline with Milestones',
          '4. Resource Allocation',
          '5. Risk Register with Mitigation Plans',
          '6. Dependencies and Critical Path',
          '7. Success Criteria and Deliverables',
        ].filter(Boolean).join('\n'),
      },
    ];
  }
}
