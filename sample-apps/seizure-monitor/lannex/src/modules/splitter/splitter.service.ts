import { Injectable } from '@nitrostack/core';
import { DebtsService } from '../debts/debts.service.js';
import { PrismaService } from '../database/prisma.service.js';

export interface BillItem {
  name: string;
  price: number;
  person: string;
  coveredBy?: string;
}

export interface PaymentLinkResult {
  name: string;
  amount: number;
  link: string;
}

export interface PersonShare {
  subtotal: number;
  taxShare: number;
  tipShare: number;
  total: number;
  paymentLink?: PaymentLinkResult;
}

export interface SplitResult {
  shares: Record<string, PersonShare>;
  totalSubtotal: number;
  totalTax: number;
  totalTip: number;
  totalBill: number;
}

@Injectable({ deps: [DebtsService, PrismaService] })
export class SplitterService {
  constructor(
    private readonly debtsService: DebtsService,
    private readonly prismaService?: PrismaService
  ) {}

  /**
   * Computes each person's proportional share including tax/tip.
   * Recognizes shared items (via 'shared', 'all', or comma-separated lists).
   * Generates payment links and creates debt entries in DebtsService for non-payers.
   */
  splitBill(items: BillItem[], tax: number = 0, tip: number = 0, payer: string = 'me'): SplitResult {
    const formatName = (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return trimmed;
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    };

    payer = formatName(payer);

    // 1. Identify all individual participants from the items
    const individualNames = new Set<string>();
    for (const item of items) {
      if (item.coveredBy) {
        individualNames.add(formatName(item.coveredBy));
      }
      const pStr = item.person.trim();
      const pLower = pStr.toLowerCase();
      if (pLower !== 'shared' && pLower !== 'all') {
        const parts = pStr.split(',').map(s => formatName(s)).filter(Boolean);
        for (const part of parts) {
          individualNames.add(part);
        }
      }
    }

    // Ensure there is at least the payer if no names were found
    if (individualNames.size === 0) {
      individualNames.add(payer);
    }

    const allParticipants = Array.from(individualNames);

    // Initialize shares structure
    const shares: Record<string, PersonShare> = {};
    for (const name of allParticipants) {
      shares[name] = {
        subtotal: 0,
        taxShare: 0,
        tipShare: 0,
        total: 0
      };
    }

    // 2. Distribute item prices
    let calculatedSubtotal = 0;
    for (const item of items) {
      const pStr = item.person.trim();
      const pLower = pStr.toLowerCase();
      let recipients: string[] = [];

      if (item.coveredBy) {
        recipients = [formatName(item.coveredBy)];
      } else if (pLower === 'shared' || pLower === 'all') {
        recipients = allParticipants;
      } else {
        recipients = pStr.split(',').map(s => formatName(s)).filter(Boolean);
        // Fallback in case trimming resulted in empty array
        if (recipients.length === 0) {
          recipients = [payer];
        }
      }

      const splitPrice = item.price / (recipients.length || 1); // Avoid division by zero
      for (const recipient of recipients) {
        // Ensure recipient exists in shares mapping
        if (!shares[recipient]) {
          shares[recipient] = {
            subtotal: 0,
            taxShare: 0,
            tipShare: 0,
            total: 0
          };
          if (!allParticipants.includes(recipient)) {
            allParticipants.push(recipient);
          }
        }
        shares[recipient].subtotal += splitPrice;
      }
      calculatedSubtotal += item.price;
    }

    // 3. Proportional tax and tip distribution
    const totalSubtotal = allParticipants.reduce((sum, name) => sum + shares[name].subtotal, 0);

    let sumSubtotals = 0;
    let sumTaxShares = 0;
    let sumTipShares = 0;

    for (const name of allParticipants) {
      const personShare = shares[name];
      const ratio = totalSubtotal > 0 ? (personShare.subtotal / totalSubtotal) : 0;

      personShare.subtotal = Math.round(personShare.subtotal * 100) / 100;
      personShare.taxShare = Math.round(ratio * tax * 100) / 100;
      personShare.tipShare = Math.round(ratio * tip * 100) / 100;
      personShare.total = Math.round((personShare.subtotal + personShare.taxShare + personShare.tipShare) * 100) / 100;

      sumSubtotals += personShare.subtotal;
      sumTaxShares += personShare.taxShare;
      sumTipShares += personShare.tipShare;
    }

    // Fix rounding discrepancies by adding remainders to the payer
    const subtotalDiff = Math.round((totalSubtotal - sumSubtotals) * 100) / 100;
    const taxDiff = Math.round((tax - sumTaxShares) * 100) / 100;
    const tipDiff = Math.round((tip - sumTipShares) * 100) / 100;

    const roundingRecipient = shares[payer] ? payer : allParticipants[0];
    if (roundingRecipient && shares[roundingRecipient]) {
      const rec = shares[roundingRecipient];
      rec.subtotal = Math.round((rec.subtotal + subtotalDiff) * 100) / 100;
      rec.taxShare = Math.round((rec.taxShare + taxDiff) * 100) / 100;
      rec.tipShare = Math.round((rec.tipShare + tipDiff) * 100) / 100;
      rec.total = Math.round((rec.subtotal + rec.taxShare + rec.tipShare) * 100) / 100;
    }

    // 4. Generate payment link and add debt entry for participants who are not the payer
    for (const name of allParticipants) {
      const personShare = shares[name];
      const isPayer = name.toLowerCase() === payer.toLowerCase() || 
                      (payer.toLowerCase() === 'me' && name.toLowerCase() === 'i');
      
      if (!isPayer && personShare.total > 0) {
        personShare.paymentLink = this.createPaymentLink(name, personShare.total);
        this.debtsService.addDebt(name, personShare.total, 'owe_me');
      }
    }

    const totalBill = Math.round((totalSubtotal + tax + tip) * 100) / 100;

    return {
      shares,
      totalSubtotal: Math.round(totalSubtotal * 100) / 100,
      totalTax: tax,
      totalTip: tip,
      totalBill
    };
  }

  /**
   * Generates WhatsApp and UPI links for a given person and amount.
   */
  createPaymentLink(person: string, amount: number, payeeVpa?: string): PaymentLinkResult {
    const vpa = payeeVpa || process.env.DEFAULT_UPI_ID || `${person.toLowerCase().replace(/\s+/g, '')}@upi`;
    const upiLink = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(person)}&am=${amount}&cu=INR`;
    const message = `Hey ${person}, you owe ₹${amount} for the bill split. Please pay using the UPI link: ${upiLink}`;
    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(message)}`;

    return {
      name: person,
      amount: amount,
      link: whatsappLink
    };
  }

  /**
   * Minimizes a complex graph of cross-person group debts using a greedy settlement algorithm.
   */
  minimizeSettlement(debts: Array<{ from: string; to: string; amount: number }>) {
    const formatName = (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return trimmed;
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    };

    // 1. Calculate net balances
    const balances: Record<string, number> = {};

    for (const debt of debts) {
      if (debt.amount <= 0) continue;
      const from = formatName(debt.from);
      const to = formatName(debt.to);

      if (from === to) continue;

      balances[from] = (balances[from] || 0) - debt.amount;
      balances[to] = (balances[to] || 0) + debt.amount;
    }

    // 2. Separate into debtors and creditors
    const debtors: Array<{ name: string; amount: number }> = [];
    const creditors: Array<{ name: string; amount: number }> = [];

    for (const [name, net] of Object.entries(balances)) {
      const rounded = Math.round(net * 100) / 100;
      if (rounded < -0.009) {
        debtors.push({ name, amount: -rounded });
      } else if (rounded > 0.009) {
        creditors.push({ name, amount: rounded });
      }
    }

    // Sort descending by amount
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    // 3. Greedy settlement execution
    const minimizedTransactions: Array<{
      from: string;
      to: string;
      amount: number;
      paymentLink: PaymentLinkResult;
    }> = [];

    let i = 0; // debtor index
    let j = 0; // creditor index

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      const settlementAmount = Math.round(Math.min(debtor.amount, creditor.amount) * 100) / 100;

      if (settlementAmount > 0) {
        const linkResult = this.createPaymentLink(creditor.name, settlementAmount);
        
        minimizedTransactions.push({
          from: debtor.name,
          to: creditor.name,
          amount: settlementAmount,
          paymentLink: linkResult
        });

        debtor.amount = Math.round((debtor.amount - settlementAmount) * 100) / 100;
        creditor.amount = Math.round((creditor.amount - settlementAmount) * 100) / 100;
      }

      if (debtor.amount <= 0.009) i++;
      if (creditor.amount <= 0.009) j++;
    }

    return {
      success: true,
      originalTransactionCount: debts.length,
      minimizedTransactionCount: minimizedTransactions.length,
      transactionsSaved: debts.length - minimizedTransactions.length,
      netBalances: balances,
      settlements: minimizedTransactions
    };
  }

  /**
   * Intelligently parses raw text or receipt OCR content into line items, tax, tip, and totals.
   */
  /**
   * Intelligently parses raw text or receipt OCR content into line items, tax, tip, and totals.
   * Features heuristic regex pattern matching, quantity extraction, and mathematical reconciliation.
   */
  parseReceiptText(rawText: string) {
    if (!rawText || !rawText.trim()) {
      return {
        success: false,
        confidence: 'none',
        error: 'EMPTY_TEXT',
        message: 'Provided text is empty or blank.',
        merchant: 'Unknown Merchant',
        extractedCount: 0,
        items: [],
        tax: 0,
        tip: 0,
        total: 0,
        calculatedSubtotal: 0,
        timestamp: new Date().toISOString()
      };
    }

    const lines = rawText
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    let merchant = 'Unknown Merchant';
    let tax = 0;
    let tip = 0;
    let total = 0;
    let subtotalExplicit = 0;
    const items: Array<{ name: string; price: number; person: string }> = [];

    // 1. Merchant Detection (Check top 4 non-metadata lines)
    for (let idx = 0; idx < Math.min(4, lines.length); idx++) {
      const line = lines[idx];
      if (!/total|subtotal|tax|tip|date|time|cash|card|visa|mastercard|thank|receipt|invoice|order|#|\d{2}\/\d{2}/i.test(line) && line.length >= 2) {
        const cleaned = line.replace(/[^a-zA-Z0-9\s&'-]/g, '').trim();
        if (cleaned.length > 2) {
          merchant = cleaned;
          break;
        }
      }
    }

    // 2. Specialized Regex Patterns
    const currencyPattern = '(?:[₹$€£]|INR|USD|EUR|GBP)?\\s*';
    const numPattern = '(\\d+(?:\\.\\d{1,2})?)';

    const subtotalRegex = new RegExp(`^(?:subtotal|sub-total|sub total)[:\\s]*${currencyPattern}${numPattern}`, 'i');
    const taxRegex = new RegExp(`^(?:tax|vat|gst|cgst|sgst|sales tax)[:\\s]*${currencyPattern}${numPattern}`, 'i');
    const tipRegex = new RegExp(`^(?:tip|gratuity|service charge)[:\\s]*${currencyPattern}${numPattern}`, 'i');
    const totalRegex = new RegExp(`^(?:total|grand total|amount due|net total|balance due)[:\\s]*${currencyPattern}${numPattern}`, 'i');

    // Item line matchers:
    // Pattern A: "2 x Burger 15.50" or "Burger 15.50" or "Burger $15.50"
    const itemTrailingPriceRegex = new RegExp(`^(?:(\\d+)\\s*x\\s+)?(.+?)\\s+${currencyPattern}${numPattern}$`, 'i');
    // Pattern B: "15.50 Burger" or "$15.50 2x Burger"
    const itemLeadingPriceRegex = new RegExp(`^${currencyPattern}${numPattern}\\s+(?:(\\d+)\\s*x\\s+)?(.+)$`, 'i');

    for (const line of lines) {
      // Subtotal check
      if (subtotalRegex.test(line)) {
        const match = line.match(subtotalRegex);
        if (match) subtotalExplicit = parseFloat(match[1]);
        continue;
      }

      // Tax check
      if (taxRegex.test(line)) {
        const match = line.match(taxRegex);
        if (match) tax = parseFloat(match[1]);
        continue;
      }

      // Tip check
      if (tipRegex.test(line)) {
        const match = line.match(tipRegex);
        if (match) tip = parseFloat(match[1]);
        continue;
      }

      // Total check
      if (totalRegex.test(line)) {
        const match = line.match(totalRegex);
        if (match) total = parseFloat(match[1]);
        continue;
      }

      // Metadata & address line skip check
      if (/subtotal|sub-total|grand total|amount due|balance due|cash|change|visa|mastercard|amex|card|thank|date|receipt|invoice|time|order|#|\bme\b|\bstreet\b|\bst\b|\bavenue\b|\bave\b|\broad\b|\brd\b|\bblvd\b|\bsuite\b|\bste\b|\bfloor\b|\bfl\b|\bzip\b|\bphone\b|\btel\b|\bfax\b|gstin|fssai|table|server|guest|cashier/i.test(line)) {
        continue;
      }

      // Try matching Trailing Price first ("2x Biryani 350.00")
      const trailingMatch = line.match(itemTrailingPriceRegex);
      if (trailingMatch) {
        const qty = trailingMatch[1] ? parseInt(trailingMatch[1], 10) : 1;
        const rawName = trailingMatch[2].replace(/^[0-9xX*\s.]+/, '').trim();
        const price = parseFloat(trailingMatch[3]);

        if (rawName.length > 1 && !isNaN(price) && price > 0) {
          const finalPrice = Math.round(price * 100) / 100;
          items.push({
            name: rawName,
            price: finalPrice,
            person: 'shared'
          });
          continue;
        }
      }

      // Try matching Leading Price ("350.00 2x Biryani")
      const leadingMatch = line.match(itemLeadingPriceRegex);
      if (leadingMatch) {
        const price = parseFloat(leadingMatch[1]);
        const rawName = leadingMatch[3].trim();

        if (rawName.length > 1 && !isNaN(price) && price > 0) {
          const finalPrice = Math.round(price * 100) / 100;
          items.push({
            name: rawName,
            price: finalPrice,
            person: 'shared'
          });
        }
      }
    }

    // 3. Mathematical Reconciliation
    const calculatedSubtotal = Math.round(items.reduce((sum, item) => sum + item.price, 0) * 100) / 100;
    
    // If total not found, infer from subtotal + tax + tip
    if (!total) {
      const baseSub = subtotalExplicit > 0 ? subtotalExplicit : calculatedSubtotal;
      total = Math.round((baseSub + tax + tip) * 100) / 100;
    }

    const confidence = items.length > 0
      ? (merchant !== 'Unknown Merchant' && total > 0 ? 'high' : 'medium')
      : 'low';

    return {
      success: items.length > 0,
      confidence,
      merchant,
      extractedCount: items.length,
      items,
      tax: Math.round(tax * 100) / 100,
      tip: Math.round(tip * 100) / 100,
      total: Math.round(total * 100) / 100,
      calculatedSubtotal,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Extracts line items from base64 image data or raw receipt content.
   * Multi-tiered approach: Gemini 2.0 Flash Vision -> OpenAI Vision -> Base64 Text / Heuristic Parser.
   */
  async extractReceiptItems(fileContent: string, fileType: string, fileName: string) {
    const cleanBase64 = (fileContent || '').replace(/^data:[^;]+;base64,/, '').trim();

    // 1. If GEMINI_API_KEY is configured, use Gemini 2.0 Flash Vision API
    if (process.env.GEMINI_API_KEY) {
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        const mime = fileType || 'image/jpeg';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: "Extract all line items, tax, tip, subtotal, total, and merchant name from this receipt. Return ONLY valid JSON matching schema: {\"merchant\": string, \"items\": [{\"name\": string, \"price\": number, \"person\": \"shared\"}], \"tax\": number, \"tip\": number, \"total\": number}" },
                { inline_data: { mime_type: mime, data: cleanBase64 } }
              ]
            }],
            generationConfig: { response_mime_type: "application/json" }
          })
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const resData = (await response.json()) as any;
          const textResponse = resData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textResponse) {
            const parsed = JSON.parse(textResponse);
            const items = (parsed.items || []).map((it: any) => ({
              name: String(it.name || 'Item'),
              price: Math.round((Number(it.price) || 0) * 100) / 100,
              person: it.person || 'shared'
            }));
            const calculatedSubtotal = Math.round(items.reduce((s: number, i: any) => s + i.price, 0) * 100) / 100;
            const tax = Math.round((Number(parsed.tax) || 0) * 100) / 100;
            const tip = Math.round((Number(parsed.tip) || 0) * 100) / 100;
            const total = Math.round((Number(parsed.total) || (calculatedSubtotal + tax + tip)) * 100) / 100;

            return {
              success: true,
              confidence: 'high',
              tier: 'gemini-vision',
              merchant: parsed.merchant || 'Extracted Merchant',
              extractedCount: items.length,
              items,
              tax,
              tip,
              total,
              calculatedSubtotal,
              timestamp: new Date().toISOString()
            };
          }
        }
      } catch {
        // Fall back to next extraction tier on failure or timeout
      }
    }

    // 2. If OPENAI_API_KEY is configured, use OpenAI Vision API
    if (process.env.OPENAI_API_KEY) {
      try {
        const apiKey = process.env.OPENAI_API_KEY;
        const mime = fileType || 'image/jpeg';
        const url = 'https://api.openai.com/v1/chat/completions';

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{
              role: 'user',
              content: [
                { type: 'text', text: "Extract all line items, tax, tip, and merchant from this receipt image. Return ONLY JSON with keys: merchant, items (array of {name, price}), tax, tip, total." },
                { type: 'image_url', image_url: { url: `data:${mime};base64,${cleanBase64}` } }
              ]
            }],
            response_format: { type: 'json_object' }
          })
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const resData = (await response.json()) as any;
          const textResponse = resData.choices?.[0]?.message?.content;
          if (textResponse) {
            const parsed = JSON.parse(textResponse);
            const items = (parsed.items || []).map((it: any) => ({
              name: String(it.name || 'Item'),
              price: Math.round((Number(it.price) || 0) * 100) / 100,
              person: it.person || 'shared'
            }));
            const calculatedSubtotal = Math.round(items.reduce((s: number, i: any) => s + i.price, 0) * 100) / 100;
            const tax = Math.round((Number(parsed.tax) || 0) * 100) / 100;
            const tip = Math.round((Number(parsed.tip) || 0) * 100) / 100;
            const total = Math.round((Number(parsed.total) || (calculatedSubtotal + tax + tip)) * 100) / 100;

            return {
              success: true,
              confidence: 'high',
              tier: 'openai-vision',
              merchant: parsed.merchant || 'Extracted Merchant',
              extractedCount: items.length,
              items,
              tax,
              tip,
              total,
              calculatedSubtotal,
              timestamp: new Date().toISOString()
            };
          }
        }
      } catch {
        // Fall back to next extraction tier on failure or timeout
      }
    }

    // 3. Text decoding fallback (if base64 is encoded raw text or text input was passed)
    let decodedText = fileContent;
    try {
      if (/^[A-Za-z0-9+/=]+$/.test(cleanBase64.replace(/\s/g, ''))) {
        const decoded = Buffer.from(cleanBase64, 'base64').toString('utf-8');
        if (/[\w\s]{4,}/.test(decoded)) {
          decodedText = decoded;
        }
      }
    } catch {
      // Ignore buffer decode errors
    }

    const parsed = this.parseReceiptText(decodedText);
    if (parsed.items && parsed.items.length > 0) {
      return {
        ...parsed,
        tier: 'heuristic-text-parser'
      };
    }

    // 4. Return explicit failure when binary image cannot be parsed offline
    return {
      success: false,
      confidence: 'none',
      tier: 'failed',
      error: 'UNPARSEABLE_RECEIPT_IMAGE',
      message: 'Could not extract receipt items from binary image without a Vision API key (GEMINI_API_KEY or OPENAI_API_KEY). Please provide an API key or submit raw text receipt contents.',
      merchant: fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Receipt',
      extractedCount: 0,
      items: [],
      tax: 0,
      tip: 0,
      total: 0,
      calculatedSubtotal: 0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Assigns line items to individuals based on freeform prompt (e.g. "Rahul had the biryani, Sarah had the pizza, we shared the coke")
   */
  async assignItemsToPeople(items: BillItem[], assignmentPrompt: string): Promise<BillItem[]> {
    if (!assignmentPrompt || !assignmentPrompt.trim()) {
      return items.map(item => ({ ...item, person: item.person || 'shared' }));
    }

    // 1. Try LLM API assignment if API Key is available
    if (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY) {
      try {
        const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
        const isGemini = !!process.env.GEMINI_API_KEY;
        const prompt = `Items: ${JSON.stringify(items)}\nAssignment instruction: "${assignmentPrompt}"\nAssign each item to person name(s) (comma-separated if multiple, "shared" if shared by everyone). Return ONLY JSON array of items with fields: name, price, person, coveredBy.`;

        const url = isGemini 
          ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
          : 'https://api.openai.com/v1/chat/completions';

        const body = isGemini ? {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" }
        } : {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        };

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (!isGemini) headers['Authorization'] = `Bearer ${apiKey}`;

        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
        if (res.ok) {
          const jsonRes = (await res.json()) as any;
          const textRes = isGemini ? jsonRes.candidates?.[0]?.content?.parts?.[0]?.text : jsonRes.choices?.[0]?.message?.content;
          if (textRes) {
            const parsed = JSON.parse(textRes);
            const list = Array.isArray(parsed) ? parsed : (parsed.items || parsed.assignedItems);
            if (Array.isArray(list) && list.length === items.length) {
              return list.map((it: any, idx: number) => ({
                name: items[idx].name,
                price: items[idx].price,
                person: it.person || 'shared',
                coveredBy: it.coveredBy
              }));
            }
          }
        }
      } catch {
        // Fallback to rule-based parser
      }
    }

    // 2. Rule-based prompt parser fallback
    const clauses = assignmentPrompt
      .split(/(?:\.|\b\n\b|\band\b|;|,)/i)
      .map(c => c.trim())
      .filter(Boolean);

    const assigned: BillItem[] = items.map(item => {
      let assignedPerson = 'shared';
      let coveredBy: string | undefined = undefined;

      const itemNameLower = item.name.toLowerCase();
      const itemWords = itemNameLower.split(/\s+/).filter(w => w.length > 2);

      for (const clause of clauses) {
        const cLower = clause.toLowerCase();

        const matchesItem = cLower.includes(itemNameLower) || itemWords.some(w => cLower.includes(w));
        
        if (matchesItem) {
          if (/\b(we|all|everyone|shared|together)\b/i.test(cLower)) {
            assignedPerson = 'shared';
            break;
          }

          const coverMatch = clause.match(/([A-Z][a-z]+|\bme\b|\bi\b)\s+(?:paid for|covered|bought for)\s+([A-Z][a-z]+)/i);
          if (coverMatch) {
            coveredBy = coverMatch[1];
            assignedPerson = coverMatch[2];
            break;
          }

          const words = clause.split(/\s+/);
          const candidateNames: string[] = [];

          for (const w of words) {
            const clean = w.replace(/[^a-zA-Z]/g, '');
            if (!clean) continue;
            const cleanLower = clean.toLowerCase();

            if (/^(had|ate|ordered|got|took|the|a|an|of|for|with|shared|we|all|item|items|price|paid|bought|covered|pizza|burger|coke|biryani|fries|rice|curry)$/i.test(cleanLower)) {
              continue;
            }
            if (cleanLower === itemNameLower || itemWords.includes(cleanLower)) {
              continue;
            }
            candidateNames.push(clean);
          }

          if (candidateNames.length > 0) {
            assignedPerson = candidateNames.join(', ');
            break;
          }
        }
      }

      return {
        name: item.name,
        price: item.price,
        person: assignedPerson,
        ...(coveredBy ? { coveredBy } : {})
      };
    });

    return assigned;
  }

  /**
   * Extracts receipt line items, assigns them via assignment prompt, and splits the bill.
   * Automatically creates debts in DebtsService for non-payers.
   */
  async extractAndSplitReceipt(
    fileContent: string,
    fileType: string,
    fileName: string,
    assignmentPrompt: string,
    tax: number = 0,
    tip: number = 0,
    payer: string = 'me'
  ) {
    const extraction = await this.extractReceiptItems(fileContent, fileType, fileName);
    const items = extraction.items || [];

    const finalTax = tax || extraction.tax || 0;
    const finalTip = tip || extraction.tip || 0;

    const assignedItems = await this.assignItemsToPeople(items, assignmentPrompt);
    const splitResult = this.splitBill(assignedItems, finalTax, finalTip, payer);

    // Save receipt to database
    if (this.prismaService?.client) {
      try {
        const merchant = extraction.merchant || fileName;
        const subtotal = extraction.calculatedSubtotal || 0;
        const total = extraction.total || 0;

        const receipt = await this.prismaService.client.receipt.create({
          data: {
            merchant,
            subtotal,
            tax: finalTax,
            tip: finalTip,
            total,
            payerName: payer,
            confidence: extraction.confidence || 'medium',
            items: {
              create: assignedItems.map(item => ({
                name: item.name,
                price: item.price,
                person: item.person,
                coveredBy: item.coveredBy
              }))
            }
          }
        });
      } catch (err) {
        console.error('Failed to save receipt to database:', err);
      }
    }

    return {
      success: true,
      merchant: extraction.merchant || fileName,
      extractedItems: items,
      assignedItems,
      splitResult
    };
  }
}


