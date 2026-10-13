import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

export class SecurityTools {
  @Tool({
    name: 'analyze_ip_reputation',
    description: 'Check the threat intelligence database for a specific IP address.',
    inputSchema: z.object({
      ip_address: z.string().describe('The IP address to investigate')
    })
  })
  async analyzeIpReputation(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Analyzing IP reputation with real API', { ip: input.ip_address });
    
    try {
      // Calling a real public API for IP information (ip-api.com)
      const response = await fetch(`http://ip-api.com/json/${input.ip_address}?fields=status,message,country,regionName,city,isp,org,as,query`);
      const data: any = await response.json();
      
      if (data.status === 'fail') {
        return {
          ip: input.ip_address,
          status: 'ERROR',
          message: data.message || 'Failed to fetch IP details from public API'
        };
      }

      // We'll simulate a threat score based on whether it's a known cloud provider 
      // (since malicious bots often run in datacenters instead of residential IPs).
      const ispName = (data.isp || '').toLowerCase();
      const isDatacenter = ispName.includes('amazon') || ispName.includes('google') || ispName.includes('digitalocean') || ispName.includes('microsoft');
      const threat_score = isDatacenter ? 75 : 15;

      return {
        ip: data.query,
        location: `${data.city}, ${data.regionName}, ${data.country}`,
        isp_and_org: `${data.isp} / ${data.org}`,
        asn: data.as,
        threat_score: threat_score,
        status: threat_score > 50 ? 'SUSPICIOUS' : 'CLEAN',
        analysis: `[REAL API DATA]: This IP is located in ${data.country} and belongs to ${data.org}. ${isDatacenter ? 'It belongs to a known datacenter/cloud provider, which often source automated bot traffic.' : 'It appears to be a standard residential or commercial connection.'}`
      };
    } catch (error: any) {
      ctx.logger.error('Failed to fetch real IP data', { error: error.message });
      return {
        ip: input.ip_address,
        status: 'ERROR',
        message: 'Could not connect to the real IP lookup API.'
      };
    }
  }

  @Tool({
    name: 'fetch_recent_logins',
    description: 'Fetch recent authentication attempts from the Identity Provider.',
    inputSchema: z.object({
      target: z.string().describe('The user email or IP address to check')
    })
  })
  async fetchRecentLogins(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Fetching recent logins', { target: input.target });
    
    // Simulated Auth0/Okta integration
    return {
      target: input.target,
      total_attempts_24h: 154,
      successful_logins: 1,
      failed_logins: 153,
      events: [
        { time: '2026-07-17 14:10:00', status: 'FAILED', reason: 'Invalid Password', ip: input.target },
        { time: '2026-07-17 14:10:05', status: 'FAILED', reason: 'Invalid Password', ip: input.target },
        { time: '2026-07-17 14:15:22', status: 'SUCCESS', reason: 'MFA Bypassed', ip: input.target }
      ],
      alert: 'High volume of failed logins followed by a successful login indicates a potential credential stuffing attack.'
    };
  }

  @Tool({
    name: 'block_malicious_ip',
    description: 'Update the WAF (Web Application Firewall) to block an IP address.',
    inputSchema: z.object({
      ip_address: z.string().describe('The IP address to block'),
      approved: z.boolean().describe('Must be explicitly true. NEVER execute without asking the human user for approval first!')
    })
  })
  async blockMaliciousIp(input: any, ctx: ExecutionContext) {
    if (!input.approved) {
      return {
        status: 'BLOCKED',
        message: 'WAF modification requires explicit human approval. Please ask the user for permission.'
      };
    }

    ctx.logger.info('Blocking IP address', { ip: input.ip_address });
    
    // Simulated Cloudflare/AWS WAF integration
    return {
      status: 'SUCCESS',
      message: `Successfully added ${input.ip_address} to the WAF global deny list.`,
      action_taken: 'IP blocked across all endpoints. Active sessions from this IP have been terminated.'
    };
  }
}
