import { ToolDecorator as Tool, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { calculateInvoiceTotals } from '../lib/erp-engine.js';
import { erpStore } from '../lib/erp-store.js';
import { generateTallyInvoiceHTML } from '../lib/invoice-html-template.js';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

export const SellerSchema = z.object({
  name: z.string().optional().describe('Seller / Your Business Name (e.g. ALPHATEX ENTERPRISES)'),
  gstin: z.string().optional().describe('Seller GSTIN Number'),
  pan: z.string().optional().describe('Seller PAN Number'),
  address: z.string().optional().describe('Seller Address'),
  phone: z.string().optional().describe('Seller Phone Number'),
  email: z.string().optional().describe('Seller Email Address'),
});

export const PartySchema = z.object({
  name: z.string().optional().describe('Party/Customer Business Name'),
  gstin: z.string().optional().describe('Party GSTIN Number'),
  address: z.string().optional().describe('Party Address'),
  state: z.string().optional().describe('State Name'),
  stateCode: z.string().optional().describe('State Code (e.g. 33 for Tamil Nadu)'),
  phone: z.string().optional().describe('Phone Number'),
});

export const InvoiceItemSchema = z.object({
  description: z.string().optional().describe('Item Description or Product Name'),
  hsn: z.string().optional().describe('HSN or SAC code'),
  qty: z.number().optional().describe('Quantity'),
  rate: z.number().optional().describe('Unit Rate / Price per unit'),
  unit: z.string().optional().default('Kgs').describe('Unit of measurement (Kgs, Meters, Pcs, Bales)'),
  discountPct: z.number().min(0).max(100).optional().default(0).describe('Discount percentage for this line item'),
  taxRatePct: z.number().min(0).max(100).optional().default(5).describe('GST Tax Rate percentage (5, 12, 18, 28)'),
});

export const GenerateInvoiceSchema = z.object({
  invoiceNo: z.string().optional().describe('Invoice Number (e.g. AT/2026/001)'),
  invoiceDate: z.string().optional().describe('Invoice Date (YYYY-MM-DD)'),
  dueDate: z.string().optional().describe('Payment Due Date (YYYY-MM-DD)'),
  seller: SellerSchema.optional().describe('Your Company / Seller Information'),
  partyName: z.string().optional().describe('Customer Name'),
  party: PartySchema.optional().describe('Customer / Buyer Billing Information'),
  items: z.array(InvoiceItemSchema).optional().describe('List of Invoice Line Items'),
  isInterstate: z.boolean().optional().default(false).describe('True if Interstate (IGST), False for Intrastate (CGST + SGST)'),
  invoiceDiscountPct: z.number().min(0).max(100).optional().default(0).describe('Overall Invoice Discount %'),
  freightCharges: z.number().nonnegative().optional().default(0).describe('Freight & Transport Charges'),
  packingCharges: z.number().nonnegative().optional().default(0).describe('Packing Charges'),
  paymentTerms: z.string().optional().default('Credit - 15 Days').describe('Payment Mode / Terms'),
  notes: z.string().optional().describe('Invoice Terms & Notes'),
  autoOpen: z.boolean().optional().default(true).describe('Automatically open the generated HTML bill in browser'),
});

@Injectable()
export class InvoiceTools {
  @Tool({
    name: 'generate_alphatex_invoice',
    description: 'Generates a GST compliant Tax Invoice, formats text summary, and automatically creates & opens the printable Tally GST bill in browser.',
    inputSchema: GenerateInvoiceSchema,
  })
  async generateInvoice(args: z.infer<typeof GenerateInvoiceSchema>, ctx: ExecutionContext) {
    // 1. Resolve Seller
    const sellerInfo = {
      name: args.seller?.name || 'ALPHATEX ENTERPRISES',
      gstin: args.seller?.gstin || '33AAAAA0000A1Z5',
      pan: args.seller?.pan || 'AAAAA0000A',
      address: args.seller?.address || '123 Textile Park, Tirupur, Tamil Nadu - 641601',
      phone: args.seller?.phone || '+91 98765 43210',
      email: args.seller?.email || 'billing@alphatex.com',
    };

    // 2. Resolve Party
    let partyObj = args.party;
    if (!partyObj && args.partyName) {
      const found = erpStore.getPartyByName(args.partyName);
      if (found) {
        partyObj = {
          name: found.name,
          gstin: found.gstin,
          address: found.address,
          state: found.state,
          stateCode: found.stateCode,
          phone: found.phone,
        };
      }
    }

    const partyInfo = {
      name: partyObj?.name || args.partyName || 'Vardhaman Spinning Mills',
      gstin: partyObj?.gstin || '33BBBBB1111B2Z2',
      address: partyObj?.address || '45 Fashion Highway, Erode, Tamil Nadu - 638001',
      state: partyObj?.state || 'Tamil Nadu',
      stateCode: partyObj?.stateCode || '33',
      phone: partyObj?.phone || '+91 91234 56789',
    };

    // 3. Resolve Items
    const rawItems = (args.items && args.items.length > 0)
      ? args.items.map(i => ({
          description: i.description || 'Bio-Wash Hosiery Fabric',
          hsn: i.hsn || '6006',
          qty: i.qty || 300,
          rate: i.rate || 450,
          unit: i.unit || 'Kgs',
          discountPct: i.discountPct || 0,
          taxRatePct: i.taxRatePct ?? 12,
        }))
      : [
          {
            description: 'Bio-Wash Hosiery Fabric',
            hsn: '6006',
            qty: 300,
            rate: 450,
            unit: 'Kgs',
            discountPct: 0,
            taxRatePct: 12,
          },
        ];

    ctx.logger.info('Generating AlphaTex Invoice', { seller: sellerInfo.name, party: partyInfo.name, itemCount: rawItems.length });

    const calculatedTotals = calculateInvoiceTotals(rawItems, {
      isInterstate: args.isInterstate,
      invoiceDiscountPct: args.invoiceDiscountPct,
      freightCharges: args.freightCharges,
      packingCharges: args.packingCharges,
      autoRound: true,
    });

    const sanitizedInvoiceNo = (args.invoiceNo || `AT-${Date.now().toString().slice(-6)}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const invoiceNo = args.invoiceNo || `AT-${Date.now().toString().slice(-6)}`;
    const invoiceDate = args.invoiceDate || new Date().toISOString().split('T')[0];
    const bankAccount = erpStore.getBankAccounts()[0] || {
      bankName: 'State Bank of India',
      accountNo: '39847192834',
      ifsc: 'SBIN0001234',
      branch: 'Main Branch, Tirupur',
    };

    const invoiceData = {
      invoiceNo,
      invoiceDate,
      dueDate: args.dueDate || invoiceDate,
      paymentTerms: args.paymentTerms || 'Credit - 15 Days',
      party: partyInfo,
      seller: sellerInfo,
      bankDetails: bankAccount,
      isInterstate: Boolean(args.isInterstate),
      notes: args.notes || 'Thank you for your business! Payment due within 15 days.',
      ...calculatedTotals,
    };

    // 4. Generate & Save Standalone Tally GST Invoice HTML file to Desktop
    const htmlContent = generateTallyInvoiceHTML(invoiceData);
    const desktopDir = 'C:\\Users\\raiyan\\OneDrive\\Desktop';
    const desktopFilePath = path.join(desktopDir, `AlphaTex_Invoice_${sanitizedInvoiceNo}.html`);

    try {
      fs.writeFileSync(desktopFilePath, htmlContent, 'utf-8');
      if (args.autoOpen !== false) {
        exec(`start "" "${desktopFilePath}"`);
      }
    } catch (err) {
      ctx.logger.warn('Error saving/opening Desktop invoice', { error: String(err) });
    }

    const fmt = (val: number) => val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Format rich text markdown summary
    const markdownSummary = `
=====================================================
            TAX INVOICE - ${invoiceNo}
=====================================================
Seller: ${sellerInfo.name} | GSTIN: ${sellerInfo.gstin}
Buyer:  ${partyInfo.name} | GSTIN: ${partyInfo.gstin}
Date:   ${invoiceDate} | Mode: ${invoiceData.paymentTerms}
-----------------------------------------------------
ITEMS:
${rawItems.map((item, idx) => `${idx + 1}. ${item.description} (HSN: ${item.hsn})
   Qty: ${item.qty} ${item.unit} @ ₹${item.rate} = Taxable: ₹${fmt(calculatedTotals.items[idx].taxableValue)} (GST ${item.taxRatePct}%)`).join('\n')}
-----------------------------------------------------
Subtotal Taxable: ₹${fmt(calculatedTotals.totalTaxableValue)}
${!args.isInterstate ? `CGST (6%): ₹${fmt(calculatedTotals.totalCGST)}\nSGST (6%): ₹${fmt(calculatedTotals.totalSGST)}` : `IGST (12%): ₹${fmt(calculatedTotals.totalIGST)}`}
-----------------------------------------------------
GRAND TOTAL:      ₹${fmt(calculatedTotals.grandTotal)}
AMOUNT IN WORDS:  ${calculatedTotals.amountInWords}
=====================================================
📄 Printable GST Bill Saved & Opened:
file:///${desktopFilePath.replace(/\\/g, '/')}
=====================================================
`;

    return {
      status: 'SUCCESS',
      invoiceNo,
      grandTotal: calculatedTotals.grandTotal,
      amountInWords: calculatedTotals.amountInWords,
      desktopBillFile: desktopFilePath,
      summary: markdownSummary,
      data: invoiceData,
    };
  }
}
