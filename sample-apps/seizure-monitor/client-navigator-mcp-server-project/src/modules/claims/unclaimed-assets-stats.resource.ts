/**
 * RESOURCE 3: stats://unclaimed-assets
 * 
 * Real figures on unclaimed assets in India, each with source and date.
 * Includes RBI DEA Fund, unclaimed deposits, UDGAM portal, and RBI Scheme dates.
 */

import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

export class UnclaimedAssetsStatsResource {
  @Resource({
    uri: 'stats://unclaimed-assets',
    name: 'Unclaimed Assets Statistics',
    description:
      'Real figures on unclaimed assets in India: RBI DEA Fund, unclaimed deposits, UDGAM portal coverage, and RBI Scheme dates. Each figure includes source and date. Note: DEA Fund totals and total unclaimed deposits are different measures taken at different dates and must not be conflated.',
    mimeType: 'text/plain',
  })
  async getUnclaimedAssetsStats(uri: string, ctx: ExecutionContext) {
    const content = `UNCLAIMED ASSETS IN INDIA — STATISTICS
======================================

1. RBI DEPOSITOR EDUCATION AND AWARENESS (DEA) FUND
   Amount: INR 72,454 crore
   As of: 28 January 2026
   Source: Government reply in Rajya Sabha
   Confidence: Regulatory
   
   What is the DEA Fund?
   The DEA Fund is a fund maintained by the RBI to hold unclaimed deposits from banks.
   When a bank account is inactive for 10 years, the bank transfers the balance to the DEA Fund.
   Depositors can claim their money from the DEA Fund at any time.

2. TOTAL UNCLAIMED DEPOSITS AT BANKS
   Amount: INR 78,213 crore
   As of: 31 March 2024
   Source: RBI Annual Report
   Growth: Up 26% year-on-year from INR 62,225 crore at 31 March 2023
   Confidence: Regulatory
   
   Note: This figure includes deposits that are still with banks (not yet transferred to DEA Fund)
   and deposits already in the DEA Fund. It is a DIFFERENT measure from the DEA Fund total above.
   Do NOT add these two figures together.

3. UDGAM PORTAL COVERAGE
   Number of banks: 30 banks participate in the RBI UDGAM portal
   Coverage: Roughly 90% of DEA Fund value
   What is UDGAM?
   UDGAM (Unclaimed Deposits and Accounts Management System) is an RBI portal where depositors
   can search for unclaimed deposits in participating banks.
   Portal: https://www.rbi.org.in/Scripts/UDGAM.aspx

4. RBI SCHEME FOR ACCELERATED PAYOUT
   Name: Scheme for Facilitating Accelerated Payout of Inoperative Accounts and Unclaimed Deposits
   Effective period: 1 October 2025 to 30 September 2026
   Purpose: Allows banks to settle unclaimed deposits faster and with less documentation.
   Confidence: Regulatory

5. LIFE INSURANCE UNCLAIMED AMOUNTS
   Estimated amount: INR 1,000+ crore (estimate)
   Source: IRDAI and LIC data
   Confidence: Estimate
   
   What is unclaimed insurance?
   When a life insurance policy matures or the policyholder dies, the insurer must pay the claim.
   If the insurer cannot locate the beneficiary, the amount becomes unclaimed.
   Beneficiaries can claim at any time.

6. UNCLAIMED SHARES AND DIVIDENDS (IEPF)
   Amount: INR 20,000+ crore (estimate)
   Source: Ministry of Corporate Affairs
   Confidence: Estimate
   
   What is IEPF?
   The Investor Education and Protection Fund (IEPF) holds unclaimed dividends, shares, and debentures.
   When dividends are unclaimed for 7 years, they are transferred to IEPF.
   Shareholders can claim at any time.
   Portal: https://www.iepf.gov.in

7. UNCLAIMED PROVIDENT FUND (EPFO)
   Estimated amount: INR 50,000+ crore (estimate)
   Source: EPFO data
   Confidence: Estimate
   
   What is unclaimed EPF?
   When an employee leaves a job, their EPF balance remains with EPFO.
   If the employee does not claim it, it becomes unclaimed.
   Employees can claim at any time.

8. KEY TAKEAWAY
   Millions of Indians have unclaimed assets. If you believe a deceased family member left behind
   unclaimed deposits, insurance, shares, or provident fund, you can search for them using:
   - UDGAM portal (deposits): https://www.rbi.org.in/Scripts/UDGAM.aspx
   - IEPF portal (shares, dividends): https://www.iepf.gov.in
   - EPFO portal (provident fund): https://www.epfindia.gov.in
   - LIC portal (insurance): https://www.licindia.in
   - Your bank's website (deposits)

9. IMPORTANT NOTE
   This server does NOT query UDGAM, EPFO, IEPF, CDSL, or any government system.
   It does NOT discover assets. The family states what exists; the server states what to do.
   To search for unclaimed assets, use the portals listed above directly.

---
Sources:
- RBI Depositor Education and Awareness Fund: Government reply in Rajya Sabha, 28 January 2026
- RBI Annual Report 2023–24
- RBI UDGAM portal: https://www.rbi.org.in/Scripts/UDGAM.aspx
- IEPF: https://www.iepf.gov.in
- EPFO: https://www.epfindia.gov.in
- Ministry of Corporate Affairs
`;

    return {
      contents: [
        {
          uri,
          mimeType: 'text/plain',
          text: content,
        },
      ],
    };
  }
}
