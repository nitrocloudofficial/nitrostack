import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { BankLayout } from "@/components/BankLayout";
import { CheckCircle, AlertCircle, Printer, Download, Info } from "lucide-react";
import { useAuth, checkAuthSession } from "@/hooks/use-auth";
import { reportFormFailure } from "@/lib/tracker";

export const Route = createFileRoute("/withdraw")({
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
      { title: "Withdraw Funds — Rashtriya Bank of India" },
      { name: "description", content: "Withdraw funds from your account via cash, ATM, or bank transfer." },
    ],
  }),
  component: WithdrawFunds,
});

type Step = "form" | "review" | "otp" | "success";

const accounts = [
  { id: "1", number: "30014782291001", type: "Savings Account", branch: "Connaught Place, ND", balance: 124067.83 },
  { id: "2", number: "30014782291002", type: "Savings Account", branch: "Karol Bagh, ND", balance: 47890.00 },
];

const withdrawalLimits: Record<string, { daily: number; min: number; label: string }> = {
  Cash: { daily: 25000, min: 500, label: "Branch cash withdrawal — Passbook required for >₹10,000" },
  ATM: { daily: 40000, min: 100, label: "ATM withdrawal — Daily limit ₹40,000 (4 free txns/month)" },
  "Bank Transfer": { daily: 1000000, min: 1, label: "NEFT/RTGS/IMPS to another account" },
};

function WithdrawFunds() {
  const [step, setStep] = useState<Step>("form");
  const [selAcct, setSelAcct] = useState("1");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [reason, setReason] = useState("Personal Use");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedAcct = accounts.find(a => a.id === selAcct)!;
  const limit = withdrawalLimits[method];
  const txnRef = "RWDL" + Date.now().toString().slice(-10);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) errs.amount = "Enter a valid withdrawal amount.";
    else if (Number(amount) < limit.min) errs.amount = `Minimum withdrawal for ${method} is ₹ ${limit.min}.`;
    else if (Number(amount) > limit.daily) errs.amount = `Daily limit for ${method} is ₹ ${limit.daily.toLocaleString("en-IN")}.`;
    else if (Number(amount) > selectedAcct.balance - 500) errs.amount = "Insufficient balance. Minimum balance of ₹500 must be maintained.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      reportFormFailure("withdraw", errs.amount ? "amount" : "review", errs);
    }
    return Object.keys(errs).length === 0;
  };

  if (step === "success") {
    const newBalance = selectedAcct.balance - Number(amount);
    return (
      <BankLayout>
        <div className="max-w-[1200px] mx-auto px-2 py-2 bg-white">
          <DashHeader />
          <div className="grid grid-cols-12 gap-2 mt-2">
            <SideMenu />
            <main className="col-span-10">
              <div className="gov-panel">
                <div className="gov-panel-title flex items-center gap-2"><CheckCircle size={14} /> Withdrawal Successful</div>
                <div className="p-4 bg-[#e8f5e9] border-b border-[#007a3d] text-center">
                  <CheckCircle size={32} className="text-[#007a3d] mx-auto mb-2" />
                  <div className="text-[14px] font-bold text-[#007a3d]">Withdrawal processed successfully!</div>
                </div>
                <div className="p-3">
                  <div className="gov-panel mb-3">
                    <div className="gov-panel-title text-[11px]">Withdrawal Receipt</div>
                    <table className="gov-table">
                      <tbody>
                        {[
                          ["Transaction Reference", txnRef],
                          ["Date & Time", "25-Jul-2026  " + new Date().toLocaleTimeString()],
                          ["Account Number", selectedAcct.number],
                          ["Account Type", selectedAcct.type],
                          ["Branch", selectedAcct.branch],
                          ["Withdrawal Method", method],
                          ["Amount Withdrawn", `₹ ${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
                          ["Previous Balance", `₹ ${selectedAcct.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
                          ["Remaining Balance", `₹ ${newBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
                          ["Reason", reason],
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
                    <button className="btn-3d-orange" onClick={() => { setStep("form"); setAmount(""); setOtp(""); setOtpError(false); }}>New Withdrawal</button>
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
                <div className="gov-panel-title">OTP Verification — Withdrawal</div>
                <div className="p-4 max-w-md">
                  <div className="bg-[#fff9c4] border border-[#f9a825] p-2 text-[11px] mb-3 flex items-start gap-2">
                    <Info size={12} className="text-[#0d3b7f] mt-0.5 shrink-0" />
                    OTP sent to your registered mobile +91-98XXXXXX71. Valid for 10 minutes.
                  </div>
                  <div className="space-y-1 text-[11px] mb-3">
                    <div><b>Account:</b> {selectedAcct.number} ({selectedAcct.type})</div>
                    <div><b>Withdrawal Amount:</b> ₹ {Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                    <div><b>Method:</b> {method}</div>
                    <div><b>Remaining Balance:</b> ₹ {(selectedAcct.balance - Number(amount)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                  </div>
                  <label className="block text-[11px] font-bold mb-1">Enter OTP <span className="text-[#cc0000]">*</span></label>
                  <input type="text" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/, ""))}
                    className={`border ${otpError ? "border-[#cc0000]" : "border-gray-400"} text-[12px] px-2 py-1 w-40 tracking-widest font-bold`}
                    placeholder="_ _ _ _ _ _" />
                  {otpError && <div className="text-[#cc0000] text-[10px] mt-1">Invalid OTP. Please try again.</div>}
                  <div className="flex gap-2 mt-3">
                    <button className="btn-3d" onClick={() => { if (otp === "123456") setStep("success"); else setOtpError(true); }}>
                      Verify & Withdraw »
                    </button>
                    <button className="btn-3d-yellow" onClick={() => setOtpError(false)}>Resend OTP</button>
                    <button className="btn-3d" onClick={() => setStep("review")}>« Back</button>
                  </div>
                  <div className="text-[9px] text-gray-500 mt-2">Demo OTP: <b>123456</b></div>
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
                <div className="gov-panel-title">Review Withdrawal — Please verify before confirming</div>
                <div className="p-3">
                  <div className="bg-[#fff9c4] border border-[#f9a825] p-2 text-[11px] mb-3 flex items-start gap-2">
                    <AlertCircle size={12} className="text-[#cc0000] mt-0.5 shrink-0" />
                    Please verify the withdrawal details. An OTP will be sent to your registered mobile for confirmation.
                  </div>
                  <table className="gov-table mb-3 max-w-lg">
                    <tbody>
                      {[
                        ["Account Number", selectedAcct.number],
                        ["Account Type", selectedAcct.type],
                        ["Branch", selectedAcct.branch],
                        ["Available Balance", `₹ ${selectedAcct.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
                        ["Withdrawal Method", method],
                        ["Amount to Withdraw", `₹ ${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
                        ["Balance After Withdrawal", `₹ ${(selectedAcct.balance - Number(amount)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
                        ["Reason", reason],
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
            <div className="text-[10px] text-[#0033aa]">
              <a className="old-link">Home</a> » <a className="old-link">My Accounts</a> » <b>Withdraw Funds</b>
            </div>

            {/* Account Selection */}
            <div className="gov-panel">
              <div className="gov-panel-title text-[11px]">Select Account</div>
              <div className="p-2 space-y-1 text-[11px]">
                {accounts.map(a => (
                  <label key={a.id} className={`flex items-center gap-2 p-2 border cursor-pointer ${selAcct === a.id ? "border-[#1f4e9c] bg-[#e8f0fa]" : "border-gray-300 hover:bg-[#fdd835]"}`}>
                    <input type="radio" name="acct" checked={selAcct === a.id} onChange={() => setSelAcct(a.id)} />
                    <div className="flex-1">
                      <div className="font-bold">{a.number} — {a.type}</div>
                      <div className="text-[10px] text-gray-600">{a.branch}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] text-gray-500">Available Balance</div>
                      <div className="font-bold text-[#007a3d] text-[13px]">₹ {a.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Withdrawal Form */}
            <div className="gov-panel">
              <div className="gov-panel-title text-[11px]">Withdrawal Details</div>
              <div className="p-2 space-y-2 text-[11px]">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold mb-0.5">Withdrawal Method <span className="text-[#cc0000]">*</span></label>
                    <div className="flex gap-3 mt-0.5">
                      {["Cash", "ATM", "Bank Transfer"].map(m => (
                        <label key={m} className="flex items-center gap-1 cursor-pointer">
                          <input type="radio" name="wmethod" checked={method === m} onChange={() => { setMethod(m); setErrors({}); }} /> {m}
                        </label>
                      ))}
                    </div>
                    <div className="text-[9px] text-gray-500 mt-0.5">{limit.label}</div>
                  </div>
                  <div>
                    <label className="block font-bold mb-0.5">Withdrawal Amount (₹) <span className="text-[#cc0000]">*</span></label>
                    <input value={amount} onChange={e => setAmount(e.target.value)} placeholder={`Min ₹${limit.min} — Max ₹${limit.daily.toLocaleString("en-IN")}/day`}
                      className={`border ${errors.amount ? "border-[#cc0000]" : "border-gray-400"} text-[11px] px-1 py-0.5 w-full`} />
                    {errors.amount && <div className="text-[#cc0000] text-[10px]">⚠ {errors.amount}</div>}
                    {amount && !errors.amount && Number(amount) > 0 && (
                      <div className="text-[10px] text-[#007a3d] mt-0.5">
                        Balance after withdrawal: ₹ {(selectedAcct.balance - Number(amount)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block font-bold mb-0.5">Reason for Withdrawal <span className="text-[#cc0000]">*</span></label>
                  <select value={reason} onChange={e => setReason(e.target.value)} className="border border-gray-400 text-[11px] px-1 py-0.5 w-64">
                    {["Personal Use","Medical Emergency","Education","Business Expense","Travel","Rent Payment","Loan Payment","Others"].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>

                {/* Limit info */}
                <div className="bg-[#f4efe6] p-2 border border-gray-300 text-[10px] grid grid-cols-3 gap-2">
                  <div><b>Daily Limit ({method}):</b> ₹ {limit.daily.toLocaleString("en-IN")}</div>
                  <div><b>Min. Amount:</b> ₹ {limit.min}</div>
                  <div><b>Min. Balance Required:</b> ₹ 500</div>
                </div>

                {method === "ATM" && (
                  <div className="bg-[#fff9c4] border border-[#f9a825] p-1.5 text-[10px]">
                    <b>Note:</b> ATM withdrawals are limited to multiples of ₹100. First 4 transactions/month are free. Charges: ₹21 per additional transaction.
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button className="btn-3d-orange" onClick={() => { if (validate()) setStep("review"); }}>Review Withdrawal »</button>
              <button className="btn-3d" onClick={() => { setErrors({}); setAmount(""); }}>Reset</button>
            </div>

            <div className="text-[9px] text-gray-600 bg-[#fff9c4] border border-[#f9a825] p-1">
              <b>Security Note:</b> Cash withdrawals above ₹50,000 require valid photo ID proof at the branch counter as per KYC norms.
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
