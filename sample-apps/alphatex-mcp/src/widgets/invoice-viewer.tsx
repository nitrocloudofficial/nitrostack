'use client';

import React from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { Printer, Sparkles, Building2, UserCheck, FileText, CheckCircle2, DollarSign } from 'lucide-react';

export interface CalculatedLineItem {
  description: string;
  hsn: string;
  qty: number;
  rate: number;
  unit?: string;
  grossAmount: number;
  discountPct: number;
  discountAmount: number;
  taxableValue: number;
  taxRatePct: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  lineTotal: number;
}

export interface HsnSummaryItem {
  hsn: string;
  taxableValue: number;
  taxRatePct: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
}

export interface InvoiceData {
  invoiceNo: string;
  invoiceDate: string;
  dueDate?: string;
  paymentTerms?: string;
  party: {
    name: string;
    gstin: string;
    address: string;
    state: string;
    stateCode: string;
    phone?: string;
  };
  seller: {
    name: string;
    gstin: string;
    pan?: string;
    address: string;
    phone: string;
    email: string;
  };
  bankDetails?: {
    bankName: string;
    accountNo: string;
    ifsc: string;
    branch?: string;
  };
  isInterstate: boolean;
  items: CalculatedLineItem[];
  hsnSummary: HsnSummaryItem[];
  subtotalGross: number;
  totalItemDiscount: number;
  totalTaxableValue: number;
  invoiceDiscountPct: number;
  invoiceDiscountAmount: number;
  freightCharges: number;
  packingCharges: number;
  netTaxableValue: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalTaxAmount: number;
  unroundedGrandTotal: number;
  roundOff: number;
  grandTotal: number;
  amountInWords: string;
  notes?: string;
}

const DEFAULT_PREVIEW_INVOICE: InvoiceData = {
  invoiceNo: 'AT-2026-001',
  invoiceDate: '2026-08-01',
  dueDate: '2026-08-16',
  paymentTerms: 'Credit - 15 Days',
  seller: {
    name: 'ALPHATEX ENTERPRISES',
    gstin: '33AAAAA0000A1Z5',
    pan: 'AAAAA0000A',
    address: '123 Textile Park, Tirupur, Tamil Nadu - 641601',
    phone: '+91 98765 43210',
    email: 'billing@alphatex.com',
  },
  party: {
    name: 'Vardhaman Spinning Mills',
    gstin: '33BBBBB1111B2Z2',
    address: '45 Fashion Highway, Erode, Tamil Nadu - 638001',
    state: 'Tamil Nadu',
    stateCode: '33',
    phone: '+91 91234 56789',
  },
  bankDetails: {
    bankName: 'State Bank of India',
    accountNo: '39847192834',
    ifsc: 'SBIN0001234',
    branch: 'Main Branch, Tirupur',
  },
  isInterstate: false,
  items: [
    {
      description: 'Bio-Wash Hosiery Fabric',
      hsn: '6006',
      qty: 300,
      rate: 450,
      unit: 'Kgs',
      grossAmount: 135000,
      discountPct: 0,
      discountAmount: 0,
      taxableValue: 135000,
      taxRatePct: 12,
      cgstRate: 6,
      cgstAmount: 8100,
      sgstRate: 6,
      sgstAmount: 8100,
      igstRate: 0,
      igstAmount: 0,
      totalTax: 16200,
      lineTotal: 151200,
    },
  ],
  hsnSummary: [
    {
      hsn: '6006',
      taxableValue: 135000,
      taxRatePct: 12,
      cgstAmount: 8100,
      sgstAmount: 8100,
      igstAmount: 0,
      totalTax: 16200,
    },
  ],
  subtotalGross: 135000,
  totalItemDiscount: 0,
  totalTaxableValue: 135000,
  invoiceDiscountPct: 0,
  invoiceDiscountAmount: 0,
  freightCharges: 0,
  packingCharges: 0,
  netTaxableValue: 135000,
  totalCGST: 8100,
  totalSGST: 8100,
  totalIGST: 0,
  totalTaxAmount: 16200,
  unroundedGrandTotal: 151200,
  roundOff: 0,
  grandTotal: 151200,
  amountInWords: 'Rupees One Lakh Fifty One Thousand Two Hundred Only',
  notes: 'Thank you for your business! Payment due within 15 days.',
};

function extractInvoiceData(raw: any): { invoice: InvoiceData; isRealData: boolean } {
  if (!raw) return { invoice: DEFAULT_PREVIEW_INVOICE, isRealData: false };

  const isValid = (obj: any) => Boolean(obj && (obj.invoiceNo || obj.party || obj.items));

  if (isValid(raw)) return { invoice: normalizeInvoice(raw), isRealData: true };
  if (isValid(raw.result)) return { invoice: normalizeInvoice(raw.result), isRealData: true };
  if (isValid(raw.output)) return { invoice: normalizeInvoice(raw.output), isRealData: true };
  if (isValid(raw.data)) return { invoice: normalizeInvoice(raw.data), isRealData: true };

  if (Array.isArray(raw.content)) {
    for (const item of raw.content) {
      if (item.type === 'text' && typeof item.text === 'string') {
        try {
          const parsed = JSON.parse(item.text);
          if (isValid(parsed)) return { invoice: normalizeInvoice(parsed), isRealData: true };
        } catch (e) {}
      }
    }
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (isValid(parsed)) return { invoice: normalizeInvoice(parsed), isRealData: true };
    } catch (e) {}
  }

  return { invoice: DEFAULT_PREVIEW_INVOICE, isRealData: false };
}

function normalizeInvoice(raw: any): InvoiceData {
  return {
    ...DEFAULT_PREVIEW_INVOICE,
    ...raw,
    party: { ...DEFAULT_PREVIEW_INVOICE.party, ...(raw.party || {}) },
    seller: { ...DEFAULT_PREVIEW_INVOICE.seller, ...(raw.seller || {}) },
    bankDetails: { ...DEFAULT_PREVIEW_INVOICE.bankDetails, ...(raw.bankDetails || {}) },
    items: Array.isArray(raw.items) && raw.items.length > 0 ? raw.items : DEFAULT_PREVIEW_INVOICE.items,
    hsnSummary: Array.isArray(raw.hsnSummary) && raw.hsnSummary.length > 0 ? raw.hsnSummary : DEFAULT_PREVIEW_INVOICE.hsnSummary,
  };
}

export default function InvoiceViewerWidget() {
  const theme = useTheme();
  const isDark = theme === 'dark';
  const { getToolOutput } = useWidgetSDK();

  const rawOutput = getToolOutput<any>();
  const { invoice, isRealData } = extractInvoiceData(rawOutput);

  const fmt = (val: number = 0) =>
    val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handlePrintPDF = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>GST Tax Invoice - ${invoice.invoiceNo}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #000000; background: #ffffff; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            th, td { border: 1px solid #000000; padding: 6px; font-size: 11px; }
            .header-title { font-size: 16px; font-weight: bold; text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="header-title">TAX INVOICE - ${invoice.seller.name}</div>
          <table>
            <tr>
              <td style="width: 50%;">
                <strong>Seller:</strong><br>${invoice.seller.name}<br>${invoice.seller.address}<br>GSTIN: ${invoice.seller.gstin}
              </td>
              <td style="width: 50%;">
                <strong>Buyer:</strong><br>${invoice.party.name}<br>${invoice.party.address}<br>GSTIN: ${invoice.party.gstin}
              </td>
            </tr>
            <tr>
              <td>Invoice No: <strong>${invoice.invoiceNo}</strong></td>
              <td>Date: <strong>${invoice.invoiceDate}</strong></td>
            </tr>
          </table>

          <table>
            <thead>
              <tr>
                <th>Sl</th>
                <th>Item Description</th>
                <th>HSN</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Line Total</th>
              </tr>
            </thead>
            <tbody>
              ${(invoice.items || []).map((item, idx) => `
                <tr>
                  <td style="text-align: center;">${idx + 1}</td>
                  <td>${item.description}</td>
                  <td style="text-align: center;">${item.hsn}</td>
                  <td style="text-align: right;">${item.qty} ${item.unit || 'Kgs'}</td>
                  <td style="text-align: right;">₹ ${fmt(item.rate)}</td>
                  <td style="text-align: right; font-weight: bold;">₹ ${fmt(item.lineTotal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="font-weight: bold; margin-bottom: 12px;">Grand Total: ₹ ${fmt(invoice.grandTotal)}</div>
          <div style="font-style: italic;">Amount in words: ${invoice.amountInWords}</div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const bgColor = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const cardBorder = isDark ? '1px solid #334155' : '1px solid #e2e8f0';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const mutedText = isDark ? '#94a3b8' : '#64748b';

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '850px',
        margin: '0 auto',
        padding: '16px',
        background: bgColor,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: textColor,
      }}
    >
      {/* Top Banner Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          borderRadius: '12px',
          padding: '18px 24px',
          color: '#ffffff',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <FileText size={22} style={{ color: '#93c5fd' }} />
            <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '0.5px' }}>
              TAX INVOICE
            </span>
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                padding: '2px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              #{invoice.invoiceNo}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#bfdbfe' }}>
            Issued on {invoice.invoiceDate} • Payment Mode: {invoice.paymentTerms || 'Credit'}
          </div>
        </div>

        <button
          onClick={handlePrintPDF}
          style={{
            background: '#22c55e',
            color: '#ffffff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)',
            transition: 'all 0.2s',
          }}
        >
          <Printer size={16} />
          <span>Print / Save PDF</span>
        </button>
      </div>

      {/* Seller & Customer 2-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        {/* Seller Card */}
        <div
          style={{
            background: cardBg,
            border: cardBorder,
            borderRadius: '10px',
            padding: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#3b82f6' }}>
            <Building2 size={18} />
            <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Seller (Billed From)
            </span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '6px', color: isDark ? '#60a5fa' : '#1d4ed8' }}>
            {invoice.seller.name}
          </div>
          <div style={{ fontSize: '12px', color: mutedText, lineHeight: '1.4', marginBottom: '8px' }}>
            {invoice.seller.address}
          </div>
          <div style={{ fontSize: '11px', color: textColor }}>
            <strong>GSTIN:</strong> {invoice.seller.gstin}
          </div>
          <div style={{ fontSize: '11px', color: textColor }}>
            <strong>Phone:</strong> {invoice.seller.phone}
          </div>
        </div>

        {/* Buyer Card */}
        <div
          style={{
            background: cardBg,
            border: cardBorder,
            borderRadius: '10px',
            padding: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#10b981' }}>
            <UserCheck size={18} />
            <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Buyer (Billed To)
            </span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '6px', color: isDark ? '#34d399' : '#047857' }}>
            {invoice.party.name}
          </div>
          <div style={{ fontSize: '12px', color: mutedText, lineHeight: '1.4', marginBottom: '8px' }}>
            {invoice.party.address}
          </div>
          <div style={{ fontSize: '11px', color: textColor }}>
            <strong>GSTIN:</strong> {invoice.party.gstin}
          </div>
          <div style={{ fontSize: '11px', color: textColor }}>
            <strong>State:</strong> {invoice.party.state} ({invoice.party.stateCode})
          </div>
        </div>
      </div>

      {/* Itemized Goods Table Card */}
      <div
        style={{
          background: cardBg,
          border: cardBorder,
          borderRadius: '10px',
          overflow: 'hidden',
          marginBottom: '20px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr
              style={{
                background: isDark ? '#0f172a' : '#f1f5f9',
                color: isDark ? '#94a3b8' : '#475569',
                borderBottom: cardBorder,
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              <th style={{ padding: '12px 16px', width: '50px', textAlign: 'center' }}>#</th>
              <th style={{ padding: '12px 16px' }}>Item Description</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>HSN</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Qty</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Rate</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>GST %</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).map((item, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: cardBorder,
                }}
              >
                <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: mutedText }}>
                  {idx + 1}
                </td>
                <td style={{ padding: '14px 16px', fontWeight: 700, color: textColor }}>
                  {item.description}
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'center', fontFamily: 'monospace', color: mutedText }}>
                  {item.hsn}
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600 }}>
                  {item.qty} {item.unit || 'Kgs'}
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                  ₹ {fmt(item.rate)}
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                  <span
                    style={{
                      background: isDark ? '#334155' : '#e0f2fe',
                      color: isDark ? '#38bdf8' : '#0369a1',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    {item.taxRatePct}%
                  </span>
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, color: '#10b981' }}>
                  ₹ {fmt(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary & Totals Bottom Card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
        {/* Notes & Bank Info */}
        <div
          style={{
            background: cardBg,
            border: cardBorder,
            borderRadius: '10px',
            padding: '16px',
            fontSize: '12px',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '6px', color: mutedText, textTransform: 'uppercase', fontSize: '11px' }}>
            Amount Chargeable (In Words)
          </div>
          <div
            style={{
              background: isDark ? '#0f172a' : '#eff6ff',
              color: isDark ? '#60a5fa' : '#1d4ed8',
              padding: '10px 14px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13px',
              marginBottom: '14px',
            }}
          >
            {invoice.amountInWords}
          </div>

          <div style={{ fontWeight: 700, marginBottom: '4px', color: mutedText, fontSize: '11px', textTransform: 'uppercase' }}>
            Bank Account Details
          </div>
          <div style={{ color: textColor, lineHeight: '1.5' }}>
            <div>Bank Name: <strong>{invoice.bankDetails?.bankName || 'State Bank of India'}</strong></div>
            <div>A/c No: <strong>{invoice.bankDetails?.accountNo || '39847192834'}</strong></div>
            <div>IFS Code: <strong>{invoice.bankDetails?.ifsc || 'SBIN0001234'}</strong></div>
          </div>
        </div>

        {/* Calculation Totals */}
        <div
          style={{
            background: cardBg,
            border: cardBorder,
            borderRadius: '10px',
            padding: '16px',
            fontSize: '13px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: mutedText }}>
            <span>Subtotal Gross:</span>
            <span>₹ {fmt(invoice.subtotalGross)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: mutedText }}>
            <span>Total Taxable Value:</span>
            <span>₹ {fmt(invoice.totalTaxableValue)}</span>
          </div>

          {!invoice.isInterstate ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: mutedText }}>
                <span>CGST Tax Amount:</span>
                <span>₹ {fmt(invoice.totalCGST)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: mutedText }}>
                <span>SGST Tax Amount:</span>
                <span>₹ {fmt(invoice.totalSGST)}</span>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: mutedText }}>
              <span>IGST Tax Amount:</span>
              <span>₹ {fmt(invoice.totalIGST)}</span>
            </div>
          )}

          <div
            style={{
              borderTop: cardBorder,
              marginTop: '12px',
              paddingTop: '12px',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '15px', fontWeight: 800, color: textColor }}>Grand Total:</span>
            <span style={{ fontSize: '22px', fontWeight: 800, color: '#10b981' }}>
              ₹ {fmt(invoice.grandTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
