import { Injectable, PromptDecorator as Prompt } from '@nitrostack/core';

@Injectable()
export class PipelinePrompts {
  @Prompt({
    name: 'enterprise_analysis',
    title: 'Enterprise Analysis',
    description:
      'Generate an enterprise-grade analysis prompt for any business query. ' +
      'Covers strategy, risks, recommendations, and actionable insights.',
    arguments: [
      {
        name: 'topic',
        description: 'The business topic or question to analyze',
        required: true,
      },
      {
        name: 'context',
        description: 'Additional business context or constraints',
        required: false,
      },
    ],
  })
  async enterpriseAnalysis(
    args: { topic: string; context?: string },
    ctx: any
  ) {
    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: [
            `Perform a comprehensive enterprise analysis on: ${args.topic}`,
            '',
            args.context ? `Context: ${args.context}` : '',
            '',
            'Please provide:',
            '1. Executive Summary',
            '2. Key Findings and Analysis',
            '3. Risk Assessment (identify potential risks and mitigation strategies)',
            '4. Strategic Recommendations (prioritized, actionable)',
            '5. Implementation Roadmap',
            '6. Success Metrics and KPIs',
            '',
            'Format the response for enterprise stakeholders with clear structure and data-driven insights.',
          ]
            .filter(Boolean)
            .join('\n'),
        },
      },
    ];
  }

  @Prompt({
    name: 'security_review',
    title: 'Security Review',
    description:
      'Generate a security review prompt covering threat analysis, ' +
      'vulnerability assessment, and compliance recommendations.',
    arguments: [
      {
        name: 'system',
        description: 'The system or application to review',
        required: true,
      },
      {
        name: 'scope',
        description: 'Scope of the review (infrastructure, application, data, etc.)',
        required: false,
      },
    ],
  })
  async securityReview(
    args: { system: string; scope?: string },
    ctx: any
  ) {
    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: [
            `Conduct a comprehensive security review for: ${args.system}`,
            args.scope ? `Scope: ${args.scope}` : 'Scope: Full system review',
            '',
            'Please analyze:',
            '1. Threat Landscape — identify relevant threats and attack vectors',
            '2. Vulnerability Assessment — potential weaknesses and exposures',
            '3. Access Control Review — authentication, authorization, and permissions',
            '4. Data Protection — encryption, data handling, and privacy',
            '5. Compliance Status — relevant standards (SOC2, GDPR, HIPAA, etc.)',
            '6. Remediation Priorities — ranked by severity and impact',
            '7. Security Roadmap — immediate, short-term, and long-term actions',
          ].join('\n'),
        },
      },
    ];
  }

  @Prompt({
    name: 'architecture_review',
    title: 'Architecture Review',
    description:
      'Generate an architecture review prompt for system design evaluation, ' +
      'scalability assessment, and technical recommendations.',
    arguments: [
      {
        name: 'system',
        description: 'The system or architecture to review',
        required: true,
      },
      {
        name: 'concerns',
        description: 'Specific architectural concerns to address',
        required: false,
      },
    ],
  })
  async architectureReview(
    args: { system: string; concerns?: string },
    ctx: any
  ) {
    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: [
            `Review the architecture of: ${args.system}`,
            args.concerns ? `Key concerns: ${args.concerns}` : '',
            '',
            'Please evaluate:',
            '1. Architecture Overview — current design patterns and components',
            '2. Scalability Analysis — horizontal/vertical scaling capabilities',
            '3. Reliability and Resilience — fault tolerance, disaster recovery',
            '4. Performance Characteristics — bottlenecks, optimization opportunities',
            '5. Maintainability — code organization, documentation, technical debt',
            '6. Integration Points — APIs, dependencies, third-party services',
            '7. Recommendations — prioritized improvements with effort/impact matrix',
          ]
            .filter(Boolean)
            .join('\n'),
        },
      },
    ];
  }

  @Prompt({
    name: 'planning_assistant',
    title: 'Project Planning',
    description:
      'Generate a project planning prompt with timeline, milestones, ' +
      'resource allocation, and risk management.',
    arguments: [
      {
        name: 'project',
        description: 'The project to plan',
        required: true,
      },
      {
        name: 'timeline',
        description: 'Target timeline or deadline',
        required: false,
      },
      {
        name: 'team_size',
        description: 'Available team size',
        required: false,
      },
    ],
  })
  async planningAssistant(
    args: { project: string; timeline?: string; team_size?: string },
    ctx: any
  ) {
    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: [
            `Create a comprehensive project plan for: ${args.project}`,
            args.timeline ? `Timeline: ${args.timeline}` : '',
            args.team_size ? `Team size: ${args.team_size}` : '',
            '',
            'Include:',
            '1. Project Scope and Objectives',
            '2. Work Breakdown Structure (WBS)',
            '3. Timeline with Milestones',
            '4. Resource Allocation',
            '5. Risk Register with Mitigation Plans',
            '6. Dependencies and Critical Path',
            '7. Success Criteria and Deliverables',
          ]
            .filter(Boolean)
            .join('\n'),
        },
      },
    ];
  }
}
