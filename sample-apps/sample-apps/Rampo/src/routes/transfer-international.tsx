import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { BankLayout } from "@/components/BankLayout";
import { ArrowRight, CheckCircle, AlertCircle, Info, Shield, Printer, Download, Globe } from "lucide-react";
import { useAuth, checkAuthSession } from "@/hooks/use-auth";
import { reportFormFailure } from "@/lib/tracker";

export const Route = createFileRoute("/transfer-international")({
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
      { title: "International Wire Transfer (SWIFT) — Rashtriya Bank of India" },
      { name: "description", content: "Send money abroad via SWIFT wire transfer." },
    ],
  }),
  component: InternationalTransfer,
});

type Step = "form" | "review" | "otp" | "success";

const countries = ["United States","United Kingdom","Canada","Australia","Germany","France","Singapore","UAE","Saudi Arabia","Japan","China","Netherlands","Switzerland","Hong Kong","New Zealand"];
const currencies = ["USD - US Dollar","GBP - British Pound","EUR - Euro","AUD - Australian Dollar","CAD - Canadian Dollar","SGD - Singapore Dollar","AED - UAE Dirham","JPY - Japanese Yen","CHF - Swiss Franc"];

const swiftInfo: Record<string, { bank: string; valid: boolean; country: string }> = {
  CITIUS33: { bank: "Citibank N.A., New York", valid: true, country: "United States" },
  BARCGB22: { bank: "Barclays Bank PLC, London", valid: true, country: "United Kingdom" },
  DEUTDEDB: { bank: "Deutsche Bank AG, Frankfurt", valid: true, country: "Germany" },
  OCBCSGSG: { bank: "OCBC Bank, Singapore", valid: true, country: "Singapore" },
  ADCBAEAA: { bank: "Abu Dhabi Commercial Bank, Dubai", valid: true, country: "UAE" },
};

const fxRates: Record<string, number> = {
  "USD - US Dollar": 83.42, "GBP - British Pound": 105.18, "EUR - Euro": 90.64,
  "AUD - Australian Dollar": 54.23, "CAD - Canadian Dollar": 61.87,
  "SGD - Singapore Dollar": 61.92, "AED - UAE Dirham": 22.71,
  "JPY - Japanese Yen": 0.5541, "CHF - Swiss Franc": 93.15,
};

function InternationalTransfer() {
  const [step, setStep] = useState<Step>("form");
  const [swift, setSwift] = useState("");
  const [swiftStatus, setSwiftStatus] = useState<null | { bank: string; valid: boolean; country: string }>(null);
  const [recipientName, setRecipientName] = useState("");
  const [bankName, setBankName] = useState("");
  const [iban, setIban] = useState("");
  const [country, setCountry] = useState("");
  const [bankAddress, setBankAddress] = useState("");
  const [currency, setCurrency] = useState("USD - US Dollar");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("Family Remittance");
  const [charges, setCharges] = useState("SHA");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fxRate = fxRates[currency] || 83.42;
  const inrAmount = amount ? (Number(amount) * fxRate).toFixed(2) : "0.00";
  const currCode = currency.split(" - ")[0];

  const handleSwiftChange = (val: string) => {
    const upper = val.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setSwift(upper);
    if (swiftInfo[upper]) {
      setSwiftStatus(swiftInfo[upper]);
      setBankName(swiftInfo[upper].bank);
      setCountry(swiftInfo[upper].country);
    } else {
      setSwiftStatus(null);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!recipientName.trim()) errs.recipientName = "Recipient name is required.";
    if (!swift || swift.length < 8) errs.swift = "Valid 8 or 11 character SWIFT/BIC code required.";
    if (!iban.trim()) errs.iban = "IBAN / Account number is required.";
    if (!country) errs.country = "Select recipient country.";
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) errs.amount = "Enter a valid amount.";
    if (Number(inrAmount) > 124067.83) errs.amount = "Equivalent INR amount exceeds available balance.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      reportFormFailure("swift_wire", "review", errs);
    }
    return Object.keys(errs).length === 0;
  };

  const txnRef = "RBIN/SWIFT/" + Date.now().toString().slice(-8);

  const amlRisk = Number(amount) > 5000 ? "Medium" : "Low";
  const fraudRisk = Number(amount) > 10000 ? "Medium" : "Low";
  const deliveryDays = currency.includes("USD") ? "1–2" : currency.includes("GBP") ? "1–3" : "2–5";

  if (step === "success") {
    return (
      <BankLayout>
        <div className="max-w-[1200px] mx-auto px-2 py-2 bg-white">
          <DashHeader />
          <div className="grid grid-cols-12 gap-2 mt-2">
            <SideMenu />
            <main className="col-span-10">
              <div className="gov-panel">
                <div className="gov-panel-title flex items-center gap-2"><CheckCircle size={14} /> International Transfer — Transaction Successful</div>
                <div className="p-4 bg-[#e8f5e9] border-b border-[#007a3d] text-center">
                  <CheckCircle size={32} className="text-[#007a3d] mx-auto mb-2" />
                  <div className="text-[14px] font-bold text-[#007a3d]">SWIFT Transfer Initiated Successfully!</div>
                  <div className="text-[11px] text-gray-600 mt-1">Your transfer is under compliance review. Funds will be remitted upon clearance.</div>
                </div>
                <div className="p-3">
                  <div className="gov-panel mb-3">
                    <div className="gov-panel-title text-[11px]">Transfer Receipt</div>
                    <table className="gov-table">
                      <tbody>
                        {[
                          ["Transaction Reference", txnRef],
                          ["Date & Time", "25-Jul-2026  " + new Date().toLocaleTimeString()],
                          ["Sender Account", "30014782291001 (SB) — Connaught Place, ND"],
                          ["Recipient Name", recipientName],
                          ["Recipient Bank", bankName],
                          ["SWIFT/BIC Code", swift],
                          ["IBAN / Account", iban],
                          ["Recipient Country", country],
                          ["Currency", currCode],
                          ["Amount", `${currCode} ${Number(amount).toLocaleString()}`],
                          ["Exchange Rate", `1 ${currCode} = ₹ ${fxRate}`],
                          ["INR Equivalent", `₹ ${Number(inrAmount).toLocaleString("en-IN")}`],
                          ["Charge Type", charges],
                          ["Purpose", purpose],
                          ["Estimated Delivery", `${deliveryDays} Business Days`],
                          ["Status", "INITIATED — Pending Compliance Clearance"],
                        ].map(([k, v]) => (
                          <tr key={k}><td className="font-bold w-52">{k}</td><td className={v?.toString().startsWith("INITIATED") ? "text-[#cc6600] font-bold" : ""}>{v}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-3d flex items-center gap-1"><Printer size={10} /> Print Receipt</button>
                    <button className="btn-3d-yellow flex items-center gap-1"><Download size={10} /> Download PDF</button>
                    <button className="btn-3d-orange" onClick={() => { setStep("form"); setSwift(""); setSwiftStatus(null); setRecipientName(""); setAmount(""); setIban(""); }}>New Transfer</button>
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
                <div className="gov-panel-title">OTP Verification — International Wire Transfer</div>
                <div className="p-4 max-w-md">
                  <div className="bg-[#fff9c4] border border-[#f9a825] p-2 text-[11px] mb-3">
                    OTP sent to +91-98XXXXXX71. Valid for 10 minutes.
                  </div>
                  <div className="space-y-1 text-[11px] mb-3">
                    <div><b>Amount:</b> {currCode} {amount} (≈ ₹ {Number(inrAmount).toLocaleString("en-IN")})</div>
                    <div><b>To:</b> {recipientName} — {bankName}</div>
                    <div><b>Country:</b> {country}</div>
                  </div>
                  <label className="block text-[11px] font-bold mb-1">Enter OTP <span className="text-[#cc0000]">*</span></label>
                  <input type="text" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/, ""))}
                    className={`border ${otpError ? "border-[#cc0000]" : "border-gray-400"} text-[12px] px-2 py-1 w-40 tracking-widest font-bold`} placeholder="_ _ _ _ _ _" />
                  {otpError && <div className="text-[#cc0000] text-[10px] mt-1">Invalid OTP.</div>}
                  <div className="flex gap-2 mt-3">
                    <button className="btn-3d" onClick={() => { if (otp === "123456") setStep("success"); else { setOtpError(true); reportFormFailure("swift_wire", "otp", ["otp"], { field: "otp" }); } }}>Verify & Transfer »</button>
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
            <main className="col-span-10 space-y-2">
              <div className="gov-panel">
                <div className="gov-panel-title">Review International Transfer</div>
                <div className="p-3">
                  <div className="bg-[#fff9c4] border border-[#f9a825] p-2 text-[11px] mb-3 flex gap-2">
                    <AlertCircle size={12} className="text-[#cc0000] mt-0.5 shrink-0" />
                    International wire transfers are subject to FEMA regulations and compliance checks. Processing may take {deliveryDays} business days.
                  </div>
                  <table className="gov-table mb-3">
                    <tbody>
                      {[
                        ["Sender Account", "30014782291001 (SB)"],
                        ["Recipient Name", recipientName],
                        ["Bank / SWIFT", `${bankName} / ${swift}`],
                        ["IBAN / Account", iban],
                        ["Country", country],
                        ["Currency", currCode],
                        ["Amount", `${currCode} ${Number(amount).toLocaleString()}`],
                        ["Exchange Rate (indicative)", `1 ${currCode} = ₹ ${fxRate}`],
                        ["INR Equivalent", `₹ ${Number(inrAmount).toLocaleString("en-IN")}`],
                        ["Charge Option", charges === "OUR" ? "OUR — All charges borne by sender" : charges === "SHA" ? "SHA — Charges shared" : "BEN — All charges borne by beneficiary"],
                        ["Purpose", purpose],
                        ["Estimated Delivery", `${deliveryDays} Business Days`],
                      ].map(([k, v]) => (<tr key={k}><td className="font-bold w-52">{k}</td><td>{v}</td></tr>))}
                    </tbody>
                  </table>
                  <div className="flex gap-2">
                    <button className="btn-3d-orange" onClick={() => setStep("otp")}>Confirm & Get OTP »</button>
                    <button className="btn-3d" onClick={() => setStep("form")}>« Edit</button>
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
              <a className="old-link">Home</a> » <a className="old-link">Payments & Transfers</a> » <b>International Wire Transfer (SWIFT)</b>
            </div>

            {/* Sender */}
            <div className="gov-panel">
              <div className="gov-panel-title text-[11px]">Sender Account</div>
              <div className="p-2 grid grid-cols-4 gap-2 text-[11px] bg-[#f4efe6]">
                <div><div className="text-[9px] text-gray-600 uppercase font-bold">Account</div><div className="font-bold">30014782291001</div></div>
                <div><div className="text-[9px] text-gray-600 uppercase font-bold">Type</div><div>Savings Account</div></div>
                <div><div className="text-[9px] text-gray-600 uppercase font-bold">IFSC</div><div>RBIN0001234</div></div>
                <div><div className="text-[9px] text-gray-600 uppercase font-bold">Available Balance</div><div className="font-bold text-[#007a3d] text-[13px]">₹ 1,24,067.83</div></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Main form */}
              <div className="col-span-2 space-y-2">
                <div className="gov-panel">
                  <div className="gov-panel-title text-[11px]">Recipient & Bank Details</div>
                  <div className="p-2 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <label className="block font-bold mb-0.5">Recipient Name <span className="text-[#cc0000]">*</span></label>
                      <input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Full name as per bank records"
                        className={`border ${errors.recipientName ? "border-[#cc0000]" : "border-gray-400"} text-[11px] px-1 py-0.5 w-full`} />
                      {errors.recipientName && <div className="text-[#cc0000] text-[10px]">⚠ {errors.recipientName}</div>}
                    </div>
                    <div>
                      <label className="block font-bold mb-0.5">SWIFT / BIC Code <span className="text-[#cc0000]">*</span></label>
                      <input value={swift} onChange={e => handleSwiftChange(e.target.value)} maxLength={11} placeholder="e.g. CITIUS33"
                        className={`border ${errors.swift ? "border-[#cc0000]" : "border-gray-400"} text-[11px] px-1 py-0.5 w-full uppercase`} />
                      {errors.swift && <div className="text-[#cc0000] text-[10px]">⚠ {errors.swift}</div>}
                      {swiftStatus && (
                        <div className="text-[10px] text-[#007a3d] mt-0.5 flex items-center gap-1">
                          <CheckCircle size={10} /> {swiftStatus.bank}
                        </div>
                      )}
                      {!swiftStatus && swift.length >= 8 && !errors.swift && (
                        <div className="text-[10px] text-[#cc0000] mt-0.5 flex items-center gap-1">
                          <AlertCircle size={10} /> Unknown SWIFT/BIC — verify with recipient
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block font-bold mb-0.5">Bank Name</label>
                      <input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Auto-detected or enter manually"
                        className="border border-gray-300 text-[11px] px-1 py-0.5 w-full bg-[#f4efe6]" />
                    </div>
                    <div>
                      <label className="block font-bold mb-0.5">IBAN / Account Number <span className="text-[#cc0000]">*</span></label>
                      <input value={iban} onChange={e => setIban(e.target.value.toUpperCase())} placeholder="e.g. GB29NWBK60161331926819"
                        className={`border ${errors.iban ? "border-[#cc0000]" : "border-gray-400"} text-[11px] px-1 py-0.5 w-full`} />
                      {errors.iban && <div className="text-[#cc0000] text-[10px]">⚠ {errors.iban}</div>}
                    </div>
                    <div>
                      <label className="block font-bold mb-0.5">Recipient Country <span className="text-[#cc0000]">*</span></label>
                      <select value={country} onChange={e => setCountry(e.target.value)}
                        className={`border ${errors.country ? "border-[#cc0000]" : "border-gray-400"} text-[11px] px-1 py-0.5 w-full`}>
                        <option value="">-- Select Country --</option>
                        {countries.map(c => <option key={c}>{c}</option>)}
                      </select>
                      {errors.country && <div className="text-[#cc0000] text-[10px]">⚠ {errors.country}</div>}
                    </div>
                    <div>
                      <label className="block font-bold mb-0.5">Bank Address</label>
                      <input value={bankAddress} onChange={e => setBankAddress(e.target.value)} placeholder="Bank address (optional)"
                        className="border border-gray-400 text-[11px] px-1 py-0.5 w-full" />
                    </div>
                  </div>
                </div>

                <div className="gov-panel">
                  <div className="gov-panel-title text-[11px]">Transfer Details</div>
                  <div className="p-2 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <label className="block font-bold mb-0.5">Currency <span className="text-[#cc0000]">*</span></label>
                      <select value={currency} onChange={e => setCurrency(e.target.value)} className="border border-gray-400 text-[11px] px-1 py-0.5 w-full">
                        {currencies.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold mb-0.5">Amount ({currCode}) <span className="text-[#cc0000]">*</span></label>
                      <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount in foreign currency"
                        className={`border ${errors.amount ? "border-[#cc0000]" : "border-gray-400"} text-[11px] px-1 py-0.5 w-full`} />
                      {errors.amount && <div className="text-[#cc0000] text-[10px]">⚠ {errors.amount}</div>}
                      {amount && (
                        <div className="text-[10px] text-[#0033aa] mt-0.5">
                          ≈ ₹ {Number(inrAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })} @ {fxRate}/{ currCode}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block font-bold mb-0.5">Purpose <span className="text-[#cc0000]">*</span></label>
                      <select value={purpose} onChange={e => setPurpose(e.target.value)} className="border border-gray-400 text-[11px] px-1 py-0.5 w-full">
                        {["Family Remittance","Education Fees","Medical Treatment","Business Payment","Import of Goods","Software Services","Travel","Investment"].map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold mb-0.5">Charges (OUR/SHA/BEN)</label>
                      <select value={charges} onChange={e => setCharges(e.target.value)} className="border border-gray-400 text-[11px] px-1 py-0.5 w-full">
                        <option value="OUR">OUR — Sender bears all charges</option>
                        <option value="SHA">SHA — Charges shared</option>
                        <option value="BEN">BEN — Beneficiary bears all charges</option>
                      </select>
                    </div>
                  </div>
                  <div className="bg-[#f4efe6] p-2 text-[11px] grid grid-cols-2 border-t border-gray-300">
                    <div><span className="font-bold">Estimated Arrival:</span> {deliveryDays} Business Days</div>
                    <div><span className="font-bold">FX Rate (indicative):</span> 1 {currCode} = ₹ {fxRate}</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="btn-3d-orange flex items-center gap-1" onClick={() => { if (validate()) setStep("review"); }}>
                    Review Transfer <ArrowRight size={10} />
                  </button>
                  <button className="btn-3d" onClick={() => { setErrors({}); setAmount(""); setSwift(""); setSwiftStatus(null); setRecipientName(""); setIban(""); }}>Reset</button>
                </div>
              </div>

              {/* AI Advisor Panel */}
              <div className="space-y-2">
                <div className="gov-panel">
                  <div className="gov-panel-title text-[11px] flex items-center gap-1"><Shield size={11} /> AI Transaction Advisor</div>
                  <div className="p-2 space-y-2 text-[11px]">
                    <AdvisorRow label="SWIFT Validation" status={swift.length >= 8 ? (swiftStatus ? "valid" : "warn") : "idle"} value={swift.length >= 8 ? (swiftStatus ? "Valid ✓" : "Not in database") : "Enter SWIFT code"} />
                    <AdvisorRow label="Compliance Status" status={country ? "valid" : "idle"} value={country ? "FEMA Compliant ✓" : "Pending"} />
                    <AdvisorRow label="AML Check" status={amlRisk === "Low" ? "valid" : "warn"} value={`Risk: ${amlRisk}`} />
                    <AdvisorRow label="Fraud Risk Score" status={fraudRisk === "Low" ? "valid" : "warn"} value={`${fraudRisk} Risk`} />
                    <AdvisorRow label="Est. Delivery" status="info" value={`${deliveryDays} Business Days`} />
                    <AdvisorRow label="FX Rate" status="info" value={`1 ${currCode} = ₹ ${fxRate}`} />
                    <div className="border-t pt-1 text-[9px] text-gray-500">
                      <Globe size={9} className="inline mr-1" />
                      AI advisor provides indicative information. Rates subject to change at transaction time.
                    </div>
                  </div>
                </div>
                <div className="gov-panel">
                  <div className="gov-panel-title text-[11px] flex items-center gap-1"><Info size={11} /> FEMA / RBI Guidelines</div>
                  <ul className="p-2 text-[10px] space-y-1 bg-white text-[#0d3b7f]">
                    <li>• LRS limit: USD 2,50,000 per FY</li>
                    <li>• PAN mandatory for remittances &gt; ₹50,000</li>
                    <li>• Form A2 required for all outward remittances</li>
                    <li>• TCS of 20% applicable on LRS above ₹7 lakh</li>
                    <li>• Keep purpose code as per RBI guidelines</li>
                  </ul>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </BankLayout>
  );
}

function AdvisorRow({ label, status, value }: { label: string; status: "valid" | "warn" | "idle" | "info"; value: string }) {
  const color = status === "valid" ? "#007a3d" : status === "warn" ? "#cc6600" : status === "info" ? "#1f4e9c" : "#999";
  return (
    <div className="flex items-center justify-between border-b border-dotted border-gray-200 pb-1">
      <span className="text-gray-700">{label}</span>
      <span className="font-bold" style={{ color }}>{value}</span>
    </div>
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
