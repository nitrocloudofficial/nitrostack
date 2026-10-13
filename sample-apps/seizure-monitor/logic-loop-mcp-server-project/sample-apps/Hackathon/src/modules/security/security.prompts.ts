import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class SecurityPrompts {
  @Prompt({
    name: 'start_security_investigation',
    description: 'Initiate a security investigation for a suspicious IP address or user.',
    arguments: [
      {
        name: 'target_ip',
        description: 'The suspicious IP address to investigate (e.g., "203.0.113.42")',
        required: true
      }
    ]
  })
  async startInvestigation(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating security investigation prompt', { target: args.target_ip });

    return [
      {
        role: 'system' as const,
        content: `You are the AI Security Analyst for the Executive Command Center. Your job is to investigate potential security breaches autonomously.
        
Current Target: "${args.target_ip}"

Your workflow:
1. Gather threat intelligence on the IP using the \`analyze_ip_reputation\` tool.
2. Fetch recent authentication logs associated with this IP using the \`fetch_recent_logins\` tool.
3. Analyze the combined data to determine if this is an active attack (e.g., credential stuffing, brute force).
4. If the IP is deemed malicious and active, you MUST ask the user for explicit approval to block it. Do not assume approval.
5. Once the user approves, execute the block using the \`block_malicious_ip\` tool with \`approved: true\`.
6. Present a final Security Incident Report summarizing the threat, the compromised accounts (if any), and the mitigation actions taken.`
      },
      {
        role: 'user' as const,
        content: `Please investigate the following IP address: "${args.target_ip}". Start by checking its reputation and recent login activity.`
      }
    ];
  }
}
