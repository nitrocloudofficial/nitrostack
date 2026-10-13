import { Link } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import {
  Phone, Mail, Globe, ChevronDown, Lock, User, Search, Facebook, Twitter, Youtube,
  Printer, Accessibility, ZoomIn, ZoomOut, HelpCircle, FileText, Home, X, MessageCircle,
} from "lucide-react";

const megaMenus = [
  { label: "Personal Banking", items: ["Savings Account", "Current Account", "Salary Account", "Zero Balance Account", "Senior Citizen Account", "Minor Account", "NRI Services", "Demat Account", "PPF Account", "Sukanya Samriddhi"] },
  { label: "Corporate", items: ["Cash Management", "Trade Finance", "Working Capital", "Term Loans", "Corporate Salary", "Supply Chain Finance", "SME Loans", "Merchant Services"] },
  { label: "Loans", items: ["Home Loan", "Car Loan", "Education Loan", "Personal Loan", "Gold Loan", "Loan Against Property", "Two-Wheeler Loan", "Kisan Credit Card", "MSME Loans", "Mudra Loan"] },
  { label: "Cards", items: ["Debit Cards", "Credit Cards", "Prepaid Cards", "Contactless Cards", "Rupay Cards", "Business Cards", "Travel Cards", "EMV Chip Cards"] },
  { label: "Deposits", items: ["Fixed Deposit", "Recurring Deposit", "Tax Saver FD", "Flexi Deposit", "Senior Citizen FD", "NRE/NRO Deposits", "Capital Gains Account"] },
  { label: "Investments", items: ["Mutual Funds", "Insurance", "Government Bonds", "PMJJBY", "PMSBY", "APY", "NPS"] },
  { label: "e-Services", items: ["Net Banking", "Mobile Banking", "UPI", "IMPS", "NEFT/RTGS", "Bill Payments", "Recharges", "Tax Payment"] },
  { label: "Agri & Rural", items: ["Kisan Credit Card", "Crop Loan", "Farm Mechanization Loan", "Dairy Loan", "Poultry Loan", "SHG Linkage"] },
  { label: "Govt Schemes", items: ["PMJDY", "PMMY", "Stand-Up India", "Atal Pension Yojana", "Sovereign Gold Bond", "PMAY"] },
];

const footerCols = [
  { title: "About Us", items: ["Board of Directors", "Vision & Mission", "History", "Annual Report", "Investor Relations", "Awards & Recognition", "CSR", "Careers", "Tenders", "RTI"] },
  { title: "Customer Care", items: ["Contact Us", "Grievance Redressal", "Nodal Officers", "Banking Ombudsman", "Report Fraud", "Do Not Call Registry", "FAQ", "Feedback", "Complaint Status"] },
  { title: "Quick Links", items: ["Locate Branch", "Locate ATM", "IFSC/MICR Code", "Interest Rates", "Service Charges", "Forex Rates", "Forms & Downloads", "Notifications", "Circulars", "Tenders"] },
  { title: "Regulatory", items: ["Basel III Disclosures", "Pillar 3 Disclosures", "Fair Practice Code", "Citizens Charter", "Right to Information", "Policies", "Whistle Blower Policy", "KYC Norms", "AML Policy"] },
  { title: "Useful Links", items: ["RBI", "SEBI", "IRDAI", "Ministry of Finance", "Income Tax Dept", "GST Portal", "EPFO", "NSDL", "CDSL", "NPCI", "MyGov", "Digital India"] },
  { title: "Follow Us", items: ["Facebook", "Twitter", "YouTube", "Instagram", "LinkedIn", "Koo App", "RSS Feed", "SMS Alerts"] },
];

export function BankLayout({ children }: { children: ReactNode }) {
  const [nudge, setNudge] = useState<{ message: string } | null>(null);

  useEffect(() => {
    try {
      const bc = new BroadcastChannel("nitrostack-nudge");
      bc.onmessage = (event) => {
        if (event.data?.type === "nudge" && event.data?.message) {
          setNudge({ message: event.data.message });
        }
      };
      return () => bc.close();
    } catch { /* BroadcastChannel not supported */ }
  }, []);

  return (
    <div className="min-h-screen bg-[#e8e8e8]">
      {/* AI Nudge Overlay */}
      {nudge && (
        <div className="fixed bottom-6 right-6 z-[200] w-96 animate-in slide-in-from-bottom-4 fade-in duration-500">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-500 overflow-hidden" style={{ boxShadow: "0 20px 60px rgba(59,130,246,0.3)" }}>
            <div className="bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageCircle size={13} />
                </div>
                <span className="text-xs font-semibold">RBI Smart Assistant</span>
              </div>
              <button onClick={() => setNudge(null)} className="text-white/70 hover:text-white">
                <X size={14} />
              </button>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm text-gray-800 leading-relaxed">{nudge.message}</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setNudge(null)}
                  className="flex-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg transition-colors"
                >
                  Thanks, got it!
                </button>
                <button
                  onClick={() => setNudge(null)}
                  className="text-xs text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Utility bar */}
      <div className="bg-[#0d3b7f] text-white text-[10px]">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Phone size={9} /> Toll Free: 1800-11-2211</span>
            <span className="flex items-center gap-1"><Mail size={9} /> customercare@rbi-bank.co.in</span>
            <span className="text-yellow-300">|</span>
            <span>Missed Call Balance: 09223766666</span>
          </div>
          <div className="flex items-center gap-2">
            <a className="underline hover:text-yellow-300">Skip to Main Content</a>
            <span>|</span>
            <button className="flex items-center gap-0.5"><ZoomOut size={9} />A-</button>
            <button>A</button>
            <button className="flex items-center gap-0.5"><ZoomIn size={9} />A+</button>
            <span>|</span>
            <button className="bg-black text-white px-1">A</button>
            <button className="bg-white text-black px-1">A</button>
            <span>|</span>
            <select className="bg-white text-black text-[10px] px-0.5">
              <option>English</option><option>हिन्दी</option><option>বাংলা</option><option>தமிழ்</option>
              <option>తెలుగు</option><option>मराठी</option><option>ગુજરાતી</option><option>ਪੰਜਾਬੀ</option>
              <option>ಕನ್ನಡ</option><option>മലയാളം</option><option>ଓଡ଼ିଆ</option>
            </select>
            <Accessibility size={11} />
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white border-b-4 border-[#1f4e9c]">
        <div className="max-w-[1200px] mx-auto px-2 py-2 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-gradient-to-b from-[#3a6bb8] to-[#0d3b7f] border-4 border-[#fdd835] flex items-center justify-center text-white font-bold text-lg" style={{ fontFamily: 'Times New Roman, serif' }}>
              RBI
            </div>
            <div>
              <div className="text-[#1f4e9c] font-bold text-xl leading-none" style={{ fontFamily: 'Times New Roman, serif' }}>Rashtriya Bank of India</div>
              <div className="text-[#666] text-[10px] italic">राष्ट्रीय बैंक ऑफ़ इंडिया — <span className="text-[#cc0000] font-bold">The Nation Banks On Us</span> — Est. 1908</div>
              <div className="text-[9px] text-[#0d3b7f]">A Government of India Undertaking | Scheduled Commercial Bank | Regulated by RBI</div>
            </div>
          </Link>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1">
              <img alt="" src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_India.svg/120px-Emblem_of_India.svg.png" className="h-10 opacity-80" />
              <div className="text-[9px] text-right leading-tight">
                <div className="font-bold">Azadi Ka Amrit Mahotsav</div>
                <div className="text-[#666]">75 Years of Independence</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <input type="text" placeholder="Search this site..." className="border border-gray-400 text-[11px] px-1 py-0.5 w-40" />
              <button className="btn-3d"><Search size={10} /></button>
              <Link to="/login" className="btn-3d-orange flex items-center gap-1"><Lock size={10} />Net Banking Login</Link>
            </div>
            <div className="text-[9px] flex gap-2">
              <a className="old-link">Home</a>|<a className="old-link">Sitemap</a>|<a className="old-link">Contact</a>|<a className="old-link">Careers</a>|<a className="old-link">FAQ</a>|<a className="old-link">Feedback</a>|<a className="old-link">RTI</a>|<a className="old-link">Tenders</a>
            </div>
          </div>
        </div>

        {/* Mega nav */}
        <div className="bg-gradient-to-b from-[#3a6bb8] to-[#0d3b7f] border-t border-[#fdd835]">
          <div className="max-w-[1200px] mx-auto px-1 flex items-stretch">
            <Link to="/" className="text-white text-[11px] font-bold px-2 py-1.5 border-r border-[#0a2a5c] hover:bg-[#0a2a5c] flex items-center gap-1"><Home size={11} />HOME</Link>
            {megaMenus.map((m) => (
              <div key={m.label} className="group relative">
                <button className="text-white text-[11px] font-bold px-2 py-1.5 border-r border-[#0a2a5c] hover:bg-[#0a2a5c] flex items-center gap-0.5 uppercase h-full">
                  {m.label} <ChevronDown size={9} />
                </button>
                <div className="hidden group-hover:block absolute left-0 top-full bg-white border-2 border-[#0d3b7f] shadow-lg z-50 min-w-[220px]">
                  {m.items.map(i => (
                    <a key={i} className="block px-2 py-1 text-[11px] text-[#0033aa] hover:bg-[#fdd835] hover:text-black border-b border-dotted border-gray-300">» {i}</a>
                  ))}
                </div>
              </div>
            ))}
            <Link to="/branches" className="text-white text-[11px] font-bold px-2 py-1.5 border-r border-[#0a2a5c] hover:bg-[#0a2a5c] flex items-center">LOCATE US</Link>
          </div>
        </div>
      </div>

      {/* Marquee */}
      <div className="bg-[#fdd835] border-y-2 border-[#cc0000] flex items-center">
        <div className="bg-[#cc0000] text-white text-[11px] font-bold px-2 py-1 flex items-center gap-1 shrink-0">
          <span className="blink">●</span> LATEST ANNOUNCEMENTS:
        </div>
        <div className="overflow-hidden flex-1 py-1">
          <div className="marquee-track text-[11px] text-[#0d3b7f] font-bold">
            ★ Revised Interest Rates on Fixed Deposits w.e.f. 01/07/2026 — Senior Citizens get additional 0.50% ★★★ Beware of Phishing! Bank NEVER asks for OTP/PIN/CVV over phone or SMS ★★★ New IMPS charges applicable from 15/07/2026 ★★★ Download our Mobile App "YONA" from Play Store & App Store ★★★ Kisan Credit Card interest subvention scheme extended till March 2027 ★★★ Branches will remain closed on 2nd &amp; 4th Saturdays ★★★ e-Auction of NPA properties on 30/07/2026 — Visit auctions page ★★★ Update your KYC to avoid account freeze ★
          </div>
        </div>
      </div>

      {children}

      {/* Footer */}
      <div className="bg-[#0d3b7f] text-white mt-4">
        <div className="max-w-[1200px] mx-auto px-3 py-4 grid grid-cols-6 gap-3">
          {footerCols.map(col => (
            <div key={col.title}>
              <div className="text-[11px] font-bold text-[#fdd835] border-b border-[#fdd835] mb-1 pb-0.5" style={{ fontFamily: 'Times New Roman, serif' }}>{col.title}</div>
              <ul className="space-y-0.5">
                {col.items.map(i => <li key={i}><a className="text-[10px] text-gray-300 hover:text-white hover:underline">» {i}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-[#3a6bb8] bg-[#0a2a5c]">
          <div className="max-w-[1200px] mx-auto px-3 py-2 flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-2">
              <Facebook size={11} /><Twitter size={11} /><Youtube size={11} />
              <span>|</span>
              <Printer size={11} /> Print this page
              <span>|</span>
              <HelpCircle size={11} /> Help
              <span>|</span>
              <FileText size={11} /> Disclaimer
              <span>|</span>
              <Globe size={11} /> Privacy Policy
            </div>
            <div className="text-gray-300">
              Site best viewed in Internet Explorer 8+, Mozilla Firefox 3+, Google Chrome 10+ at 1024x768 resolution
            </div>
          </div>
          <div className="text-center text-[10px] text-gray-400 py-1 border-t border-[#1f4e9c]">
            © 2008-2026 Rashtriya Bank of India. All Rights Reserved. | Last Updated: 24/07/2026 14:32 IST | Visitor Count: 3,45,67,821
          </div>
        </div>
      </div>
    </div>
  );
}

export function ServiceIcon({ Icon, label }: { Icon: React.ComponentType<{ size?: number }>, label: string }) {
  return (
    <a className="flex flex-col items-center gap-0.5 p-1 border border-gray-300 bg-white hover:bg-[#fdd835] hover:border-[#0d3b7f] cursor-pointer text-center min-h-[60px] justify-center">
      <div className="w-8 h-8 bg-gradient-to-b from-[#3a6bb8] to-[#0d3b7f] rounded flex items-center justify-center text-white border border-[#0a2a5c]" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)' }}>
        <Icon size={16} />
      </div>
      <div className="text-[9px] font-bold text-[#0d3b7f] leading-tight">{label}</div>
    </a>
  );
}
