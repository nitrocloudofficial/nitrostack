import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class SocPrompts {

  @Prompt({
    name: 'soc_assistant',
    description: 'Learn about the capabilities of the Autonomous SOC Tier-1 Analyst.',
    arguments: [
      {
        name: 'topic',
        description: 'SOC capability (optional)',
        required: false
      }
    ]
  })
  async socAssistant(args: any, ctx: ExecutionContext) {

    ctx.logger.info('SOC Assistant Prompt');

    const topic = args.topic;

    if (topic) {
      return [
        {
          role: 'user' as const,
          content: `Explain ${topic} in a SOC environment.`
        },
        {
          role: 'assistant' as const,
          content: this.getTopicHelp(topic)
        }
      ];
    }

    return [
      {
        role: 'user' as const,
        content: 'What can this SOC Assistant do?'
      },
      {
        role: 'assistant' as const,
        content:
`The Autonomous SOC Tier-1 Analyst assists Security Operations Center analysts with:

• Alert Triage
• MITRE ATT&CK Mapping
• Incident Reporting
• Threat Intelligence
• Windows & Sysmon Log Analysis
• IOC Investigation
• Threat Correlation
• Response Recommendations

The assistant performs evidence-based analysis and clearly distinguishes observations from analytical assessment.`
      }
    ];
  }

  @Prompt({
    name: 'incident_response_playbook',
    description: 'Generate a SOC incident response playbook.',
    arguments: [
      {
        name: 'incident_type',
        description: 'Incident type',
        required: true
      }
    ]
  })
  async incidentPlaybook(args: any, ctx: ExecutionContext) {

    ctx.logger.info('Incident Response Playbook');

    return [
      {
        role: 'user' as const,
        content:
`Generate an Incident Response Playbook for:

${args.incident_type}`
      },
      {
        role: 'assistant' as const,
        content:
`Generate:

• Incident Summary

• Immediate Containment

• Investigation Steps

• Evidence Collection

• Eradication

• Recovery

• Lessons Learned`
      }
    ];
  }
  @Prompt({
    name: 'threat_hunting',
    description: 'Generate a proactive threat hunting plan.',
    arguments: [
      {
        name: 'ioc',
        description: 'Indicator of Compromise (IP, Hash, Domain, etc.)',
        required: true
      }
    ]
  })
  async threatHunting(args: any, ctx: ExecutionContext) {

    ctx.logger.info('Threat Hunting Prompt');

    return [
      {
        role: 'user' as const,
        content:
`Perform a proactive threat hunt using the following IOC.

IOC:

${args.ioc}`
      },
      {
        role: 'assistant' as const,
        content:
`Generate:

• Systems to Investigate

• Relevant Windows/Sysmon Logs

• Related Indicators

• Detection Opportunities

• Investigation Priority

• Recommended Next Steps`
      }
    ];
  }

  @Prompt({
    name: 'phishing_analysis',
    description: 'Investigate a suspicious email.',
    arguments: [
      {
        name: 'email',
        description: 'Suspicious email details',
        required: true
      }
    ]
  })
  async phishingAnalysis(args: any, ctx: ExecutionContext) {

    ctx.logger.info('Phishing Analysis Prompt');

    return [
      {
        role: 'user' as const,
        content:
`Investigate the following suspicious email.

${args.email}`
      },
      {
        role: 'assistant' as const,
        content:
`Generate:

• Suspicious Indicators

• Email Risk Assessment

• Potential User Impact

• MITRE ATT&CK Mapping (if applicable)

• Recommended Containment

• Investigation Steps`
      }
    ];
  }

  @Prompt({
    name: 'malware_analysis',
    description: 'Perform an initial malware investigation.',
    arguments: [
      {
        name: 'details',
        description: 'Malware details',
        required: true
      }
    ]
  })
  async malwareAnalysis(args: any, ctx: ExecutionContext) {

    ctx.logger.info('Malware Analysis Prompt');

    return [
      {
        role: 'user' as const,
        content:
`Analyse the following malware indicators.

${args.details}`
      },
      {
        role: 'assistant' as const,
        content:
`Generate:

• Observed Evidence

• Initial Assessment

• Possible Malware Behaviour

• MITRE ATT&CK Mapping

• Containment Actions

• Recommended Investigation`
      }
    ];
  }
  @Prompt({
    name: 'executive_summary',
    description: 'Generate an executive summary for leadership.',
    arguments: [
      {
        name: 'incident',
        description: 'Incident details',
        required: true
      }
    ]
  })
  async executiveSummary(args: any, ctx: ExecutionContext) {

    ctx.logger.info('Executive Summary Prompt');

    return [
      {
        role: 'user' as const,
        content:
`Create an executive summary for the following security incident.

${args.incident}`
      },
      {
        role: 'assistant' as const,
        content:
`Generate:

• Executive Summary

• Business Impact

• Current Risk Level

• Current Status

• Immediate Actions Taken

• Recommended Executive Actions

• Next Update`
      }
    ];
  }

  @Prompt({
    name: 'ioc_investigation',
    description: 'Investigate Indicators of Compromise.',
    arguments: [
      {
        name: 'ioc',
        description: 'IP, Domain or SHA256 Hash',
        required: true
      }
    ]
  })
  async iocInvestigation(args: any, ctx: ExecutionContext) {

    ctx.logger.info('IOC Investigation Prompt');

    return [
      {
        role: 'user' as const,
        content:
`Investigate the following IOC.

${args.ioc}`
      },
      {
        role: 'assistant' as const,
        content:
`Generate:

• IOC Classification

• Possible Threat

• Threat Intelligence Recommendations

• Related MITRE ATT&CK Techniques

• Recommended Investigation

• Recommended Response`
      }
    ];
  }

  @Prompt({
    name: 'soc_incident_report',
    description: 'Generate a concise SOC incident report.',
    arguments: [
      {
        name: 'alert',
        description: 'Security alert',
        required: true
      }
    ]
  })
  async incidentReport(args: any, ctx: ExecutionContext) {

    ctx.logger.info('SOC Incident Report Prompt');

    return [
      {
        role: 'user' as const,
        content:
`Generate a professional SOC Incident Report.

Security Alert:

${args.alert}`
      },
      {
        role: 'assistant' as const,
        content:
`Include:

• Incident Summary

• Observed Evidence

• Security Assessment

• MITRE ATT&CK Mapping

• Business Impact

• Recommended Containment

• Investigation Steps

• Current Status`
      }
    ];
  }
  private getTopicHelp(topic: string): string {

    const helps: Record<string, string> = {

      triage:
        `Alert Triage analyses security alerts, assigns an evidence-based severity, identifies observed indicators and recommends investigation steps.`,

      mitre:
        `MITRE Mapping suggests possible ATT&CK techniques and tactics based on observed behaviour without claiming confirmed attacker activity.`,

      incident:
        `Incident Reporting generates a concise SOC report containing summary, observed evidence, assessment, impact and recommended actions.`,

      threat:
        `Threat Intelligence investigates IP addresses, domains and SHA256 hashes. Results should always be validated using trusted threat intelligence sources.`,

      logs:
        `Log Analysis extracts observable indicators from Windows, Linux and Sysmon logs while avoiding unsupported conclusions.`,

      correlation:
        `Threat Correlation identifies relationships between multiple alerts using shared indicators such as IP addresses, usernames and hostnames.`,

      response:
        `Response Recommendation provides containment, investigation and recovery actions appropriate to the assessed severity.`,

      phishing:
        `Phishing Investigation reviews suspicious emails, attachments and URLs, identifies phishing indicators and recommends containment actions.`,

      malware:
        `Malware Investigation performs an initial assessment of suspicious executables, behaviours and indicators while distinguishing observed evidence from assumptions.`,

      executive:
        `Executive Summary produces a management-friendly overview including business impact, current status and recommended actions.`,

      hunting:
        `Threat Hunting generates proactive hunting hypotheses and recommends systems, logs and indicators to investigate.`,

      ioc:
        `IOC Investigation analyses suspicious IPs, domains and hashes, recommends enrichment sources and highlights related investigation steps.`

    };

    return (
      helps[topic.toLowerCase()] ||

`Available SOC topics:

• triage
• mitre
• incident
• threat
• logs
• correlation
• response
• phishing
• malware
• executive
• hunting
• ioc

Example:
topic="malware"`
    );

  }

}
