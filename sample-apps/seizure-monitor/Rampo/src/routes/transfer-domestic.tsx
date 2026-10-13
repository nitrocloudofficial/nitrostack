import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { BankLayout } from "@/components/BankLayout";
import { ArrowRight, CheckCircle, AlertCircle, Info, Printer, Download } from "lucide-react";
import { useAuth, checkAuthSession } from "@/hooks/use-auth";
import { reportFormFailure } from "@/lib/tracker";

export const Route = createFileRoute("/transfer-domestic")({
  beforeLoad: async () => {
    const isAuthenticated = await checkAuthSession();
    if (!isAuthenticated) {
      throw redirect({
        to: "/login",
      });
    }
  },
  head: () => ({
    meta: [
      { title: "Fund Transfer (NEFT/RTGS/IMPS) — Rashtriya Bank of India" },
      { name: "description", content: "Transfer funds domestically via NEFT, RTGS, or IMPS." },
    ],
  }),
  component: DomesticTransfer,
});

const beneficiaries = [
  { id: "1", name: "SUNITA SHARMA", acct: "01234567890", ifsc: "HDFC0001234", bank: "HDFC Bank", branch: "Lajpat Nagar, New Delhi" },
  { id: "2", name: "MOHAN LAL GUPTA", acct: "56781234500", ifsc: "SBIN0007890", bank: "State Bank of India", branch: "Karol Bagh, New Delhi" },
  { id: "3", name: "PRIYA VERMA", acct: "98765432100", ifsc: "ICIC0001234", bank: "ICICI Bank", branch: "Connaught Place, New Delhi" },
];

type Step = "form" | "review" | "otp" | "success";

function DomesticTransfer() {
  const [step, setStep] = useState<Step>("form");
  const [addNew, setAddNew] = useState(false);
  const [selBene, setSelBene] = useState("");
  const [transferType, setTransferType] = useState("NEFT");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("Family Maintenance");
  const [remarks, setRemarks] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // New bene form
  const [newName, setNewName] = useState("");
  const [newAcct, setNewAcct] = useState("");
  const [newAcctConf, setNewAcctConf] = useState("");
  const [newIfsc, setNewIfsc] = useState("");
  const [newBank, setNewBank] = useState("");

  const ifscBankMap: Record<string, string> = {
    HDFC: "HDFC Bank", SBIN: "State Bank of India", ICIC: "ICICI Bank",
    UTIB: "Axis Bank", KKBK: "Kotak Mahindra Bank", PUNB: "Punjab National Bank",
    BKID: "Bank of India", UBIN: "Union Bank of India", CNRB: "Canara Bank",
    RBIN: "Rashtriya Bank of India",
  };

  const handleIfscChange = (val: string) => {
    setNewIfsc(val.toUpperCase());
    const prefix = val.substring(0, 4).toUpperCase();
    if (ifscBankMap[prefix]) setNewBank(ifscBankMap[prefix]);
    else setNewBank("");
  };

  const charges = transferType === "NEFT" ? "₹ 2.50 + GST" : transferType === "RTGS" ? "₹ 25.00 + GST" : "₹ 5.00 + GST";
  const processingTime = transferType === "NEFT" ? "2-4 Hours (batch)" : transferType === "RTGS" ? "30 Minutes" : "Immediate (24x7)";

  const selectedBene = beneficiaries.find(b => b.id === selBene);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!selBene && !addNew) errs.bene = "Please select or add a beneficiary.";
    if (addNew) {
      if (!newName.trim()) errs.newName = "Beneficiary name is required.";
      if (!newAcct.trim()) errs.newAcct = "Account number is required.";
      if (newAcct !== newAcctConf) errs.newAcctConf = "Account numbers do not match.";
      if (!newIfsc.trim() || newIfsc.length < 11) errs.newIfsc = "Valid 11-character IFSC code required.";
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) errs.amount = "Enter a valid amount.";
    if (transferType === "RTGS" && Number(amount) < 200000) errs.amount = "RTGS minimum amount is ₹2,00,000.";
    if (Number(amount) > 124067.83) errs.amount = "Amount exceeds available balance.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const ifscFirst = Boolean(errs.newIfsc || errs.bene || errs.newAcct);
      reportFormFailure("domestic_transfer", ifscFirst ? "beneficiary_ifsc" : "submit_review", errs);
    }
    return Object.keys(errs).length === 0;
  };

  const txnRef = "RBIN" + Date.now().toString().slice(-10);

  if (step === "success") {
    return (
      <BankLayout>
        <div className="max-w-[1200px] mx-auto px-2 py-2 bg-white">
          <DashHeader />
          <div className="grid grid-cols-12 gap-2 mt-2">
            <SideMenu />
            <main className="col-span-10">
              <div className="gov-panel">
                <div className="gov-panel-title flex items-center gap-2">
                  <CheckCircle size={14} /> Transaction Successful
                </div>
                <div className="p-4 bg-[#e8f5e9] border-b border-[#007a3d] text-center">
                  <CheckCircle size={32} className="text-[#007a3d] mx-auto mb-2" />
                  <div className="text-[14px] font-bold text-[#007a3d]">Your fund transfer was processed successfully!</div>
                </div>
                <div className="p-3">
                  <div className="gov-panel mb-3">
                    <div className="gov-panel-title text-[11px]">Transaction Receipt</div>
                    <table className="gov-table">
                      <tbody>
                        {[
                          ["Transaction Reference", txnRef],
                          ["Date & Time", "25-Jul-2026  " + new Date().toLocaleTimeString()],
                          ["Sender Account", "30014782291001 (SB) — Connaught Place, ND"],
                          ["Beneficiary", addNew ? newName : (selectedBene?.name || "")],
                          ["Beneficiary Account", addNew ? newAcct : (selectedBene?.acct || "")],
                          ["IFSC / Bank", addNew ? `${newIfsc} / ${newBank}` : `${selectedBene?.ifsc} / ${selectedBene?.bank}`],
                          ["Transfer Mode", transferType],
                          ["Amount", `₹ ${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
                          ["Charges", charges],
                          ["Purpose", purpose],
                          ["Remarks", remarks || "—"],
                          ["Status", "SUCCESS"],
                        ].map(([k, v]) => (
                          <tr key={k}>
                            <td className="font-bold w-48">{k}</td>
                            <td className={v === "SUCCESS" ? "text-[#007a3d] font-bold" : ""}>{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-3d flex items-center gap-1" onClick={() => window.print()}><Printer size={10} /> Print Receipt</button>
                    <button className="btn-3d-yellow flex items-center gap-1"><Download size={10} /> Download PDF</button>
                    <button className="btn-3d-orange" onClick={() => setStep("form")}>New Transfer</button>
                  </div>
                  <div className="mt-2 text-[10px] text-gray-600 bg-[#fff9c4] border border-[#f9a825] p-1">
                    <b>Note:</b> Please keep this reference number ({txnRef}) for future correspondence. SMS alert sent to registered mobile +91-98XXXXXX71.
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </BankLayout>
    );
  }

  if (step === "otp") {
    return (
      <BankLayout>
        <div className="max-w-[1200px] mx-auto px-2 py-2 bg-white">
          <DashHeader />
          <div className="grid grid-cols-12 gap-2 mt-2">
            <SideMenu />
            <main className="col-span-10">
              <div className="gov-panel">
                <div className="gov-panel-title">OTP Verification — Fund Transfer</div>
                <div className="p-4 max-w-md">
                  <div className="bg-[#fff9c4] border border-[#f9a825] p-2 text-[11px] mb-3 flex items-start gap-2">
                    <Info size={12} className="text-[#0d3b7f] mt-0.5 shrink-0" />
                    An OTP has been sent to your registered mobile number +91-98XXXXXX71 and email ra****a@gmail.com. OTP is valid for 10 minutes.
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div><b>Transfer Amount:</b> ₹ {Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                    <div><b>To:</b> {addNew ? newName : selectedBene?.name} ({addNew ? newAcct : selectedBene?.acct})</div>
                    <div><b>Mode:</b> {transferType}</div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-[11px] font-bold mb-1">Enter OTP <span className="text-[#cc0000]">*</span></label>
                    <input
                      type="text" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/, ""))}
                      className={`border ${otpError ? "border-[#cc0000]" : "border-gray-400"} text-[12px] px-2 py-1 w-40 tracking-widest font-bold`}
                      placeholder="_ _ _ _ _ _"
                    />
                    {otpError && <div className="text-[#cc0000] text-[10px] mt-1">Invalid OTP. Please enter the correct OTP sent to your mobile.</div>}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button className="btn-3d" onClick={() => {
                      if (otp === "123456") { setStep("success"); } else { setOtpError(true); reportFormFailure("domestic_transfer", "otp", ["otp"], { field: "otp" }); }
                    }}>Verify & Transfer »</button>
                    <button className="btn-3d-yellow" onClick={() => setOtpError(false)}>Resend OTP</button>
                    <button className="btn-3d" onClick={() => setStep("review")}>« Back</button>
                  </div>
                  <div className="text-[9px] text-gray-500 mt-2">For demo, enter OTP: <b>123456</b></div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </BankLayout>
    );
  }

  if (step === "review") {
    return (
      <BankLayout>
        <div className="max-w-[1200px] mx-auto px-2 py-2 bg-white">
          <DashHeader />
          <div className="grid grid-cols-12 gap-2 mt-2">
            <SideMenu />
            <main className="col-span-10">
              <div className="gov-panel">
                <div className="gov-panel-title">Review Fund Transfer — Please verify before confirming</div>
                <div className="p-3">
                  <div className="bg-[#fff9c4] border border-[#f9a825] p-2 text-[11px] mb-3 flex items-start gap-2">
                    <AlertCircle size={12} className="text-[#cc0000] mt-0.5 shrink-0" />
                    Please verify all the details below carefully. Once confirmed, the transaction cannot be reversed.
                  </div>
                  <table className="gov-table mb-3">
                    <tbody>
                      {[
                        ["Sender Account", "30014782291001 (Savings A/c) — Connaught Place, ND"],
                        ["Available Balance", "₹ 1,24,067.83"],
                        ["Beneficiary Name", addNew ? newName : (selectedBene?.name || "")],
                        ["Account Number", addNew ? newAcct : (selectedBene?.acct || "")],
                        ["Bank / IFSC", addNew ? `${newBank} / ${newIfsc}` : `${selectedBene?.bank} / ${selectedBene?.ifsc}`],
                        ["Branch", addNew ? newBank : (selectedBene?.branch || "")],
                        ["Transfer Mode", transferType],
                        ["Amount", `₹ ${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
                        ["Transaction Charges", charges],
                        ["Total Debit", `₹ ${(Number(amount) + (transferType === "RTGS" ? 25 : transferType === "NEFT" ? 2.5 : 5)).toLocaleString("en-IN", { minimumFractionDigits: 2 })} (approx.)`],
                        ["Purpose", purpose],
                        ["Remarks", remarks || "—"],
                        ["Processing Time", processingTime],
                      ].map(([k, v]) => (
                        <tr key={k}><td className="font-bold w-52">{k}</td><td>{v}</td></tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex gap-2">
                    <button className="btn-3d-orange" onClick={() => setStep("otp")}>Confirm & Get OTP »</button>
                    <button className="btn-3d" onClick={() => setStep("form")}>« Edit Details</button>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </BankLayout>
    );
  }

  return (
    <BankLayout>
      <div className="max-w-[1200px] mx-auto px-2 py-2 bg-white">
        <DashHeader />
        <div className="grid grid-cols-12 gap-2 mt-2">
          <SideMenu />
          <main className="col-span-10 space-y-2">
            {/* Breadcrumb */}
            <div className="text-[10px] text-[#0033aa]">
              <a className="old-link">Home</a> » <a className="old-link">Payments & Transfers</a> » <b>Domestic Fund Transfer</b>
            </div>

            {/* Sender Account */}
            <div className="gov-panel">
              <div className="gov-panel-title text-[11px]">Sender Account Details</div>
              <div className="p-2 grid grid-cols-4 gap-2 text-[11px] bg-[#f4efe6]">
                <div><div className="text-[9px] text-gray-600 uppercase font-bold">Account Number</div><div className="font-bold">30014782291001</div></div>
                <div><div className="text-[9px] text-gray-600 uppercase font-bold">Account Type</div><div>Savings Account</div></div>
                <div><div className="text-[9px] text-gray-600 uppercase font-bold">Branch (IFSC)</div><div>Connaught Place, ND (RBIN0001234)</div></div>
                <div><div className="text-[9px] text-gray-600 uppercase font-bold">Available Balance</div><div className="font-bold text-[#007a3d] text-[13px]">₹ 1,24,067.83</div></div>
              </div>
            </div>

            {/* Beneficiary */}
            <div className="gov-panel">
              <div className="gov-panel-title text-[11px]">Beneficiary Details</div>
              <div className="p-2 space-y-2">
                <div className="flex gap-3 text-[11px]">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" checked={!addNew} onChange={() => setAddNew(false)} /> Select Existing Beneficiary
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" checked={addNew} onChange={() => setAddNew(true)} /> Add New Beneficiary
                  </label>
                </div>
                {errors.bene && <div className="text-[#cc0000] text-[10px]">⚠ {errors.bene}</div>}

                {!addNew ? (
                  <div>
                    <label className="block text-[11px] font-bold mb-1">Select Beneficiary <span className="text-[#cc0000]">*</span></label>
                    <select value={selBene} onChange={e => setSelBene(e.target.value)} className="border border-gray-400 text-[11px] px-1 py-0.5 w-full max-w-sm">
                      <option value="">-- Select Beneficiary --</option>
                      {beneficiaries.map(b => <option key={b.id} value={b.id}>{b.name} — {b.bank} ({b.acct})</option>)}
                    </select>
                    {selBene && (
                      <table className="gov-table mt-2 max-w-lg">
                        <tbody>
                          <tr><td className="font-bold">Name</td><td>{selectedBene?.name}</td></tr>
                          <tr><td className="font-bold">Account No.</td><td>{selectedBene?.acct}</td></tr>
                          <tr><td className="font-bold">Bank</td><td>{selectedBene?.bank}</td></tr>
                          <tr><td className="font-bold">IFSC</td><td>{selectedBene?.ifsc}</td></tr>
                          <tr><td className="font-bold">Branch</td><td>{selectedBene?.branch}</td></tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {[
                      { label: "Beneficiary Name", val: newName, set: setNewName, err: errors.newName, ph: "As per bank records" },
                      { label: "Account Number", val: newAcct, set: setNewAcct, err: errors.newAcct, ph: "Enter account number" },
                      { label: "Confirm Account Number", val: newAcctConf, set: setNewAcctConf, err: errors.newAcctConf, ph: "Re-enter account number" },
                    ].map(f => (
                      <div key={f.label}>
                        <label className="block font-bold mb-0.5">{f.label} <span className="text-[#cc0000]">*</span></label>
                        <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                          className={`border ${f.err ? "border-[#cc0000]" : "border-gray-400"} text-[11px] px-1 py-0.5 w-full`} />
                        {f.err && <div className="text-[#cc0000] text-[10px]">⚠ {f.err}</div>}
                      </div>
                    ))}
                    <div>
                      <label className="block font-bold mb-0.5">IFSC Code <span className="text-[#cc0000]">*</span></label>
                      <input value={newIfsc} onChange={e => handleIfscChange(e.target.value)} maxLength={11} placeholder="e.g. HDFC0001234"
                        className={`border ${errors.newIfsc ? "border-[#cc0000]" : "border-gray-400"} text-[11px] px-1 py-0.5 w-full uppercase`} />
                      {errors.newIfsc && <div className="text-[#cc0000] text-[10px]">⚠ {errors.newIfsc}</div>}
                    </div>
                    <div>
                      <label className="block font-bold mb-0.5">Bank Name (Auto Detected)</label>
                      <input value={newBank} readOnly placeholder="Auto-detected from IFSC"
                        className="border border-gray-300 text-[11px] px-1 py-0.5 w-full bg-[#f4efe6] text-[#007a3d] font-bold" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Transfer Details */}
            <div className="gov-panel">
              <div className="gov-panel-title text-[11px]">Transfer Details</div>
              <div className="p-2 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <label className="block font-bold mb-1">Transfer Type <span className="text-[#cc0000]">*</span></label>
                  <div className="flex gap-3">
                    {["NEFT", "RTGS", "IMPS"].map(t => (
                      <label key={t} className="flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="ttype" checked={transferType === t} onChange={() => setTransferType(t)} /> {t}
                      </label>
                    ))}
                  </div>
                  <div className="text-[9px] text-gray-500 mt-0.5">
                    {transferType === "NEFT" && "Available Mon–Sat (excl. 2nd & 4th Sat), 8 AM – 7:30 PM"}
                    {transferType === "RTGS" && "Min. ₹2,00,000 • Mon–Fri 8 AM – 6 PM • Sat 8 AM – 2 PM"}
                    {transferType === "IMPS" && "Instant 24×7 including holidays"}
                  </div>
                </div>
                <div>
                  <label className="block font-bold mb-1">Amount (₹) <span className="text-[#cc0000]">*</span></label>
                  <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount"
                    className={`border ${errors.amount ? "border-[#cc0000]" : "border-gray-400"} text-[11px] px-1 py-0.5 w-full`} />
                  {errors.amount && <div className="text-[#cc0000] text-[10px]">⚠ {errors.amount}</div>}
                </div>
                <div>
                  <label className="block font-bold mb-1">Purpose <span className="text-[#cc0000]">*</span></label>
                  <select value={purpose} onChange={e => setPurpose(e.target.value)} className="border border-gray-400 text-[11px] px-1 py-0.5 w-full">
                    {["Family Maintenance","Salary","Business Payment","Rent","Loan Repayment","Medical Expenses","Education Fees","Others"].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Remarks (optional)</label>
                  <input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Enter remarks"
                    className="border border-gray-400 text-[11px] px-1 py-0.5 w-full" />
                </div>
              </div>
              <div className="bg-[#f4efe6] p-2 text-[11px] grid grid-cols-2 gap-2 border-t border-gray-300">
                <div><span className="font-bold">Transaction Charges:</span> {charges}</div>
                <div><span className="font-bold">Estimated Processing:</span> {processingTime}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="btn-3d-orange flex items-center gap-1" onClick={() => { if (validate()) setStep("review"); }}>
                Review Transfer <ArrowRight size={10} />
              </button>
              <button className="btn-3d" onClick={() => { setErrors({}); setAmount(""); setRemarks(""); setSelBene(""); }}>Reset</button>
            </div>
            <div className="text-[9px] text-gray-600 bg-[#fff9c4] border border-[#f9a825] p-1">
              <b>Security Note:</b> Rashtriya Bank of India will never ask for your OTP, PIN, or CVV over phone/email. Report suspicious activity to 1800-11-2211.
            </div>
          </main>
        </div>
      </div>
    </BankLayout>
  );
}

function DashHeader() {
  const { user } = useAuth();
  const fullName = user?.user_metadata?.full_name || "MR. RAMESH KUMAR SHARMA";
  const cifNo = user?.user_metadata?.cif_number || "30014782291";

  return (
    <div className="bg-gradient-to-r from-[#0d3b7f] to-[#3a6bb8] text-white px-3 py-1.5 flex items-center justify-between">
      <span className="text-[12px]">Welcome, <b>{fullName}</b> (CIF: {cifNo})</span>
      <div className="flex items-center gap-3 text-[10px]">
        <span>Last Login: 23-Jul-2026 09:14:22</span>
        <span className="text-[#fdd835]">|</span>
        <span>Session: <b className="blink">04:52</b></span>
      </div>
    </div>
  );
}

function SideMenu() {
  return (
    <aside className="col-span-2">
      <div className="gov-panel">
        <div className="gov-panel-title text-[11px]">My Menu</div>
        <ul className="text-[11px] bg-white">
          {["Account Summary","Mini Statement","Detailed Statement","Fund Transfer","Add Beneficiary","NEFT/RTGS","IMPS Transfer","International Transfer","Deposit Funds","Withdraw Funds","Credit Score","Bill Pay","Profile Settings"].map(x => (
            <li key={x} className="border-b border-dotted border-gray-300 hover:bg-[#fdd835]">
              <a className="block px-1.5 py-1 text-[#0033aa]">» {x}</a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
