import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';

export class SocTools {

  @Tool({
    name: 'triage_alert',
    description: 'Perform evidence-based triage of a security alert.',
    inputSchema: z.object({
      alert_type: z.string().describe('Alert category'),
      source_ip: z.string().describe('Source IP'),
      destination_ip: z.string().describe('Destination IP'),
      event: z.string().describe('Observed security event')
    })
  })
  @Widget('soc-dashboard')
  async triageAlert(input: any, ctx: ExecutionContext) {

    ctx.logger.info('SOC Alert Triage', input);

    const event = input.event.toLowerCase();

    const observed: string[] = [];
    const nextSteps: string[] = [];

    let severity = 'Low';
    let confidence = 'Low';

    if (event.includes('powershell')) {
      observed.push('PowerShell execution observed.');
      severity = 'Medium';
      confidence = 'Medium';
    }

    if (event.includes('encodedcommand')) {
      observed.push('Encoded PowerShell command observed.');
      severity = 'High';
    }

    if (event.includes('failed login')) {
      observed.push('Repeated failed authentication attempts observed.');
      severity = severity === 'High' ? 'High' : 'Medium';
    }

    if (event.includes('ransomware')) {
      observed.push('Ransomware-related activity referenced.');
      severity = 'Critical';
      confidence = 'Medium';
    }

    if (event.includes('cmd.exe')) {
      observed.push('cmd.exe execution observed.');
    }

    if (observed.length === 0) {
      observed.push('No predefined suspicious indicators detected.');
    }

    nextSteps.push(
      'Review endpoint telemetry.',
      'Check authentication logs.',
      'Collect process tree.',
      'Validate indicators using EDR.'
    );

    return {

      status: 'Assessment Completed',

      severity,

      confidence,

      observed,

      assessment:
        'Assessment is based only on observed evidence. No compromise is confirmed.',

      next_steps: nextSteps,

      source_ip: input.source_ip,

      destination_ip: input.destination_ip,

      alert_type: input.alert_type

    };

  }
  @Tool({
    name: 'mitre_mapper',
    description: 'Map observed behaviour to possible MITRE ATT&CK techniques.',
    inputSchema: z.object({
      event: z.string().describe('Observed security event')
    })
  })
  @Widget('soc-dashboard')
  async mitreMapper(input: any, ctx: ExecutionContext) {

    ctx.logger.info('MITRE Mapping', input);

    const event = input.event.toLowerCase();

    let technique = 'Unknown';
    let tactic = 'Unknown';
    let confidence = 'Low';
    let reason =
      'Insufficient evidence to determine a MITRE ATT&CK mapping.';

    if (event.includes('powershell')) {
      technique = 'T1059.001';
      tactic = 'Execution';
      confidence = 'Possible';
      reason =
        'PowerShell activity was observed.';
    }

    if (event.includes('ransomware')) {
      technique = 'T1486';
      tactic = 'Impact';
      confidence = 'Possible';
      reason =
        'The alert references ransomware behaviour.';
    }

    if (event.includes('credential')) {
      technique = 'T1003';
      tactic = 'Credential Access';
      confidence = 'Possible';
      reason =
        'Credential-related activity was observed.';
    }

    return {

      technique,

      tactic,

      confidence,

      reason,

      analyst_note:
        'MITRE mappings indicate possible behaviour patterns and should not be interpreted as confirmation.'

    };

  }
  @Tool({
    name: 'recommend_response',
    description: 'Provide evidence-based SOC response recommendations.',
    inputSchema: z.object({
      severity: z.string()
    })
  })
  @Widget('soc-dashboard')
  async recommendResponse(input: any) {

    const severity = input.severity.toLowerCase();

    let priority = "Low";

    let containment: string[] = [];

    let investigation: string[] = [];

    if (severity === "critical") {

      priority = "Immediate";

      containment = [
        "Isolate affected endpoint",
        "Block suspected indicators",
        "Restrict user access if necessary"
      ];

      investigation = [
        "Collect memory dump",
        "Acquire process tree",
        "Review SIEM & EDR telemetry"
      ];

    } else if (severity === "high") {

      priority = "High";

      containment = [
        "Increase monitoring",
        "Restrict suspicious communications"
      ];

      investigation = [
        "Review authentication logs",
        "Review endpoint events"
      ];

    } else if (severity === "medium") {

      priority = "Medium";

      investigation = [
        "Validate alert",
        "Review endpoint telemetry"
      ];

    } else {

      priority = "Low";

      investigation = [
        "Continue monitoring"
      ];

    }

    return {

      priority,

      containment,

      investigation,

      analyst_note:
        "Recommendations are based on current evidence and should be validated by a SOC analyst."

    };

  }
  @Tool({
    name: 'incident_report',
    description: 'Generate a concise evidence-based SOC incident report.',
    inputSchema: z.object({
      severity: z.string(),
      source_ip: z.string(),
      event: z.string()
    })
  })
  @Widget('soc-dashboard')
  async incidentReport(input: any) {

    const severity = input.severity;

    let priority = "Low";

    if (severity.toLowerCase() === "critical")
      priority = "Immediate";
    else if (severity.toLowerCase() === "high")
      priority = "High";
    else if (severity.toLowerCase() === "medium")
      priority = "Medium";

    return {

      title: "SOC Incident Report",

      severity,

      priority,

      source_ip: input.source_ip,

      incident: input.event,

      summary:
        "Suspicious activity was identified based on the supplied evidence. Additional investigation is required before confirming compromise.",

      observed: [
        input.event
      ],

      assessment:
        "Current evidence indicates potentially suspicious behaviour. The available information is insufficient to confirm malware execution, persistence, lateral movement, or command-and-control activity.",

      next_steps: [
        "Review endpoint telemetry",
        "Collect process tree",
        "Review SIEM & EDR logs",
        "Validate indicators using threat intelligence"
      ],

      status: "Open Investigation",

      analyst_note:
        "This report distinguishes observed evidence from analytical assessment."

    };

  }
  @Tool({
    name: 'correlate_alerts',
    description: 'Correlate security alerts using available evidence.',
    inputSchema: z.object({
      source_ip: z.string(),
      username: z.string().optional(),
      hostname: z.string().optional()
    })
  })
  @Widget('soc-dashboard')
  async correlateAlerts(input: any) {

    const evidence: string[] = [];

    if (input.source_ip)
      evidence.push(`Shared Source IP: ${input.source_ip}`);

    if (input.username)
      evidence.push(`Shared Username: ${input.username}`);

    if (input.hostname)
      evidence.push(`Shared Hostname: ${input.hostname}`);

    let status = "Insufficient Evidence";
    let confidence = "Low";

    if (evidence.length >= 2) {
      status = "Possible Correlation";
      confidence = "Medium";
    }

    return {

      correlation_status: status,

      confidence,

      evidence,

      missing_information: [
        "Event timestamps",
        "Process lineage",
        "Network telemetry"
      ],

      assessment:
        "Correlation is based only on shared attributes and should not be interpreted as confirmation of a coordinated attack."

    };

  }
    @Tool({
    name: 'lookup_ip',
    description: 'Provide an evidence-based assessment of an IP address.',
    inputSchema: z.object({
      ip: z.string().describe('IP address')
    })
  })
  @Widget('soc-dashboard')
  async lookupIp(input: any, ctx: ExecutionContext) {

    ctx.logger.info('IP Assessment', input);

    const privateIp =
      input.ip.startsWith('10.') ||
      input.ip.startsWith('192.168.') ||
      input.ip.startsWith('172.16.') ||
      input.ip.startsWith('172.17.') ||
      input.ip.startsWith('172.18.') ||
      input.ip.startsWith('172.19.') ||
      input.ip.startsWith('172.20.') ||
      input.ip.startsWith('172.21.') ||
      input.ip.startsWith('172.22.') ||
      input.ip.startsWith('172.23.') ||
      input.ip.startsWith('172.24.') ||
      input.ip.startsWith('172.25.') ||
      input.ip.startsWith('172.26.') ||
      input.ip.startsWith('172.27.') ||
      input.ip.startsWith('172.28.') ||
      input.ip.startsWith('172.29.') ||
      input.ip.startsWith('172.30.') ||
      input.ip.startsWith('172.31.');

    let risk = 'Low';
    let reputation = 'Internal';

    if (!privateIp) {
      risk = 'Medium';
      reputation = 'External';
    }

    if (
      input.ip.startsWith('185.') ||
      input.ip.startsWith('103.')
    ) {
      risk = 'High';
      reputation = 'Suspicious';
    }

    return {

      status: 'Assessment Completed',

      severity: risk === 'High' ? 'High' : 'Low',

      alert_type: 'Threat Intelligence',

      source_ip: input.ip,

      destination_ip: 'N/A',

      summary:
        risk === 'High'
          ? 'The IP matches locally defined suspicious indicators and requires investigation.'
          : privateIp
            ? 'Private IP address observed. No suspicious indicators identified from the supplied IP alone.'
            : 'External IP observed. Additional threat intelligence validation is recommended.',

      incident:
        'IP assessment completed using local evidence only.',

      recommendation:
        risk === 'High'
          ? 'Review firewall logs, SIEM events, endpoint telemetry and validate using trusted threat intelligence sources.'
          : 'Continue monitoring and validate with external threat intelligence if necessary.',

      reputation,

      risk,

      technique: undefined,

      tactic: undefined,

      campaign: undefined,

      confidence: 'Evidence-Based',

      recommended_actions:
        risk === 'High'
          ? [
              'Review SIEM logs',
              'Investigate related endpoints',
              'Block IP if confirmed malicious'
            ]
          : [
              'Continue monitoring',
              'Review related authentication and network logs'
            ]

    };

  }
  @Tool({
    name: 'lookup_hash',
    description: 'Assess a file hash using available local evidence.',
    inputSchema: z.object({
      hash: z.string().describe('SHA256 hash')
    })
  })
  @Widget('soc-dashboard')
  async lookupHash(input: any, ctx: ExecutionContext) {

    ctx.logger.info('Hash Assessment', input);

    return {

      hash: input.hash,

      lookup_status: 'Not Queried',

      reputation: 'Unknown',

      assessment:
        'The supplied hash has not been checked against any external threat intelligence source.',

      recommended_sources: [
        'VirusTotal',
        'Hybrid Analysis',
        'Any.Run',
        'Internal IOC Repository'
      ],

      analyst_note:
        'No conclusion regarding maliciousness can be made without threat intelligence lookup.'

    };

  }
  @Tool({
    name: 'parse_logs',
    description: 'Extract observable indicators from Windows, Linux or Sysmon logs.',
    inputSchema: z.object({
      log: z.string().describe('Raw log')
    })
  })
  @Widget('soc-dashboard')
  async parseLogs(input: any, ctx: ExecutionContext) {

    ctx.logger.info('Parsing security logs');

    const log = input.log.toLowerCase();

    const observed: string[] = [];

    if (log.includes('powershell'))
      observed.push('PowerShell execution observed.');

    if (log.includes('encodedcommand'))
      observed.push('Encoded PowerShell command observed.');

    if (log.includes('cmd.exe'))
      observed.push('cmd.exe execution observed.');

    if (log.includes('rundll32'))
      observed.push('rundll32.exe execution observed.');

    if (log.includes('failed'))
      observed.push('Failed authentication attempts observed.');

    if (log.includes('ransomware'))
      observed.push('Ransomware-related indicators observed.');

    if (log.includes('malware'))
      observed.push('Malware-related keywords observed.');

    if (observed.length === 0) {
      observed.push('No predefined suspicious indicators detected.');
    }

return {
  severity: observed.length > 2 ? "High" : "Medium",

  status: "Logs Parsed",

  alert_type: "Windows Sysmon",

  summary:
    observed.length > 0
      ? observed.join(", ")
      : "No suspicious indicators detected.",

  incident:
    "Security log analysis completed.",

  recommendation:
    "Review complete log timeline and investigate suspicious processes.",

  observed_events: observed,

  assessment:
    "Assessment is based only on observed log entries.",

  recommended_actions: [
    "Review SIEM logs",
    "Review process tree",
    "Validate indicators"
  ]
};

  }

}
