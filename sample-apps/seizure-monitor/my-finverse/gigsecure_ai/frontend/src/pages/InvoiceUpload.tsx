import React, { useState } from 'react';
import { FileCheck2, ShieldAlert, CheckCircle2, Building2, Hash, ArrowRight, AlertTriangle, Download } from 'lucide-react';
import { fraudService } from '../services/fraudService';
import { formatCurrency } from '../utils/formatters';
import { useNotification } from '../hooks/useNotification';
import { generateReportPDF } from '../services/reportService';

const BANKS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Punjab National Bank",
  "Kotak Mahindra",
  "IDFC First",
  "Canara Bank",
  "Bank of Baroda"
];

export const InvoiceUpload: React.FC = () => {
  const { addToast } = useNotification();
  const [submittingBank, setSubmittingBank] = useState("HDFC Bank");
  const [gstin, setGstin] = useState("27AAACG1234H1Z5");
  const [merchantName, setMerchantName] = useState("Apex Express Supplies Ltd");
  const [platformId, setPlatformId] = useState("ZOMATO-PAT-992");
  const [invoiceNumber, setInvoiceNumber] = useState("INV-2026-8801");
  const [invoiceDate, setInvoiceDate] = useState("2026-07-25");
  const [amount, setAmount] = useState<number>(45000);
  const [buyerName, setBuyerName] = useState("Swiggy Private Limited");
  const [ewayBill, setEwayBill] = useState("123456789012");
  const [vehicleNo, setVehicleNo] = useState("MH-12-AB-1234");
  const [transportId, setTransportId] = useState("TRK-987654");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setErrorDetails(null);

    try {
      const res = await fraudService.uploadInvoice({
        gstin,
        merchant_name: merchantName,
        platform_id: platformId,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        amount,
        buyer_name: buyerName,
        eway_bill_number: ewayBill,
        vehicle_number: vehicleNo,
        transport_id: transportId,
        submitting_bank: submittingBank
      });

      setResult(res);
      addToast('success', 'Invoice Authenticated & Fingerprinted', `SHA-256 fingerprint registered under ${submittingBank}.`);
    } catch (err: any) {
      const errRes = err.response?.data?.detail;
      if (errRes && errRes.error === "Duplicate Financing Detected") {
        setErrorDetails(errRes);
        addToast('error', 'CRITICAL: Duplicate Financing Blocked', `Previously financed by ${errRes.previous_bank}.`);
      } else {
        addToast('error', 'Invoice Submission Failed', err.message || 'Error processing invoice');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    generateReportPDF('fraud', {
      invoiceNumber,
      gstin,
      amount,
      submittingBank,
      sha256Hash: result?.sha256_hash || errorDetails?.sha256_hash,
      status: result ? 'VERIFIED' : 'DUPLICATE_BLOCKED'
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
            <FileCheck2 className="w-7 h-7 text-emerald-400" /> Multi-Bank Invoice SHA-256 Fingerprinting
          </h1>
          <p className="text-xs text-slate-400 mt-1">Cross-bank duplicate financing prevention & eWay bill validation ledger</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" /> Submitting Bank & Invoice Details
            </h2>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Central Multi-Bank Ledger Active
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Select Submitting Financial Institution</label>
              <select
                value={submittingBank}
                onChange={(e) => setSubmittingBank(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-emerald-400 font-bold focus:border-emerald-500 focus:outline-none"
              >
                {BANKS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Supplier GSTIN</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Invoice Number</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Amount (INR)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs font-bold text-emerald-400 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Platform Partner ID</label>
                <input
                  type="text"
                  value={platformId}
                  onChange={(e) => setPlatformId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">eWay Bill Number (12 Digits)</label>
                <input
                  type="text"
                  value={ewayBill}
                  onChange={(e) => setEwayBill(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Logistics Vehicle Reg No</label>
                <input
                  type="text"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              {loading ? 'Executing Central Ledger SHA-256 Check...' : 'Verify & Fingerprint Commercial Invoice'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="lg:col-span-5 space-y-4">
          {errorDetails && (
            <div className="glass-card p-6 rounded-3xl border border-rose-500/40 bg-rose-500/10 space-y-4 animate-shake">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-8 h-8 text-rose-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-extrabold text-rose-300 uppercase tracking-tight">DUPLICATE FINANCING DETECTED</h3>
                  <div className="text-xs text-rose-200 mt-0.5">HTTP 400 Central Fraud Ledger Rejection</div>
                </div>
              </div>

              <div className="p-3 bg-slate-950/90 rounded-2xl border border-rose-500/30 text-xs space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Previously Financed By:</span>
                  <span className="text-rose-400 font-bold">{errorDetails.previous_bank}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Timestamp:</span>
                  <span className="text-white">{errorDetails.timestamp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Merchant Name:</span>
                  <span className="text-white">{errorDetails.merchant}</span>
                </div>
              </div>

              <button
                onClick={handleDownloadPDF}
                className="w-full py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs rounded-xl border border-rose-500/40 transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download Fraud Audit Certificate
              </button>
            </div>
          )}

          {result && (
            <div className="glass-card p-6 rounded-3xl border border-emerald-500/40 bg-emerald-500/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Invoice Authenticated</h3>
                    <div className="text-[11px] text-slate-400">SHA-256 Registered under {submittingBank}</div>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                  {result.fraud_risk_level} RISK
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[10px] font-mono break-all space-y-1">
                <div className="text-slate-500 uppercase tracking-widest">SHA-256 Fingerprint</div>
                <span className="text-emerald-400">{result.sha256_hash}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[10px]">GST Status</div>
                  <div className="font-bold text-emerald-400 mt-0.5">{result.gst_status}</div>
                </div>
                <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[10px]">eWay Bill</div>
                  <div className="font-bold text-emerald-400 mt-0.5">{result.eway_status}</div>
                </div>
                <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Logistics</div>
                  <div className="font-bold text-emerald-400 mt-0.5">{result.logistics_status}</div>
                </div>
              </div>

              <button
                onClick={handleDownloadPDF}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Download className="w-4 h-4" /> Download Verification Report
              </button>
            </div>
          )}

          {!result && !errorDetails && (
            <div className="glass-card p-6 rounded-3xl border border-slate-800 text-center space-y-3 text-slate-400">
              <Hash className="w-12 h-12 text-slate-600 mx-auto" />
              <div className="text-xs font-bold text-white">Interactive SHA-256 Fingerprint Generator</div>
              <p className="text-[11px]">
                Submit an invoice to test real-time SHA-256 hash generation and multi-bank duplicate rejection.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
