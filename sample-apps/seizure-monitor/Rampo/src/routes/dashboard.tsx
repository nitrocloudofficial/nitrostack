import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { LogOut, User, Printer, Download, Bell, HelpCircle } from "lucide-react";
import { BankLayout } from "@/components/BankLayout";
import { useAuth, checkAuthSession } from "@/hooks/use-auth";
import { reportDashboardTab } from "@/lib/tracker";

const sideMenuLinks: Array<{ label: string; to?: string }> = [
  { label: "Account Summary" },
  { label: "Mini Statement" },
  { label: "Detailed Statement" },
  { label: "Balance Enquiry" },
  { label: "Cheque Book Request" },
  { label: "Stop Cheque" },
  { label: "Fund Transfer (NEFT/RTGS/IMPS)", to: "/transfer-domestic" },
  { label: "International Transfer (SWIFT)", to: "/transfer-international" },
  { label: "Deposit Funds", to: "/deposit" },
  { label: "Withdraw Funds", to: "/withdraw" },
  { label: "Credit Score", to: "/credit-score" },
  { label: "Add Beneficiary" },
  { label: "Standing Instr." },
  { label: "FD/RD Enquiry" },
  { label: "Loan Enquiry" },
  { label: "Tax Payments" },
  { label: "Bill Pay" },
  { label: "Profile Settings" },
  { label: "Change Password" },
  { label: "Grievances" },
];

export const Route = createFileRoute("/dashboard")({
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
      { title: "Account Dashboard — Rashtriya Bank of India Net Banking" },
      { name: "description", content: "View your account balance, mini statement, and manage your accounts, deposits, loans and cards." },
      { property: "og:title", content: "Account Dashboard — Rashtriya Bank of India" },
      { property: "og:description", content: "Net Banking account dashboard." },
    ],
  }),
  component: Dashboard,
});

const tabs = ["My Accounts","Deposits","Loans","Cards","Payments & Transfers","e-Services","Bill Pay","Requests","Mails","Profile"];

function Dashboard() {
  const [tab, setTab] = useState(0);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { reportDashboardTab(tabs[tab]); }, [tab]);

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const fullName = user?.user_metadata?.full_name || "MR. RAMESH KUMAR SHARMA";
  const cifNo = user?.user_metadata?.cif_number || "30014782291";

  return (
    <BankLayout>
      <div className="max-w-[1200px] mx-auto px-2 py-2 bg-white">
        {/* Welcome bar */}
        <div className="bg-gradient-to-r from-[#0d3b7f] to-[#3a6bb8] text-white px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User size={14} className="text-[#fdd835]"/>
            <span className="text-[12px]">Welcome, <b>{fullName}</b> (CIF: {cifNo})</span>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span>Last Login: 23-Jul-2026 09:14:22 from 103.42.xx.xx</span>
            <span className="text-[#fdd835]">|</span>
            <span>Session expires in: <b className="blink">04:52</b></span>
            <button onClick={handleLogout} className="btn-3d-orange flex items-center gap-1 cursor-pointer"><LogOut size={10}/> Logout</button>
          </div>
        </div>


        {/* Tabs */}
        <div className="flex border-b-2 border-[#0d3b7f] bg-[#ececec]">
          {tabs.map((t,i) => (
            <button key={t} onClick={()=>setTab(i)}
              data-flow={t.match(/loans/i) ? "loan_emi" : t.match(/cards/i) ? "card_manage" : undefined}
              className={`px-2.5 py-1 text-[11px] border-r border-gray-400 ${i===tab ? 'bg-white text-[#0d3b7f] font-bold border-t-2 border-t-[#cc0000]' : 'text-[#0033aa] hover:bg-[#fdd835]'}`}>
              {t}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1 px-2">
            <button className="btn-3d text-[10px]"><Printer size={9} className="inline"/> Print</button>
            <button className="btn-3d-yellow text-[10px]"><Download size={9} className="inline"/> Download</button>
            <button className="btn-3d text-[10px]"><HelpCircle size={9} className="inline"/> Help</button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-2 mt-2">
          {/* Left sidebar */}
          <aside className="col-span-2 space-y-2">
            <div className="gov-panel">
              <div className="gov-panel-title text-[11px]">My Menu</div>
              <ul className="text-[11px] bg-white">
                {sideMenuLinks.map(x => (
                  <li key={x.label} className="border-b border-dotted border-gray-300 hover:bg-[#fdd835]">
                    {x.to ? (
                      <Link to={x.to} className="block px-1.5 py-1 text-[#0033aa] font-bold">» {x.label}</Link>
                    ) : (
                      <a className="block px-1.5 py-1 text-[#0033aa]">» {x.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <main className="col-span-10 space-y-2">
            {/* Account summary */}
            <div className="gov-panel">
              <div className="gov-panel-title flex items-center justify-between">
                <span>Account Summary — as on 24-Jul-2026 11:47:03 IST</span>
                <div className="text-[10px]">
                  <a className="text-white underline">Refresh</a> | <a className="text-white underline">Customize View</a>
                </div>
              </div>
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>S.No</th><th>Account Number</th><th>Type</th><th>Branch (IFSC)</th><th>Nominee</th><th className="text-right">Balance (₹)</th><th>Available (₹)</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>1</td><td>30014782291001</td><td>Savings A/c</td><td>Connaught Place, ND (RBIN0001234)</td><td>Registered</td><td className="text-right">1,24,567.83</td><td className="text-right font-bold text-[#007a3d]">1,24,067.83</td><td><a className="old-link text-[10px]">View »</a></td></tr>
                  <tr><td>2</td><td>30014782291002</td><td>Savings A/c</td><td>Karol Bagh, ND (RBIN0001456)</td><td>Not Reg.</td><td className="text-right">47,890.00</td><td className="text-right font-bold text-[#007a3d]">47,890.00</td><td><a className="old-link text-[10px]">View »</a></td></tr>
                  <tr><td>3</td><td>FD/2024/778812</td><td>Fixed Deposit</td><td>Connaught Place, ND</td><td>Registered</td><td className="text-right">5,00,000.00</td><td className="text-right">5,32,450.00 (mat.)</td><td><a className="old-link text-[10px]">Details »</a></td></tr>
                  <tr><td>4</td><td>RD/2025/119003</td><td>Recurring Dep.</td><td>Connaught Place, ND</td><td>Registered</td><td className="text-right">36,000.00</td><td className="text-right">36,000.00</td><td><a className="old-link text-[10px]">Details »</a></td></tr>
                  <tr><td>5</td><td>HL/2022/00541127</td><td>Home Loan</td><td>Karol Bagh, ND</td><td>—</td><td className="text-right text-[#cc0000]">-27,84,332.00</td><td className="text-right text-[#cc0000]">EMI due 05-Aug</td><td><a className="old-link text-[10px]">Pay »</a></td></tr>
                  <tr className="bg-[#fff9c4] font-bold"><td colSpan={5} className="text-right">Total Deposits (Net):</td><td className="text-right">₹ 7,08,457.83</td><td colSpan={2}></td></tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Mini statement */}
              <div className="col-span-2 gov-panel">
                <div className="gov-panel-title flex items-center justify-between">
                  <span>Mini Statement — A/c: 30014782291001 (Last 10 Txns)</span>
                  <a className="text-white underline text-[10px]">Full Statement »</a>
                </div>
                <table className="gov-table">
                  <thead>
                    <tr><th>Date</th><th>Narration</th><th>Ref/Chq No.</th><th className="text-right">Debit (₹)</th><th className="text-right">Credit (₹)</th><th className="text-right">Balance (₹)</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>23/07/2026</td><td>UPI/PAYTM/9871XXXXXX/GROCERY</td><td>721820149922</td><td className="text-right text-[#cc0000]">1,247.00</td><td></td><td className="text-right">1,24,567.83</td></tr>
                    <tr><td>22/07/2026</td><td>NEFT-CR-HDFC0000123-SALARY JULY</td><td>N226220845112</td><td></td><td className="text-right text-[#007a3d]">78,500.00</td><td className="text-right">1,25,814.83</td></tr>
                    <tr><td>20/07/2026</td><td>ATM WDL/ATM12456/CP DELHI</td><td>ATM4478</td><td className="text-right text-[#cc0000]">10,000.00</td><td></td><td className="text-right">47,314.83</td></tr>
                    <tr><td>18/07/2026</td><td>IMPS-P2A/RAMESH SHARMA</td><td>IMPS1998714</td><td className="text-right text-[#cc0000]">5,000.00</td><td></td><td className="text-right">57,314.83</td></tr>
                    <tr><td>15/07/2026</td><td>ECS-DR-HDFC LIFE INSURANCE</td><td>ECS887431</td><td className="text-right text-[#cc0000]">2,890.00</td><td></td><td className="text-right">62,314.83</td></tr>
                    <tr><td>12/07/2026</td><td>BILLPAY/BSES DELHI/JUL BILL</td><td>BP7712344</td><td className="text-right text-[#cc0000]">1,876.00</td><td></td><td className="text-right">65,204.83</td></tr>
                    <tr><td>10/07/2026</td><td>INT.CR.HALFY 2026</td><td>SYS</td><td></td><td className="text-right text-[#007a3d]">834.00</td><td className="text-right">67,080.83</td></tr>
                    <tr><td>08/07/2026</td><td>UPI/PHONEPE/9812XXXX/PETROL</td><td>721880011245</td><td className="text-right text-[#cc0000]">2,500.00</td><td></td><td className="text-right">66,246.83</td></tr>
                    <tr><td>05/07/2026</td><td>EMI-HL/2022/00541127</td><td>SYS-EMI</td><td className="text-right text-[#cc0000]">32,450.00</td><td></td><td className="text-right">68,746.83</td></tr>
                    <tr><td>01/07/2026</td><td>NEFT-CR-HDFC0000123-SALARY JUN</td><td>N226010128993</td><td></td><td className="text-right text-[#007a3d]">78,500.00</td><td className="text-right">1,01,196.83</td></tr>
                  </tbody>
                </table>
                <div className="text-[9px] text-gray-600 p-1 border-t bg-[#f4efe6]">
                  * All amounts in Indian Rupees (₹). This is a system generated statement and does not require signature. For any discrepancy, contact home branch within 15 days.
                </div>
              </div>

              {/* Right panels */}
              <div className="space-y-2">
                <div className="gov-panel">
                  <div className="gov-panel-title text-[11px] flex items-center gap-1"><Bell size={10}/> Alerts &amp; Notices</div>
                  <ul className="p-1.5 text-[10px] bg-white space-y-1">
                    <li className="text-[#cc0000]"><b>● KYC Pending:</b> Update your KYC by 31/08/2026 to avoid account restriction. <a className="old-link">Update Now</a></li>
                    <li>● Your Home Loan EMI of ₹32,450 is due on 05-Aug-2026.</li>
                    <li>● FD/2024/778812 matures on 12-Sep-2026.</li>
                    <li>● Debit Card ending 4471 expires Dec-2026.</li>
                    <li>● New offer: Convert Credit Card txn &gt; ₹5000 into EMI.</li>
                  </ul>
                </div>
                <div className="gov-panel">
                  <div className="gov-panel-title text-[11px]">Quick Transfer</div>
                  <div className="p-2 bg-[#f4efe6] text-[10px] space-y-1">
                    <div>From: <select className="border border-gray-400 text-[10px] w-full"><option>30014782291001 (SB) - ₹1,24,067</option></select></div>
                    <div>To Payee: <select className="border border-gray-400 text-[10px] w-full"><option>-- Select Beneficiary --</option><option>SUNITA SHARMA (HDFC)</option><option>MOHAN LAL (SBI)</option></select></div>
                    <div>Amount (₹): <input className="border border-gray-400 text-[10px] w-full px-1"/></div>
                    <div>Mode: <label className="ml-1"><input type="radio" name="m"/> IMPS</label> <label className="ml-1"><input type="radio" name="m" defaultChecked/> NEFT</label> <label className="ml-1"><input type="radio" name="m"/> RTGS</label></div>
                    <button className="btn-3d w-full mt-1">Continue »</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Cards / loans table */}
            <div className="grid grid-cols-2 gap-2">
              <div className="gov-panel">
                <div className="gov-panel-title text-[11px]">My Cards</div>
                <table className="gov-table">
                  <thead><tr><th>Card No. (masked)</th><th>Type</th><th>Expiry</th><th>Status</th></tr></thead>
                  <tbody>
                    <tr><td>4471 XXXX XXXX 8823</td><td>Rupay Platinum Debit</td><td>12/26</td><td className="text-[#007a3d]">Active</td></tr>
                    <tr><td>5241 XXXX XXXX 1198</td><td>Visa Classic Credit</td><td>08/28</td><td className="text-[#007a3d]">Active</td></tr>
                    <tr><td>6521 XXXX XXXX 4409</td><td>Rupay Kisan Card</td><td>03/27</td><td>Hotlisted</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="gov-panel">
                <div className="gov-panel-title text-[11px]">Standing Instructions</div>
                <table className="gov-table">
                  <thead><tr><th>Description</th><th>Amount</th><th>Next Date</th><th>Status</th></tr></thead>
                  <tbody>
                    <tr><td>HDFC Life Premium</td><td>₹ 2,890</td><td>15/08/2026</td><td className="text-[#007a3d]">Active</td></tr>
                    <tr><td>SIP - Axis Bluechip Fund</td><td>₹ 5,000</td><td>05/08/2026</td><td className="text-[#007a3d]">Active</td></tr>
                    <tr><td>PPF Contribution</td><td>₹ 12,500</td><td>01/09/2026</td><td className="text-[#007a3d]">Active</td></tr>
                    <tr><td>RD Instalment</td><td>₹ 3,000</td><td>10/08/2026</td><td className="text-[#007a3d]">Active</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>

        <div className="mt-2 text-center text-[10px] text-gray-600 bg-[#fff9c4] border border-[#f9a825] p-1">
          <b>Security Note:</b> Please do not press the Back button of your browser. Use the navigation menu instead. Session will auto-expire after 5 minutes of inactivity.
        </div>
      </div>
    </BankLayout>
  );
}
