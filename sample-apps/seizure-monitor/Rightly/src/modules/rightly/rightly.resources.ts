import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

/**
 * RightlyResources
 * 
 * Exposes markdown reference documents as MCP Resources.
 * These are used by Gemini and the Resolution Agent for context.
 */
export class RightlyResources {
  @Resource({
    uri: 'rightly://consumer-rights',
    name: 'Consumer Rights',
    description: 'Consumer rights and protections guide',
    mimeType: 'text/markdown'
  })
  async getConsumerRights(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching consumer rights resource');
    const content = `# Consumer Rights & Protections

## Overview
Consumers have fundamental rights when purchasing goods and services. These rights are protected by law in most jurisdictions.

## Key Consumer Rights

### 1. Right to Safety
- Products must be safe for use
- Sellers must provide safety warnings
- Defective products must be recalled

### 2. Right to Information
- Clear product descriptions
- Accurate pricing
- Honest advertising
- Ingredient/material disclosure

### 3. Right to Choose
- Freedom to select products/services
- No forced purchases
- Right to refuse unwanted services

### 4. Right to Be Heard
- File complaints
- Seek remedies
- Access dispute resolution

### 5. Right to Redress
- Refunds for defective products
- Replacement of faulty items
- Compensation for damages
- Repair services

## Common Protections

### Warranty Rights
- Implied warranty of merchantability
- Fitness for purpose warranty
- Manufacturer warranties
- Extended warranties (if purchased)

### Return Policies
- Cooling-off period (typically 14-30 days)
- Full refund for defective items
- Return shipping may be covered

### Dispute Resolution
- Small claims court
- Mediation services
- Arbitration
- Consumer protection agencies

## How to Assert Your Rights
1. Document the issue (photos, receipts, communications)
2. Contact the seller/manufacturer
3. Send a formal complaint letter
4. File with consumer protection agency
5. Seek legal counsel if necessary

## Resources
- Consumer Protection Agency
- Better Business Bureau
- Small Claims Court
- Legal Aid Services`;

    return {
      contents: [{
        uri,
        mimeType: 'text/markdown',
        text: content
      }]
    };
  }

  @Resource({
    uri: 'rightly://repair-principles',
    name: 'Repair Principles',
    description: 'Product repair assessment and principles',
    mimeType: 'text/markdown'
  })
  async getRepairPrinciples(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching repair principles resource');
    const content = `# Product Repair Assessment & Principles

## Damage Classification

### Minor Damage
- Cosmetic scratches or dents
- Non-functional aesthetic issues
- Does not affect product use
- Repair cost < 20% of product value

### Moderate Damage
- Partial functionality loss
- Affects some features
- Repair cost 20-60% of product value
- May require professional repair

### Severe Damage
- Complete functionality loss
- Safety hazards
- Repair cost > 60% of product value
- Replacement often recommended

## Repair vs. Replacement Decision

### Repair is Recommended When:
- Damage is localized
- Core functionality intact
- Repair cost < 50% of replacement
- Spare parts available
- Warranty covers repair

### Replacement is Recommended When:
- Damage is extensive
- Multiple systems affected
- Repair cost > 60% of replacement
- Safety concerns exist
- Product is near end of life

## Warranty Coverage

### Manufacturer Warranty
- Covers defects in materials/workmanship
- Typically 1-2 years
- Does not cover accidental damage
- May require proof of purchase

### Extended Warranty
- Optional coverage beyond manufacturer
- Covers accidental damage (sometimes)
- Varies by provider
- Review terms carefully

### Accidental Damage Protection
- Separate insurance product
- Covers drops, spills, impacts
- Usually has deductible
- Check coverage limits

## Repair Process

1. **Assessment** - Professional inspection
2. **Diagnosis** - Identify root cause
3. **Quote** - Provide repair estimate
4. **Authorization** - Customer approval
5. **Repair** - Fix the issue
6. **Testing** - Verify functionality
7. **Warranty** - Repair guarantee

## Finding Authorized Repair Centers
- Check manufacturer website
- Look for certified technicians
- Verify warranty coverage
- Compare repair quotes
- Check customer reviews`;

    return {
      contents: [{
        uri,
        mimeType: 'text/markdown',
        text: content
      }]
    };
  }

  @Resource({
    uri: 'rightly://dark-patterns',
    name: 'Dark Patterns',
    description: 'Guide to identifying dark patterns and deceptive practices',
    mimeType: 'text/markdown'
  })
  async getDarkPatterns(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching dark patterns resource');
    const content = `# Dark Patterns & Deceptive Practices

## What Are Dark Patterns?
Dark patterns are deceptive design techniques that trick users into making unintended choices. They are unethical and often illegal.

## Common Dark Patterns

### 1. Roach Motel
- Easy to enter, hard to exit
- Difficult cancellation process
- Hidden unsubscribe buttons
- Requires phone calls to cancel

### 2. Misdirection
- Attention drawn to desired action
- Important information hidden
- Misleading visual hierarchy
- Confusing button placement

### 3. Disguised Ads
- Ads designed to look like content
- Fake close buttons
- Misleading "recommended" sections
- Native advertising without disclosure

### 4. Forced Continuity
- Free trial converts to paid without clear notice
- Difficult to find billing information
- Automatic renewal without reminder
- Hidden cancellation process

### 5. Friend Spam
- Requests to access contacts
- Sends messages without permission
- Shares data without consent
- Misleads about privacy

### 6. Hidden Costs
- Surprise charges at checkout
- Mandatory add-ons
- Fees not disclosed upfront
- Currency conversion surprises

### 7. Trick Questions
- Confusing yes/no questions
- Double negatives
- Pre-checked boxes
- Misleading language

### 8. Urgency
- Fake scarcity ("Only 2 left!")
- Countdown timers
- Pressure to decide quickly
- False deadlines

### 9. Confirmshaming
- Negative button for declining
- Guilt-inducing language
- Unequal button sizes
- Shaming copy

### 10. Privacy Zuckering
- Confusing privacy settings
- Difficult to find privacy controls
- Defaults to sharing
- Misleading privacy language

## How to Protect Yourself

### Before Purchasing
- Read terms and conditions
- Check cancellation policy
- Look for hidden fees
- Verify company legitimacy
- Check reviews and complaints

### During Purchase
- Review all charges
- Uncheck pre-checked boxes
- Verify billing information
- Save confirmation emails
- Screenshot important details

### After Purchase
- Monitor billing statements
- Keep records of transactions
- Document communications
- Report suspicious activity
- Cancel unwanted services

## Reporting Dark Patterns
- Consumer Protection Agency
- Federal Trade Commission (FTC)
- Better Business Bureau
- State Attorney General
- Online review platforms

## Your Rights
- Right to clear pricing
- Right to easy cancellation
- Right to privacy
- Right to accurate information
- Right to fair treatment`;

    return {
      contents: [{
        uri,
        mimeType: 'text/markdown',
        text: content
      }]
    };
  }

  @Resource({
    uri: 'rightly://legal-notice-template',
    name: 'Legal Notice Template',
    description: 'Template for formal legal notices',
    mimeType: 'text/markdown'
  })
  async getLegalNoticeTemplate(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching legal notice template resource');
    const content = `# Legal Notice Template

## Formal Demand Letter

---

**[YOUR NAME]**
[Your Address]
[City, State ZIP]
[Your Email]
[Your Phone]

**Date:** [Current Date]

**TO:** [Seller/Company Name]
[Company Address]
[City, State ZIP]

**RE: FORMAL DEMAND FOR [REFUND/REPLACEMENT/REPAIR]**
**Order Number:** [Order #]
**Purchase Date:** [Date]
**Amount:** $[Amount]

---

## Dear [Company Name]:

I am writing to formally demand [refund/replacement/repair] for the defective product purchased from your company on [date].

### PRODUCT DETAILS
- **Product:** [Product Name]
- **Model/SKU:** [Model Number]
- **Purchase Price:** $[Amount]
- **Order Number:** [Order #]
- **Purchase Date:** [Date]

### ISSUE DESCRIPTION
[Detailed description of the defect or damage]

### EVIDENCE
I have documented this issue with:
- Photographs (attached)
- Video evidence (attached)
- Receipt/proof of purchase (attached)
- Correspondence history (attached)

### LEGAL BASIS
This product fails to meet the implied warranty of merchantability and fitness for purpose under [applicable law]. The defect renders the product unsuitable for its intended use.

### REQUESTED REMEDY
I am requesting [full refund / replacement / repair] within [14/30] days of receipt of this letter.

### CONSEQUENCES
If you do not respond to this demand within the specified timeframe, I will pursue all available legal remedies, including:
- Small claims court action
- Complaint to consumer protection agencies
- Negative public reviews
- Chargeback with credit card company

### DOCUMENTATION
Please confirm receipt of this letter and your response within 5 business days.

---

**Sincerely,**

[Your Signature]
[Your Typed Name]

---

## Enclosures
- Copy of receipt
- Photographs of defect
- Video evidence
- Previous correspondence

---

## Important Notes
- Send via certified mail with return receipt
- Keep copies of everything
- Follow up if no response within timeframe
- Consult attorney if escalation needed`;

    return {
      contents: [{
        uri,
        mimeType: 'text/markdown',
        text: content
      }]
    };
  }
}
