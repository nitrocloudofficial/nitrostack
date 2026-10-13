/**
 * RESOURCE 2: legal://nominee-vs-heir
 * 
 * Plain-language explainer on the difference between a nominee and a legal heir.
 * Covers: nominee = custodian (not owner), Shakti Yezdani, Sarbati Devi, Class I heirs,
 * up to four nominations, and practical consequences.
 */

import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

export class NomineeVsHeirResource {
  @Resource({
    uri: 'legal://nominee-vs-heir',
    name: 'Nominee vs. Legal Heir',
    description:
      'Plain-language explainer on the difference between a nominee and a legal heir under Indian law. Covers the custodian principle, Supreme Court rulings, Class I heirs, multiple nominations, and practical consequences.',
    mimeType: 'text/plain',
  })
  async getNomineeVsHeir(uri: string, ctx: ExecutionContext) {
    const content = `NOMINEE VS. LEGAL HEIR — PLAIN-LANGUAGE EXPLAINER
================================================

1. WHAT IS A NOMINEE?
A nominee is a CUSTODIAN, not an owner. When you name a nominee on a bank account, insurance policy, or demat account, you are saying: "If I die, give the money to this person to hold on behalf of my legal heirs."

The nominee receives the money as a trustee. They do not own it. They must eventually distribute it to the legal heirs according to the law.

2. WHAT IS A LEGAL HEIR?
A legal heir is someone who is entitled to inherit your property under the law. In India, legal heirs are determined by:
- The Hindu Succession Act 1956 (for Hindus, Sikhs, Buddhists, Jains)
- The Indian Succession Act 1925 (for Christians, Parsis, and others)
- Islamic personal law (for Muslims)

Under the Hindu Succession Act 1956, Class I heirs (in order of priority) are:
1. Widow/widower
2. Son
3. Daughter
4. Mother
5. Son's widow
6. Son's son
7. Son's daughter
8. Daughter's son
9. Daughter's daughter

3. THE SUPREME COURT RULING: SHAKTI YEZDANI V JAYANAND JAYANT SALGAONKAR (2023 INSC 1076)
On 14 December 2023, the Supreme Court of India ruled:
"A nominee under the Companies Act 1956/2013 and the Depositories Act 1996 is a trustee/custodian, NOT the absolute owner. Nomination is not a third mode of succession."

This means:
- The nominee receives the money as a custodian.
- The nominee does NOT become the owner.
- The legal heirs can later claim their share from the nominee.
- The nominee must distribute the money according to the law.

4. THE LIC RULING: SARBATI DEVI V USHA DEVI (1984) 1 SCC 424
For life insurance policies, the Supreme Court ruled in 1984:
"A nominee is a custodian, not an owner. The nominee receives the money on behalf of the legal heirs."

This principle applies to all types of assets, not just insurance.

5. MULTIPLE NOMINATIONS
The Banking Laws (Amendment) Act 2025 permits up to FOUR nominations per bank customer. You can name:
- One nominee for all your accounts, or
- Different nominees for different accounts, or
- Multiple nominees for the same account (successive or simultaneous).

6. PRACTICAL CONSEQUENCE: WHAT HAPPENS AFTER THE NOMINEE RECEIVES THE MONEY?
Scenario: Ramesh Kumar dies. His wife Lakshmi is the nominee on his SBI savings account. The bank releases INR 240,000 to Lakshmi.

Under the law:
- Lakshmi receives the money as a custodian.
- Lakshmi is NOT the owner.
- Ramesh's two adult children are also legal heirs.
- The children can later claim their share from Lakshmi.
- Lakshmi must distribute the money according to the Hindu Succession Act 1956.

If Lakshmi refuses to distribute, the children can file a suit against her.

7. WHY DOES THIS MATTER?
- Receiving money as a nominee does NOT settle who is entitled to keep it.
- The nominee may face legal claims from other heirs later.
- The nominee should keep records of all assets received and distributions made.
- If there are multiple heirs, it is wise to seek legal advice on how to distribute the money fairly.

8. WHAT IF THERE IS A WILL?
If the deceased left a will, the will determines how the money is distributed. The nominee must follow the will, not the law of succession.

If there is no will, the law of succession applies.

9. WHAT IF THE NOMINEE IS A MINOR?
If the nominee is a minor, a legal guardian must claim the money on behalf of the minor. The guardian holds the money in trust for the minor until they reach adulthood.

10. WHAT IF THE NOMINEE IS PREDECEASED?
If the nominee dies before the deceased, the nomination is void. The money goes to the legal heirs, not to the nominee's heirs.

11. WHAT IF THERE IS NO NOMINEE?
If there is no nominee, the money goes directly to the legal heirs. The legal heirs must apply for a legal heir certificate or succession certificate to claim the money.

12. KEY TAKEAWAY
A nominee is a custodian, not an owner. Receiving money as a nominee does NOT settle who is entitled to keep it. The legal heirs may later claim their share from the nominee. If you are a nominee, keep records and seek legal advice on how to distribute the money fairly.

---
Sources:
- Shakti Yezdani v Jayanand Jayant Salgaonkar, Supreme Court, 14 December 2023 (2023 INSC 1076)
- Sarbati Devi v Usha Devi (1984) 1 SCC 424
- Hindu Succession Act 1956
- Indian Succession Act 1925
- Banking Laws (Amendment) Act 2025
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
