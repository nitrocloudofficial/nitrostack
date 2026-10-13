import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

export class SocResources {

  @Resource({
    uri: 'soc://mitre-attack',
    name: 'MITRE ATT&CK Quick Reference',
    description: 'Frequently used MITRE ATT&CK techniques for SOC investigations.',
    mimeType: 'application/json'
  })
  async mitreAttack(uri: string, ctx: ExecutionContext) {

    ctx.logger.info('Loading MITRE ATT&CK Reference');

    const techniques = [

      {
        id: 'T1059.001',
        name: 'PowerShell',
        tactic: 'Execution',
        description: 'PowerShell used to execute commands and scripts.'
      },

      {
        id: 'T1003',
        name: 'OS Credential Dumping',
        tactic: 'Credential Access',
        description: 'Attempt to obtain credentials from the operating system.'
      },

      {
        id: 'T1055',
        name: 'Process Injection',
        tactic: 'Defense Evasion',
        description: 'Inject code into another running process.'
      },

      {
        id: 'T1486',
        name: 'Data Encrypted for Impact',
        tactic: 'Impact',
        description: 'Encrypt files to disrupt operations (Ransomware).'
      },

      {
        id: 'T1078',
        name: 'Valid Accounts',
        tactic: 'Defense Evasion',
        description: 'Use of legitimate accounts for persistence or access.'
      },

      {
        id: 'T1021',
        name: 'Remote Services',
        tactic: 'Lateral Movement',
        description: 'Move laterally using RDP, SMB or SSH.'
      },

      {
        id: 'T1105',
        name: 'Ingress Tool Transfer',
        tactic: 'Command and Control',
        description: 'Transfer malicious tools to compromised hosts.'
      }

    ];

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              framework: 'MITRE ATT&CK',
              techniques
            },
            null,
            2
          )
        }
      ]
    };

  }

  @Resource({
    uri: 'soc://windows-eventids',
    name: 'Windows Security Event IDs',
    description: 'Common Microsoft Windows Security Event IDs.',
    mimeType: 'application/json'
  })
  async windowsEventIds(uri: string, ctx: ExecutionContext) {

    ctx.logger.info('Loading Windows Event IDs');

    const events = [

      {
        id: 4624,
        title: 'Successful Logon'
      },

      {
        id: 4625,
        title: 'Failed Logon'
      },

      {
        id: 4634,
        title: 'Logoff'
      },

      {
        id: 4648,
        title: 'Explicit Credential Logon'
      },

      {
        id: 4672,
        title: 'Special Privileges Assigned'
      },

      {
        id: 4688,
        title: 'Process Creation'
      },

      {
        id: 4698,
        title: 'Scheduled Task Created'
      },

      {
        id: 4720,
        title: 'User Account Created'
      },

      {
        id: 4728,
        title: 'User Added to Security Group'
      },

      {
        id: 7045,
        title: 'Service Installed'
      }

    ];

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              framework: 'Microsoft Windows Security Auditing',
              events
            },
            null,
            2
          )
        }
      ]
    };

  }
  @Resource({
    uri: 'soc://sysmon-eventids',
    name: 'Microsoft Sysmon Event IDs',
    description: 'Frequently used Sysmon events for endpoint investigations.',
    mimeType: 'application/json'
  })
  async sysmonEventIds(uri: string, ctx: ExecutionContext) {

    ctx.logger.info('Loading Sysmon Event IDs');

    const events = [

      {
        id: 1,
        event: 'Process Creation',
        description: 'Logs every newly created process with command line.'
      },

      {
        id: 2,
        event: 'File Creation Time Changed',
        description: 'Useful for detecting timestomping.'
      },

      {
        id: 3,
        event: 'Network Connection',
        description: 'Records outbound and inbound network connections.'
      },

      {
        id: 5,
        event: 'Process Terminated',
        description: 'Logs terminated processes.'
      },

      {
        id: 7,
        event: 'Image Loaded',
        description: 'Detects DLL loading.'
      },

      {
        id: 8,
        event: 'CreateRemoteThread',
        description: 'Useful for process injection detection.'
      },

      {
        id: 10,
        event: 'Process Access',
        description: 'Useful for detecting LSASS credential dumping.'
      },

      {
        id: 11,
        event: 'File Create',
        description: 'Logs newly created files.'
      },

      {
        id: 13,
        event: 'Registry Value Set',
        description: 'Registry persistence monitoring.'
      },

      {
        id: 22,
        event: 'DNS Query',
        description: 'Logs DNS requests from processes.'
      }

    ];

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(
          {
            framework: 'Microsoft Sysinternals Sysmon',
            events
          },
          null,
          2
        )
      }]
    };

  }

  @Resource({
    uri: 'soc://nist-ir',
    name: 'NIST Incident Response Lifecycle',
    description: 'NIST SP 800-61 Incident Response Phases.',
    mimeType: 'application/json'
  })
  async nistIncidentResponse(uri: string, ctx: ExecutionContext) {

    ctx.logger.info('Loading NIST Incident Response');

    const phases = [

      {
        phase: 1,
        name: 'Preparation',
        purpose: 'Prepare people, processes and technology.'
      },

      {
        phase: 2,
        name: 'Detection and Analysis',
        purpose: 'Identify and analyse security incidents.'
      },

      {
        phase: 3,
        name: 'Containment, Eradication and Recovery',
        purpose: 'Contain the threat, remove it and restore operations.'
      },

      {
        phase: 4,
        name: 'Post-Incident Activity',
        purpose: 'Capture lessons learned and improve defences.'
      }

    ];

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(
          {
            framework: 'NIST SP 800-61 Rev.2',
            phases
          },
          null,
          2
        )
      }]
    };

  }
  @Resource({
    uri: 'soc://owasp-top10',
    name: 'OWASP Top 10 (2021)',
    description: 'OWASP Top 10 Web Application Security Risks.',
    mimeType: 'application/json'
  })
  async owaspTop10(uri: string, ctx: ExecutionContext) {

    ctx.logger.info('Loading OWASP Top 10');

    const risks = [

      {
        id: 'A01:2021',
        name: 'Broken Access Control'
      },

      {
        id: 'A02:2021',
        name: 'Cryptographic Failures'
      },

      {
        id: 'A03:2021',
        name: 'Injection'
      },

      {
        id: 'A04:2021',
        name: 'Insecure Design'
      },

      {
        id: 'A05:2021',
        name: 'Security Misconfiguration'
      },

      {
        id: 'A06:2021',
        name: 'Vulnerable and Outdated Components'
      },

      {
        id: 'A07:2021',
        name: 'Identification and Authentication Failures'
      },

      {
        id: 'A08:2021',
        name: 'Software and Data Integrity Failures'
      },

      {
        id: 'A09:2021',
        name: 'Security Logging and Monitoring Failures'
      },

      {
        id: 'A10:2021',
        name: 'Server-Side Request Forgery (SSRF)'
      }

    ];

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(
          {
            framework: 'OWASP Top 10 (2021)',
            risks
          },
          null,
          2
        )
      }]
    };

  }

  @Resource({
    uri: 'soc://mitre-tactics',
    name: 'MITRE ATT&CK Tactics',
    description: 'Enterprise ATT&CK tactics used during investigations.',
    mimeType: 'application/json'
  })
  async mitreTactics(uri: string, ctx: ExecutionContext) {

    ctx.logger.info('Loading MITRE ATT&CK Tactics');

    const tactics = [

      'Reconnaissance',
      'Resource Development',
      'Initial Access',
      'Execution',
      'Persistence',
      'Privilege Escalation',
      'Defense Evasion',
      'Credential Access',
      'Discovery',
      'Lateral Movement',
      'Collection',
      'Command and Control',
      'Exfiltration',
      'Impact'

    ];

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(
          {
            framework: 'MITRE ATT&CK Enterprise',
            tactics
          },
          null,
          2
        )
      }]
    };

  }
  @Resource({
    uri: 'soc://cyber-kill-chain',
    name: 'Lockheed Martin Cyber Kill Chain',
    description: 'Seven phases of the Cyber Kill Chain framework.',
    mimeType: 'application/json'
  })
  async cyberKillChain(uri: string, ctx: ExecutionContext) {

    ctx.logger.info('Loading Cyber Kill Chain');

    const phases = [

      {
        phase: 1,
        name: 'Reconnaissance'
      },

      {
        phase: 2,
        name: 'Weaponization'
      },

      {
        phase: 3,
        name: 'Delivery'
      },

      {
        phase: 4,
        name: 'Exploitation'
      },

      {
        phase: 5,
        name: 'Installation'
      },

      {
        phase: 6,
        name: 'Command and Control'
      },

      {
        phase: 7,
        name: 'Actions on Objectives'
      }

    ];

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(
          {
            framework: 'Lockheed Martin Cyber Kill Chain',
            phases
          },
          null,
          2
        )
      }]
    };

  }

  @Resource({
    uri: 'soc://tier1-playbook',
    name: 'Tier-1 SOC Investigation Checklist',
    description: 'Standard Tier-1 SOC investigation workflow.',
    mimeType: 'application/json'
  })
  async tier1Playbook(uri: string, ctx: ExecutionContext) {

    ctx.logger.info('Loading Tier-1 Investigation Checklist');

    const checklist = [

      'Validate the alert',

      'Identify affected host',

      'Identify affected user',

      'Review authentication logs',

      'Review endpoint telemetry',

      'Review process tree',

      'Review network connections',

      'Collect Indicators of Compromise (IOCs)',

      'Map activity to MITRE ATT&CK',

      'Determine business impact',

      'Recommend containment actions',

      'Escalate to Tier-2 SOC if required'

    ];

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(
          {
            framework: 'SOC Tier-1 Best Practices',
            checklist
          },
          null,
          2
        )
      }]
    };

  }

}