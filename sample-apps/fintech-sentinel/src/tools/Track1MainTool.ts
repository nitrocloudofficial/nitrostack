import { ControllerDecorator as Controller, ToolDecorator as Tool, Widget, ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';

// 1. Inputs: Bank Name and Branch Name
const BankAuditSchema = z.object({
  bankName: z.string().default('State Bank of India').describe('Name of the Bank'),
  branchName: z.string().default('Connaught Place, New Delhi').describe('Branch Name/Location')
});

@Controller('track1')
export class Track1Service {

  // Generates realistic bank account records dynamically
  private generateBankData(bankName: string, branchName: string) {
    const accounts: Array<any> = [];
    const names = [
      'Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Sneha Iyer', 'Karan Singh',
      'Pooja Reddy', 'Vikram Desai', 'Ananya Roy', 'Rohan Mehta', 'Neha Gupta',
      'Siddharth Verma', 'Kavita Joshi', 'Arjun Nair', 'Riya Sen', 'Rajesh Khanna'
    ];
    const locations = [branchName, 'Mumbai, India', 'Bangalore, India', 'Delhi, India', 'Chennai, India'];
    const scamLocations = ['St. Petersburg, Russia', 'Lagos, Nigeria', 'Bucharest, Romania', 'Beijing, China', 'London, UK'];
    const networks = ['Tor Exit Node', 'Commercial VPN', 'Public Airport WiFi', 'Proxy Masked IP'];

    const totalCustomers = 85;

    for (let i = 1; i <= totalCustomers; i++) {
      const accNum = `ACC-904${100 + i}`;
      
      // First 3 accounts are guaranteed high-risk for predictable demoing, others are randomized (~12% risk rate)
      const isFraud = i <= 3 || Math.random() < 0.12; 

      const customerName = names[(i - 1) % names.length] + (i > 15 ? ` (${i})` : '');
      const avgSpend = Math.floor(Math.random() * 18000) + 7000;
      
      // High-risk accounts have a massive expenditure spike (6x-14x avg spend)
      const amount = isFraud 
        ? avgSpend * (Math.floor(Math.random() * 8) + 6) 
        : Math.floor(Math.random() * (avgSpend * 0.8)) + 200;

      const custLoc = locations[i % locations.length];
      const txLoc = isFraud ? scamLocations[i % scamLocations.length] : custLoc;
      const device = isFraud ? 'Unrecognized Linux Emulator' : 'Registered Mobile App';
      const network = isFraud ? networks[i % networks.length] : 'Secure Home Broadband';
      const merchant = isFraud ? 'Untraceable Crypto / Foreign Wire' : 'Retail Shopping';

      // Automated Risk Assessment
      let riskScore = 12;
      const reasons: string[] = [];

      if (custLoc !== txLoc) {
        riskScore += 45;
        reasons.push(`Geographic Anomaly: User home branch is located in ${custLoc}, but live charge originated in ${txLoc}.`);
      }
      if (amount > avgSpend * 4) {
        riskScore += 30;
        reasons.push(`Expenditure Spike: Current transaction of ₹${amount.toLocaleString()} is ${Math.round(amount / avgSpend)}x higher than 30-day average (₹${avgSpend.toLocaleString()}).`);
      }
      if (network !== 'Secure Home Broadband') {
        riskScore += 15;
        reasons.push(`Network Threat: Transaction routed through high-risk endpoint (${network}).`);
      }

      riskScore = Math.min(riskScore, 99);
      const isHighRisk = riskScore > 60;

      accounts.push({
        accountNumber: accNum,
        customerName,
        amount,
        avgSpend,
        merchant,
        customerLocation: custLoc,
        transactionLocation: txLoc,
        device,
        network,
        riskScore,
        verdict: isHighRisk ? 'CRITICAL RISK' : 'SECURE',
        reasoning: isHighRisk ? reasons.join(' ') : 'Normal spending pattern aligned with user historical profile.',
        scammerIp: isHighRisk ? `185.${Math.floor(Math.random() * 200 + 10)}.${Math.floor(Math.random() * 255)}.88` : 'N/A'
      });
    }

    return accounts;
  }

  @Tool({
    name: 'investigate_bank',
    description: 'Runs a full branch-wide security audit for a bank and flags high-risk accounts.',
    inputSchema: BankAuditSchema
  })
  @Widget('track1-widget')
  async investigateBank(input: z.infer<typeof BankAuditSchema>, ctx: ExecutionContext) {
    ctx.logger.info(`Running branch audit for: ${input.bankName} - ${input.branchName}`);

    const accounts = this.generateBankData(input.bankName, input.branchName);
    const riskAccounts = accounts.filter(a => a.verdict === 'CRITICAL RISK');

    return {
      bankName: input.bankName,
      branchName: input.branchName,
      totalCustomers: accounts.length,
      totalRiskCount: riskAccounts.length,
      accounts: accounts
    };
  }
}