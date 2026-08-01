import { createFileRoute, redirect } from "@tanstack/react-router";
import { BankLayout } from "@/components/BankLayout";
import { Download, TrendingUp, TrendingDown, Star, AlertCircle, CheckCircle, Info } from "lucide-react";
import { useAuth, checkAuthSession } from "@/hooks/use-auth";

export const Route = createFileRoute("/credit-score")({
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
      { title: "Credit Score Dashboard — Rashtriya Bank of India" },
      { name: "description", content: "View your CIBIL credit score, credit health analysis, and AI-powered recommendations." },
    ],
  }),
  component: CreditScore,
});

const scoreHistory = [
  { month: "Jan'26", score: 712 }, { month: "Feb'26", score: 718 }, { month: "Mar'26", score: 724 },
  { month: "Apr'26", score: 720 }, { month: "May'26", score: 731 }, { month: "Jun'26", score: 738 },
  { month: "Jul'26", score: 742 },
];

const maxScore = 900;
const currentScore = 742;

const paymentHistory = [
  { account: "Home Loan (HL/2022/00541127)", months: 12, onTime: 12, late: 0, status: "Excellent" },
  { account: "Visa Classic Credit Card", months: 12, onTime: 11, late: 1, status: "Good" },
  { account: "RD/2025/119003", months: 12, onTime: 12, late: 0, status: "Excellent" },
];

const activeLoans = [
  { type: "Home Loan", outstanding: "₹ 27,84,332", emi: "₹ 32,450/mo", since: "Mar-2022", status: "Regular" },
];

const creditCards = [
  { card: "Visa Classic Credit", limit: "₹ 1,50,000", used: "₹ 42,500", utilization: 28, status: "Active" },
];

const enquiries = [
  { date: "15-Jun-2026", lender: "Bajaj Finance", type: "Personal Loan", result: "Declined" },
  { date: "10-Apr-2026", lender: "ICICI Bank", type: "Credit Card", result: "Approved" },
  { date: "22-Jan-2026", lender: "HDFC Bank", type: "Auto Loan Pre-approval", result: "Inquiry Only" },
];

const aiRecommendations = [
  { icon: "✓", color: "#007a3d", text: "Your payment history is excellent. Continue paying all EMIs on time to maintain your score." },
  { icon: "!", color: "#cc6600", text: "Reduce credit card utilization below 30% for optimal score. Current utilization: 28% — borderline." },
  { icon: "!", color: "#cc6600", text: "Avoid applying for multiple loans/cards simultaneously. 3 hard inquiries detected in 6 months." },
  { icon: "✓", color: "#007a3d", text: "Your credit mix (home loan + credit card) is healthy. Maintaining both improves your score." },
  { icon: "i", color: "#1f4e9c", text: "Dispute the single late payment on Credit Card (Feb-26) with the issuer if it was an error." },
  { icon: "i", color: "#1f4e9c", text: "Consider closing the rejected loan inquiry with Bajaj Finance to prevent further impact." },
];

function getRating(score: number) {
  if (score >= 750) return { label: "Excellent", color: "#007a3d" };
  if (score >= 700) return { label: "Good", color: "#2196F3" };
  if (score >= 650) return { label: "Fair", color: "#cc6600" };
  return { label: "Poor", color: "#cc0000" };
}

function ScoreGauge({ score }: { score: number }) {
  const pct = (score - 300) / (900 - 300);
  const angle = -135 + pct * 270;
  const rating = getRating(score);

  return (
    <div className="flex flex-col items-center py-2">
      <svg width="180" height="110" viewBox="0 0 180 110">
        {/* Background arc */}
        <path d="M 15 100 A 75 75 0 1 1 165 100" fill="none" stroke="#e0e0e0" strokeWidth="18" strokeLinecap="round" />
        {/* Poor */}
        <path d="M 15 100 A 75 75 0 0 1 52 28" fill="none" stroke="#cc0000" strokeWidth="18" strokeLinecap="round" />
        {/* Fair */}
        <path d="M 52 28 A 75 75 0 0 1 90 15" fill="none" stroke="#cc6600" strokeWidth="18" strokeLinecap="round" />
        {/* Good */}
        <path d="M 90 15 A 75 75 0 0 1 128 28" fill="none" stroke="#2196F3" strokeWidth="18" strokeLinecap="round" />
        {/* Excellent */}
        <path d="M 128 28 A 75 75 0 0 1 165 100" fill="none" stroke="#007a3d" strokeWidth="18" strokeLinecap="round" />
        {/* Needle */}
        <g transform={`rotate(${angle}, 90, 100)`}>
          <line x1="90" y1="100" x2="90" y2="30" stroke="#0d3b7f" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="90" cy="100" r="5" fill="#0d3b7f" />
        </g>
        {/* Score text */}
        <text x="90" y="88" textAnchor="middle" fontSize="24" fontWeight="bold" fill={rating.color}>{score}</text>
        <text x="90" y="100" textAnchor="middle" fontSize="9" fill="#666">out of 900</text>
      </svg>
      <div className="text-[13px] font-bold mt-1" style={{ color: rating.color }}>{rating.label}</div>
      <div className="text-[9px] text-gray-500">CIBIL Score — as on 25-Jul-2026</div>
      <div className="flex gap-3 mt-1 text-[9px]">
        {[["300–549","Poor","#cc0000"],["550–649","Fair","#cc6600"],["650–749","Good","#2196F3"],["750–900","Excellent","#007a3d"]].map(([r,l,c]) => (
          <div key={l} className="flex items-center gap-0.5">
            <span style={{background:c,width:8,height:8,display:"inline-block",borderRadius:1}}></span>
            <span style={{color:c}}>{r} {l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full bg-gray-200 h-2 rounded">
      <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: 2 }} />
    </div>
  );
}

function CreditScore() {
  const rating = getRating(currentScore);
  const minScore = Math.min(...scoreHistory.map(s => s.score));
  const maxChartScore = Math.max(...scoreHistory.map(s => s.score));
  const chartH = 60;
  const chartW = 260;
  const pts = scoreHistory.map((s, i) => {
    const x = (i / (scoreHistory.length - 1)) * chartW;
    const y = chartH - ((s.score - minScore + 10) / (maxChartScore - minScore + 20)) * chartH;
    return `${x},${y}`;
  }).join(" ");

  return (
    <BankLayout>
      <div className="max-w-[1200px] mx-auto px-2 py-2 bg-white">
        <DashHeader />
        <div className="grid grid-cols-12 gap-2 mt-2">
          <SideMenu />
          <main className="col-span-10 space-y-2">
            <div className="text-[10px] text-[#0033aa]">
              <a className="old-link">Home</a> » <a className="old-link">My Accounts</a> » <b>Credit Score Dashboard</b>
            </div>

            {/* Score + Trend */}
            <div className="grid grid-cols-3 gap-2">
              <div className="gov-panel">
                <div className="gov-panel-title text-[11px]">Your CIBIL Credit Score</div>
                <ScoreGauge score={currentScore} />
              </div>
              <div className="gov-panel">
                <div className="gov-panel-title text-[11px]">Credit Score Trend (Last 7 Months)</div>
                <div className="p-2">
                  <svg width={chartW} height={chartH + 20} viewBox={`0 0 ${chartW} ${chartH + 20}`}>
                    <polyline points={pts} fill="none" stroke="#1f4e9c" strokeWidth="2" />
                    {scoreHistory.map((s, i) => {
                      const x = (i / (scoreHistory.length - 1)) * chartW;
                      const y = chartH - ((s.score - minScore + 10) / (maxChartScore - minScore + 20)) * chartH;
                      return (
                        <g key={i}>
                          <circle cx={x} cy={y} r="3" fill="#0d3b7f" />
                          <text x={x} y={y - 5} fontSize="7" textAnchor="middle" fill="#333">{s.score}</text>
                          <text x={x} y={chartH + 15} fontSize="7" textAnchor="middle" fill="#666">{s.month}</text>
                        </g>
                      );
                    })}
                  </svg>
                  <div className="flex items-center gap-1 text-[10px] text-[#007a3d] mt-1">
                    <TrendingUp size={12} /> Score improved by +30 points in last 6 months
                  </div>
                </div>
              </div>
              <div className="gov-panel">
                <div className="gov-panel-title text-[11px]">Credit Health Summary</div>
                <div className="p-2 space-y-1.5 text-[11px]">
                  {[
                    { label: "Payment History", pct: 95, color: "#007a3d", detail: "95% On-time" },
                    { label: "Credit Utilization", pct: 28, color: "#2196F3", detail: "28% (Good)" },
                    { label: "Credit Age", pct: 70, color: "#1f4e9c", detail: "4.2 Years (Avg)" },
                    { label: "Credit Mix", pct: 80, color: "#cc6600", detail: "Loan + Card" },
                    { label: "New Inquiries", pct: 40, color: "#cc0000", detail: "3 in 6 months" },
                  ].map(f => (
                    <div key={f.label}>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span>{f.label}</span>
                        <span className="font-bold" style={{ color: f.color }}>{f.detail}</span>
                      </div>
                      <MiniBar pct={f.pct} color={f.color} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Payment History */}
            <div className="gov-panel">
              <div className="gov-panel-title text-[11px]">Payment History (Last 12 Months)</div>
              <table className="gov-table">
                <thead><tr><th>Account</th><th>Months Tracked</th><th>On-Time</th><th>Late / Missed</th><th>Status</th></tr></thead>
                <tbody>
                  {paymentHistory.map(p => (
                    <tr key={p.account}>
                      <td>{p.account}</td>
                      <td>{p.months}</td>
                      <td className="text-[#007a3d] font-bold">{p.onTime}</td>
                      <td className={p.late > 0 ? "text-[#cc0000] font-bold" : ""}>{p.late}</td>
                      <td><span className={`font-bold ${p.status === "Excellent" ? "text-[#007a3d]" : "text-[#cc6600]"}`}>{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Active Loans */}
              <div className="gov-panel">
                <div className="gov-panel-title text-[11px]">Active Loans</div>
                <table className="gov-table">
                  <thead><tr><th>Type</th><th>Outstanding</th><th>EMI</th><th>Since</th><th>Status</th></tr></thead>
                  <tbody>
                    {activeLoans.map(l => (
                      <tr key={l.type}>
                        <td>{l.type}</td><td>{l.outstanding}</td><td>{l.emi}</td><td>{l.since}</td>
                        <td className="text-[#007a3d] font-bold">{l.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Credit Cards */}
              <div className="gov-panel">
                <div className="gov-panel-title text-[11px]">Credit Cards</div>
                <table className="gov-table">
                  <thead><tr><th>Card</th><th>Limit</th><th>Used</th><th>Utilization</th><th>Status</th></tr></thead>
                  <tbody>
                    {creditCards.map(c => (
                      <tr key={c.card}>
                        <td>{c.card}</td><td>{c.limit}</td><td>{c.used}</td>
                        <td><span className={`font-bold ${c.utilization < 30 ? "text-[#007a3d]" : "text-[#cc0000]"}`}>{c.utilization}%</span></td>
                        <td className="text-[#007a3d] font-bold">{c.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Enquiries */}
            <div className="gov-panel">
              <div className="gov-panel-title text-[11px]">Recent Credit Enquiries</div>
              <table className="gov-table">
                <thead><tr><th>Date</th><th>Lender</th><th>Product Type</th><th>Result</th></tr></thead>
                <tbody>
                  {enquiries.map(e => (
                    <tr key={e.date + e.lender}>
                      <td>{e.date}</td><td>{e.lender}</td><td>{e.type}</td>
                      <td className={e.result === "Approved" ? "text-[#007a3d] font-bold" : e.result === "Declined" ? "text-[#cc0000] font-bold" : "text-gray-500"}>{e.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* AI Recommendations */}
            <div className="gov-panel">
              <div className="gov-panel-title text-[11px] flex items-center gap-1"><Star size={11} /> AI Recommendations to Improve Your Credit Score</div>
              <div className="p-2 space-y-1.5">
                {aiRecommendations.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] p-1.5 border border-gray-200 bg-white">
                    <span className="font-bold text-[12px] shrink-0 w-4" style={{ color: r.color }}>{r.icon}</span>
                    <span>{r.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Download */}
            <div className="flex items-center gap-2">
              <button className="btn-3d-yellow flex items-center gap-1"><Download size={10} /> Download Credit Report (PDF)</button>
              <div className="text-[10px] text-gray-600">Free credit report — as per RBI mandate. Next free report available: 25-Oct-2026</div>
            </div>

            <div className="text-[9px] text-gray-600 bg-[#fff9c4] border border-[#f9a825] p-1">
              <b>Disclaimer:</b> Credit score is sourced from CIBIL (TransUnion). Score displayed is indicative and may differ from the bureau's official record by up to 5 points due to reporting lag. This is not a credit report.
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
