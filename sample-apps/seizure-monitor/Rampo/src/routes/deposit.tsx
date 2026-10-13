import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { BankLayout } from "@/components/BankLayout";
import { CheckCircle, Printer, Download, AlertCircle } from "lucide-react";
import { useAuth, checkAuthSession } from "@/hooks/use-auth";
import { reportFormFailure } from "@/lib/tracker";

export const Route = createFileRoute("/deposit")({
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
      { title: "Deposit Funds — Rashtriya Bank of India" },
      { name: "description", content: "Deposit funds into your account via cash, cheque, or bank transfer." },
    ],
  }),
  component: DepositFunds,
});

type Step = "form" | "review" | "confirm" | "success";

const accounts = [
  { id: "1", number: "30014782291001", type: "Savings Account", branch: "Connaught Place, ND", balance: 124067.83 },
  { id: "2", number: "30014782291002", type: "Savings Account", branch: "Karol Bagh, ND", balance: 47890.00 },
];

function DepositFunds() {
  const [step, setStep] = useState<Step>("form");
  const [selAcct, setSelAcct] = useState("1");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [refNum, setRefNum] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);

  const selectedAcct = accounts.find(a => a.id === selAcct)!;
  const txnRef = "RDEP" + Date.now().toString().slice(-10);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) errs.amount = "Enter a valid deposit amount.";
    if (Number(amount) < 100) errs.amount = "Minimum deposit amount is ₹ 100.";
    if (Number(amount) > 1000000) errs.amount = "Maximum single deposit is ₹ 10,00,000.";
    if (method === "Cheque" && !refNum.trim()) errs.refNum = "Cheque number is required.";
    if (method === "Bank Transfer" && !refNum.trim()) errs.refNum = "UTR / Reference number is required.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      reportFormFailure("deposit_open", errs.amount ? "amount" : "confirm", errs);
    }
    return Object.keys(errs).length === 0;
  };

  if (step === "success") {
    const newBalance = selectedAcct.balance + Number(amount);
    return (
      <BankLayout>
        <div className="max-w-[1200px] mx-auto px-2 py-2 bg-white">
          <DashHeader />
          <div className="grid grid-cols-12 gap-2 mt-2">
            <SideMenu />
            <main className="col-span-10">
              <div className="gov-panel">
                <div className="gov-panel-title flex items-center gap-2"><CheckCircle size={14} /> Deposit Successful</div>
                <div className="p-4 bg-[#e8f5e9] border-b border-[#007a3d] text-center">
                  <CheckCircle size={32} className="text-[#007a3d] mx-auto mb-2" />
                  <div className="text-[14px] font-bold text-[#007a3d]">Amount deposited successfully into your account!</div>
                </div>
                <div className="p-3">
                  <div className="gov-panel mb-3">
                    <div className="gov-panel-title text-[11px]">Deposit Receipt</div>
                    <table className="gov-table">
                      <tbody>
                        {[
                          ["Transaction Reference", txnRef],
                          ["Date & Time", "25-Jul-2026  " + new Date().toLocaleTimeString()],
                          ["Account Number", selectedAcct.number],
                          ["Account Type", selectedAcct.type],
                          ["Branch", selectedAcct.branch],
                          ["Deposit Method", method],
                          ...(refNum ? [["Reference / Cheque No.", refNum] as [string, string]] : []),
                          ["Amount Deposited", `₹ ${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
                          ["Previous Balance", `₹ ${selectedAcct.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
                          ["Updated Balance", `₹ ${newBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
                          ["Notes", notes || "—"],
                          ["Status", "SUCCESS"],
                        ].map(([k, v]) => (
                          <tr key={k}><td className="font-bold w-52">{k}</td><td className={v === "SUCCESS" ? "text-[#007a3d] font-bold" : ""}>{v}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-3d flex items-center gap-1" onClick={() => window.print()}><Printer size={10} /> Print Receipt</button>
                    <button className="btn-3d-yellow flex items-center gap-1"><Download size={10} /> Download PDF</button>
                    <button className="btn-3d-orange" onClick={() => { setStep("form"); setAmount(""); setRefNum(""); setNotes(""); }}>New Deposit</button>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </BankLayout>
    );
  }

  if (step === "review" || step === "confirm") {
    return (
      <BankLayout>
        <div className="max-w-[1200px] mx-auto px-2 py-2 bg-white">
          <DashHeader />
          <div className="grid grid-cols-12 gap-2 mt-2">
            <SideMenu />
            <main className="col-span-10">
              <div className="gov-panel">
                <div className="gov-panel-title">Review Deposit — Please verify details</div>
                <div className="p-3">
                  <div className="bg-[#fff9c4] border border-[#f9a825] p-2 text-[11px] mb-3 flex items-start gap-2">
                    <AlertCircle size={12} className="text-[#cc0000] mt-0.5 shrink-0" />
                    Please verify the deposit details below before confirming. This action cannot be undone.
                  </div>
                  <table className="gov-table mb-3 max-w-lg">
                    <tbody>
                      {[
                        ["Account Number", selectedAcct.number],
                        ["Account Type", selectedAcct.type],
                        ["Branch", selectedAcct.branch],
                        ["Current Balance", `₹ ${selectedAcct.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
                        ["Deposit Method", method],
                        ...(refNum ? [["Reference No.", refNum] as [string, string]] : []),
                        ["Amount to Deposit", `₹ ${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
                        ["Notes", notes || "—"],
                      ].map(([k, v]) => (
                        <tr key={k}><td className="font-bold w-52">{k}</td><td>{v}</td></tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Confirm Dialog */}
                  {showConfirm && (
                    <div className="border-2 border-[#0d3b7f] p-3 bg-[#f4efe6] mb-3 max-w-sm">
                      <div className="gov-panel-title text-[11px] -mx-3 -mt-3 mb-2">Confirm Deposit</div>
                      <div className="text-[11px] mb-2">
                        You are about to deposit <b>₹ {Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</b> via <b>{method}</b> into account <b>{selectedAcct.number}</b>. Do you confirm?
                      </div>
                      <div className="flex gap-2">
                        <button className="btn-3d-orange" onClick={() => setStep("success")}>Yes, Confirm Deposit</button>
                        <button className="btn-3d" onClick={() => setShowConfirm(false)}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {!showConfirm && (
                    <div className="flex gap-2">
                      <button className="btn-3d-orange" onClick={() => setShowConfirm(true)}>Confirm Deposit »</button>
                      <button className="btn-3d" onClick={() => setStep("form")}>« Edit Details</button>
                    </div>
                  )}
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
            <div className="text-[10px] text-[#0033aa]">
              <a className="old-link">Home</a> » <a className="old-link">My Accounts</a> » <b>Deposit Funds</b>
            </div>

            {/* Account Selection */}
            <div className="gov-panel">
              <div className="gov-panel-title text-[11px]">Select Account</div>
              <div className="p-2 space-y-1 text-[11px]">
                {accounts.map(a => (
                  <label key={a.id} className={`flex items-center gap-2 p-2 border cursor-pointer ${selAcct === a.id ? "border-[#1f4e9c] bg-[#e8f0fa]" : "border-gray-300 hover:bg-[#fdd835]"}`}>
                    <input type="radio" name="acct" checked={selAcct === a.id} onChange={() => setSelAcct(a.id)} />
                    <div>
                      <div className="font-bold">{a.number} — {a.type}</div>
                      <div className="text-[10px] text-gray-600">{a.branch} | Balance: <span className="font-bold text-[#007a3d]">₹ {a.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Deposit Form */}
            <div className="gov-panel">
              <div className="gov-panel-title text-[11px]">Deposit Details</div>
              <div className="p-2 space-y-2 text-[11px]">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold mb-0.5">Deposit Amount (₹) <span className="text-[#cc0000]">*</span></label>
                    <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Minimum ₹ 100"
                      className={`border ${errors.amount ? "border-[#cc0000]" : "border-gray-400"} text-[11px] px-1 py-0.5 w-full`} />
                    {errors.amount && <div className="text-[#cc0000] text-[10px]">⚠ {errors.amount}</div>}
                  </div>
                  <div>
                    <label className="block font-bold mb-0.5">Deposit Method <span className="text-[#cc0000]">*</span></label>
                    <div className="flex gap-3 mt-0.5">
                      {["Cash", "Cheque", "Bank Transfer"].map(m => (
                        <label key={m} className="flex items-center gap-1 cursor-pointer">
                          <input type="radio" name="method" checked={method === m} onChange={() => { setMethod(m); setRefNum(""); setErrors({}); }} /> {m}
                        </label>
                      ))}
                    </div>
                    <div className="text-[9px] text-gray-500 mt-0.5">
                      {method === "Cash" && "Cash deposit at branch counter or CDM machine."}
                      {method === "Cheque" && "Deposit cheque at branch or cheque drop box."}
                      {method === "Bank Transfer" && "NEFT/RTGS/IMPS transfer from another bank account."}
                    </div>
                  </div>
                </div>

                {(method === "Cheque" || method === "Bank Transfer") && (
                  <div>
                    <label className="block font-bold mb-0.5">
                      {method === "Cheque" ? "Cheque Number" : "UTR / Reference Number"} <span className="text-[#cc0000]">*</span>
                    </label>
                    <input value={refNum} onChange={e => setRefNum(e.target.value)} placeholder={method === "Cheque" ? "6-digit cheque number" : "UTR/Reference number"}
                      className={`border ${errors.refNum ? "border-[#cc0000]" : "border-gray-400"} text-[11px] px-1 py-0.5 w-72`} />
                    {errors.refNum && <div className="text-[#cc0000] text-[10px]">⚠ {errors.refNum}</div>}
                  </div>
                )}

                <div>
                  <label className="block font-bold mb-0.5">Notes / Narration (optional)</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Additional notes..."
                    className="border border-gray-400 text-[11px] px-1 py-0.5 w-full" />
                </div>

                {method === "Cheque" && (
                  <div className="bg-[#fff9c4] border border-[#f9a825] p-1.5 text-[10px]">
                    <b>Note:</b> Cheque clearing may take 2–3 working days. Amount will be credited only after realisation. Post-dated cheques are not accepted.
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button className="btn-3d-orange" onClick={() => { if (validate()) setStep("review"); }}>Review Deposit »</button>
              <button className="btn-3d" onClick={() => { setErrors({}); setAmount(""); setRefNum(""); setNotes(""); }}>Reset</button>
            </div>

            <div className="text-[9px] text-gray-600 bg-[#fff9c4] border border-[#f9a825] p-1">
              <b>Info:</b> Cash deposits above ₹2,00,000 require PAN card as per Income Tax regulations. Suspicious transactions are reported to FIU-IND.
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
          {["Account Summary","Mini Statement","Detailed Statement","Fund Transfer","NEFT/RTGS","IMPS Transfer","International Transfer","Deposit Funds","Withdraw Funds","Credit Score","Bill Pay","Profile Settings"].map(x => (
            <li key={x} className="border-b border-dotted border-gray-300 hover:bg-[#fdd835]">
              <a className="block px-1.5 py-1 text-[#0033aa]">» {x}</a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
