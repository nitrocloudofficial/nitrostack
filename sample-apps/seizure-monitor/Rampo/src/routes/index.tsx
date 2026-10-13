import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  CreditCard, Smartphone, Wallet, Home, Car, GraduationCap, Landmark, PiggyBank,
  Receipt, MapPin, Users, Tractor, Building2, HandCoins, ShieldCheck, TrendingUp,
  FileText, BadgePercent, Umbrella, Coins, X, ChevronRight, AlertTriangle, Award,
  Banknote, Calculator, Globe2, Percent
} from "lucide-react";
import { BankLayout, ServiceIcon } from "@/components/BankLayout";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rashtriya Bank of India — Official Website | Personal & Corporate Banking" },
      { name: "description", content: "Rashtriya Bank of India — A Government of India Undertaking. Personal banking, loans, deposits, net banking, and financial inclusion services since 1908." },
      { property: "og:title", content: "Rashtriya Bank of India — Official Website" },
      { property: "og:description", content: "Personal & Corporate banking services. Net Banking, Loans, Fixed Deposits, Debit/Credit Cards." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

const carouselSlides = [
  { title: "Empowering Farmers, Enriching India", subtitle: "Kisan Credit Card @ 4% Interest*", bg: "linear-gradient(135deg,#2d5f2d,#5a9a3a)", emoji: "🌾" },
  { title: "Ghar Ki Chaabi, Sapno Ki Udaan", subtitle: "Home Loans starting @ 8.40% p.a.*", bg: "linear-gradient(135deg,#8b4513,#d2691e)", emoji: "🏠" },
  { title: "Vidya Lakshmi Education Loan", subtitle: "Up to ₹1.50 Crore for Higher Studies", bg: "linear-gradient(135deg,#4a148c,#7b1fa2)", emoji: "🎓" },
  { title: "Beti Bachao, Beti Padhao", subtitle: "Sukanya Samriddhi Yojana @ 8.20%", bg: "linear-gradient(135deg,#c2185b,#e91e63)", emoji: "👧" },
];

function Index() {
  const [slide, setSlide] = useState(0);
  const [popup, setPopup] = useState(true);
  const [popup2, setPopup2] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % carouselSlides.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <BankLayout>
      <div className="max-w-[1200px] mx-auto px-2 py-2 bg-white">
        <div className="grid grid-cols-12 gap-2">
          {/* Left sidebar */}
          <aside className="col-span-2 space-y-2">
            <div className="gov-panel">
              <div className="gov-panel-title">Quick Links</div>
              <ul className="text-[11px] p-1 space-y-0.5">
                {["Interest Rates","Service Charges","Forex Rates","IFSC Codes","Forms Center","Downloads","EMI Calculator","Loan Calculator","FD Calculator","Notifications","Circulars","Tenders","Auctions","Careers","Media Room"].map(x=>(
                  <li key={x} className="border-b border-dotted border-gray-300 pb-0.5"><a className="old-link">» {x}</a></li>
                ))}
              </ul>
            </div>
            <div className="gov-panel">
              <div className="gov-panel-title">Govt. Schemes</div>
              <ul className="text-[11px] p-1 space-y-0.5">
                {["PM Jan Dhan Yojana","PM Mudra Yojana","PM Awas Yojana","PM Fasal Bima","Atal Pension","Stand-Up India","Sukanya Samriddhi","PMJJBY","PMSBY"].map(x=>(
                  <li key={x}><a className="old-link">» {x}</a></li>
                ))}
              </ul>
            </div>
            <div className="thin-panel p-1 text-center">
              <img alt="digital india" src="https://www.digitalindia.gov.in/wp-content/themes/digitalindia/assets/images/digital-india-logo.png" className="mx-auto h-10" onError={(e:any)=>e.target.style.display='none'}/>
              <div className="text-[9px] text-[#0d3b7f] font-bold mt-1">Digital India Initiative</div>
            </div>
          </aside>

          {/* Center */}
          <main className="col-span-7 space-y-2">
            {/* Carousel */}
            <div className="border-2 border-[#1f4e9c] relative overflow-hidden" style={{height:220}}>
              <div className="w-full h-full flex items-center justify-center text-white p-4 relative" style={{background: carouselSlides[slide].bg}}>
                <div className="text-[100px] absolute left-6 opacity-90">{carouselSlides[slide].emoji}</div>
                <div className="text-center">
                  <div className="text-3xl font-bold" style={{fontFamily:'Times New Roman, serif', textShadow:'2px 2px 4px rgba(0,0,0,0.5)'}}>{carouselSlides[slide].title}</div>
                  <div className="text-lg mt-2 italic">{carouselSlides[slide].subtitle}</div>
                  <button className="btn-3d-yellow mt-3">Apply Online Now »</button>
                </div>
                <div className="absolute bottom-1 right-2 text-[9px] bg-black/50 px-1">*T&C Apply</div>
              </div>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {carouselSlides.map((_,i)=>(
                  <button key={i} onClick={()=>setSlide(i)} className={`w-3 h-3 border border-white ${i===slide?'bg-[#fdd835]':'bg-white/50'}`}/>
                ))}
              </div>
            </div>

            {/* Service icons grid */}
            <div className="gov-panel">
              <div className="gov-panel-title flex items-center justify-between">
                <span>Our Services — At Your Fingertips</span>
                <a className="text-[10px] text-white underline">View All »</a>
              </div>
              <div className="grid grid-cols-8 gap-0.5 p-1 bg-[#ececec]">
                {[
                  {Icon: Landmark, label:"Net Banking"},
                  {Icon: Smartphone, label:"YONA App"},
                  {Icon: Home, label:"Home Loan"},
                  {Icon: Car, label:"Car Loan"},
                  {Icon: GraduationCap, label:"Edu Loan"},
                  {Icon: CreditCard, label:"Credit Card"},
                  {Icon: Wallet, label:"Debit Card"},
                  {Icon: PiggyBank, label:"Fixed Dep."},
                  {Icon: Tractor, label:"Kisan KCC"},
                  {Icon: MapPin, label:"Locate Br."},
                  {Icon: Building2, label:"ATM Finder"},
                  {Icon: HandCoins, label:"Gold Loan"},
                  {Icon: Users, label:"NRI Serv."},
                  {Icon: ShieldCheck, label:"Insurance"},
                  {Icon: TrendingUp, label:"Mutual Fund"},
                  {Icon: Receipt, label:"Bill Pay"},
                  {Icon: FileText, label:"e-Statement"},
                  {Icon: BadgePercent, label:"Offers"},
                  {Icon: Umbrella, label:"PMJJBY"},
                  {Icon: Coins, label:"Sov. Gold"},
                  {Icon: Banknote, label:"IMPS/NEFT"},
                  {Icon: Calculator, label:"Calculators"},
                  {Icon: Globe2, label:"Forex"},
                  {Icon: Percent, label:"Int. Rates"},
                ].map((s,i)=><ServiceIcon key={i} {...s}/>)}
              </div>
            </div>

            {/* Two column info */}
            <div className="grid grid-cols-2 gap-2">
              <div className="gov-panel">
                <div className="gov-panel-title">What's New</div>
                <ul className="text-[11px] p-2 space-y-1">
                  <li><span className="blink text-[#cc0000] font-bold">NEW!</span> <a className="old-link">Revised FD Interest Rates w.e.f. 01/07/2026</a> <span className="text-[9px] text-gray-500">[PDF, 234 KB]</span></li>
                  <li><span className="text-[#cc0000] font-bold">★</span> <a className="old-link">Notice for Annual General Meeting 2026</a> <span className="text-[9px] text-gray-500">[PDF, 1.2 MB]</span></li>
                  <li><span className="text-[#cc0000] font-bold">★</span> <a className="old-link">Q1 FY26 Financial Results</a> <span className="text-[9px] text-gray-500">[PDF, 4.5 MB]</span></li>
                  <li><span className="text-[#cc0000] font-bold">★</span> <a className="old-link">List of Nodal Officers - Updated 15/07/2026</a></li>
                  <li><span className="text-[#cc0000] font-bold">★</span> <a className="old-link">e-Auction of 47 NPA properties on 30/07/2026</a></li>
                  <li><span className="text-[#cc0000] font-bold">★</span> <a className="old-link">Recruitment of Probationary Officers 2026</a></li>
                  <li><a className="old-link">Cyber Security Awareness — Do's & Don'ts</a></li>
                  <li><a className="old-link">Unclaimed Deposits &gt; 10 years</a></li>
                </ul>
              </div>
              <div className="gov-panel">
                <div className="gov-panel-title">Interest Rates Snapshot</div>
                <table className="gov-table">
                  <thead><tr><th>Product</th><th>Rate (%)</th><th>Tenure</th></tr></thead>
                  <tbody>
                    <tr><td>Savings A/c (upto 10L)</td><td>2.70%</td><td>—</td></tr>
                    <tr><td>Savings A/c (&gt;10L)</td><td>3.00%</td><td>—</td></tr>
                    <tr><td>FD — Regular</td><td>6.80%</td><td>1-2 yr</td></tr>
                    <tr><td>FD — Senior Citizen</td><td>7.30%</td><td>1-2 yr</td></tr>
                    <tr><td>Home Loan</td><td>8.40%</td><td>onwards</td></tr>
                    <tr><td>Car Loan</td><td>8.75%</td><td>onwards</td></tr>
                    <tr><td>Personal Loan</td><td>11.15%</td><td>onwards</td></tr>
                    <tr><td>Education Loan</td><td>8.15%</td><td>onwards</td></tr>
                  </tbody>
                </table>
                <div className="text-[9px] text-gray-600 p-1 italic">*Rates subject to change without notice. Please contact branch for latest.</div>
              </div>
            </div>

            {/* Scheme banners */}
            <div className="grid grid-cols-3 gap-2">
              <div className="border-2 border-[#cc0000] p-2 text-center" style={{background:'linear-gradient(135deg,#fff9c4,#fff59d)'}}>
                <div className="text-[10px] font-bold text-[#cc0000]">SPECIAL OFFER!</div>
                <div className="text-lg font-bold text-[#0d3b7f]" style={{fontFamily:'Times New Roman, serif'}}>FD @ 7.50%*</div>
                <div className="text-[10px]">444 Days Special Deposit</div>
                <button className="btn-3d-orange mt-1">Open FD Now</button>
              </div>
              <div className="border-2 border-[#007a3d] p-2 text-center" style={{background:'linear-gradient(135deg,#c8e6c9,#a5d6a7)'}}>
                <div className="text-[10px] font-bold text-[#007a3d]">ZERO PROCESSING FEE!</div>
                <div className="text-lg font-bold text-[#0d3b7f]" style={{fontFamily:'Times New Roman, serif'}}>Home Loan</div>
                <div className="text-[10px]">Starting @ 8.40% p.a.</div>
                <button className="btn-3d mt-1">Apply Now</button>
              </div>
              <div className="border-2 border-[#7b1fa2] p-2 text-center" style={{background:'linear-gradient(135deg,#e1bee7,#ce93d8)'}}>
                <div className="text-[10px] font-bold text-[#7b1fa2]">LIMITED PERIOD</div>
                <div className="text-lg font-bold text-[#0d3b7f]" style={{fontFamily:'Times New Roman, serif'}}>Credit Card</div>
                <div className="text-[10px]">Lifetime Free + 5000 Reward Pts</div>
                <button className="btn-3d-yellow mt-1">Apply »</button>
              </div>
            </div>
          </main>

          {/* Right sidebar */}
          <aside className="col-span-3 space-y-2">
            <div className="gov-panel">
              <div className="gov-panel-title flex items-center gap-1"><Landmark size={11}/> Net Banking Login</div>
              <div className="p-2 space-y-1 bg-[#f4efe6]">
                <div className="flex items-center gap-1 text-[10px] text-[#cc0000] font-bold border border-[#cc0000] bg-white p-1">
                  <AlertTriangle size={11}/> Never share OTP/PIN with anyone!
                </div>
                <Link to="/login" className="w-full block"><button className="w-full btn-3d py-1.5 cursor-pointer">Personal Banking Login »</button></Link>
                <Link to="/login" className="w-full block"><button className="w-full btn-3d-orange py-1.5 cursor-pointer">Corporate Login »</button></Link>
                <div className="flex justify-between text-[10px] pt-1">
                  <a className="old-link">New User?</a>
                  <a className="old-link">Forgot Password?</a>
                </div>
                <div className="flex justify-between text-[10px]">
                  <a className="old-link">Activate Card</a>
                  <a className="old-link">Reset Login PIN</a>
                </div>
              </div>
            </div>

            <div className="gov-panel">
              <div className="gov-panel-title">Download YONA Mobile App</div>
              <div className="p-2 text-center bg-white">
                <div className="text-4xl">📱</div>
                <div className="text-[10px] font-bold text-[#0d3b7f]">10+ Crore Downloads</div>
                <div className="text-[9px] text-gray-600 mt-1">Rated 4.2 ★ on Play Store</div>
                <div className="flex justify-center gap-1 mt-1">
                  <div className="bg-black text-white text-[9px] px-2 py-1 rounded">▶ Google Play</div>
                  <div className="bg-black text-white text-[9px] px-2 py-1 rounded">🍎 App Store</div>
                </div>
              </div>
            </div>

            <div className="gov-panel">
              <div className="gov-panel-title">Awards & Recognition</div>
              <div className="p-2 text-[10px] space-y-1 bg-white">
                <div className="flex items-start gap-1"><Award size={12} className="text-[#fdd835] shrink-0"/> Best PSU Bank 2025 - Dun & Bradstreet</div>
                <div className="flex items-start gap-1"><Award size={12} className="text-[#fdd835] shrink-0"/> Digital Banking Excellence 2024 - IBA</div>
                <div className="flex items-start gap-1"><Award size={12} className="text-[#fdd835] shrink-0"/> Rajbhasha Kirti Puraskar 2023</div>
                <div className="flex items-start gap-1"><Award size={12} className="text-[#fdd835] shrink-0"/> Best Bank for Financial Inclusion</div>
              </div>
            </div>

            <div className="thin-panel p-2 text-center">
              <div className="text-[10px] font-bold text-[#cc0000]">⚠ FRAUD ALERT</div>
              <div className="text-[10px] mt-1">Bank <b>NEVER</b> asks for:<br/>OTP • PIN • CVV • Password</div>
              <a className="old-link text-[10px]">Report Fraud »</a>
            </div>

            <div className="border border-gray-400 p-1 text-center bg-[#fff9c4]">
              <div className="text-[9px] font-bold">Total Business (Q1 FY26)</div>
              <div className="text-lg font-bold text-[#0d3b7f]" style={{fontFamily:'Times New Roman, serif'}}>₹ 22,47,893 Cr</div>
              <div className="text-[9px] text-gray-600">Serving 45+ Crore Customers</div>
            </div>
          </aside>
        </div>
      </div>

      {/* Popup 1 */}
      {popup && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white border-4 border-[#fdd835] max-w-md w-full">
            <div className="bg-gradient-to-b from-[#cc0000] to-[#8b0000] text-white px-2 py-1 flex items-center justify-between">
              <span className="text-[12px] font-bold blink">🎁 SPECIAL SCHEME ALERT! 🎁</span>
              <button onClick={()=>setPopup(false)} className="hover:bg-white/20 p-0.5"><X size={14}/></button>
            </div>
            <div className="p-4 text-center" style={{background:'linear-gradient(135deg,#fff9c4,#ffe082)'}}>
              <div className="text-4xl">💰</div>
              <div className="text-2xl font-bold text-[#cc0000]" style={{fontFamily:'Times New Roman, serif'}}>AMRIT KALASH FD</div>
              <div className="text-lg font-bold text-[#0d3b7f]">7.60% p.a.* for 400 Days</div>
              <div className="text-[11px] mt-1">Senior Citizens get <b>8.10%</b> p.a.</div>
              <div className="text-[10px] text-gray-700 mt-1 italic">Limited period offer — Book before 31st August 2026</div>
              <div className="flex gap-2 justify-center mt-2">
                <button className="btn-3d-orange">Invest Now »</button>
                <button onClick={()=>setPopup(false)} className="btn-3d">Maybe Later</button>
              </div>
              <div className="text-[9px] mt-2 text-gray-600">*T&C Apply. Rates subject to change.</div>
            </div>
          </div>
        </div>
      )}

      {/* Popup 2 */}
      {popup2 && !popup && (
        <div className="fixed bottom-4 right-4 z-[99] w-64 border-2 border-[#0d3b7f] shadow-lg bg-white">
          <div className="bg-[#0d3b7f] text-white px-2 py-1 flex justify-between items-center">
            <span className="text-[11px] font-bold">💳 Pre-Approved Credit Card!</span>
            <button onClick={()=>setPopup2(false)}><X size={12}/></button>
          </div>
          <div className="p-2 text-center bg-gradient-to-b from-white to-[#e3f2fd]">
            <div className="text-[10px]">You are eligible for a</div>
            <div className="text-sm font-bold text-[#cc0000]">RBI PLATINUM CARD</div>
            <div className="text-[10px]">Credit Limit up to <b>₹5,00,000</b></div>
            <button className="btn-3d-orange mt-1 text-[10px]">Click Here to Apply »</button>
          </div>
        </div>
      )}
    </BankLayout>
  );
}
