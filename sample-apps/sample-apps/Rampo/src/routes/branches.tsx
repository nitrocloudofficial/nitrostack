import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Search, Phone, Printer } from "lucide-react";
import { BankLayout } from "@/components/BankLayout";

export const Route = createFileRoute("/branches")({
  head: () => ({
    meta: [
      { title: "Branch & ATM Locator — Rashtriya Bank of India" },
      { name: "description", content: "Find Rashtriya Bank of India branches and ATMs across India. Search by state, city, PIN code or IFSC code." },
      { property: "og:title", content: "Branch & ATM Locator — Rashtriya Bank of India" },
      { property: "og:description", content: "Locate our branches and ATMs across India." },
    ],
  }),
  component: Branches,
});

const branches = [
  { name: "Connaught Place", city: "New Delhi", state: "Delhi", ifsc: "RBIN0001234", micr: "110002001", phone: "011-23412345", pin: "110001", addr: "P-15, Connaught Place, Outer Circle, New Delhi" },
  { name: "Karol Bagh", city: "New Delhi", state: "Delhi", ifsc: "RBIN0001456", micr: "110002002", phone: "011-25781122", pin: "110005", addr: "12/34, Ajmal Khan Road, Karol Bagh, New Delhi" },
  { name: "Nariman Point", city: "Mumbai", state: "Maharashtra", ifsc: "RBIN0002101", micr: "400002101", phone: "022-22881100", pin: "400021", addr: "Maker Chambers V, Nariman Point, Mumbai" },
  { name: "Andheri (E)", city: "Mumbai", state: "Maharashtra", ifsc: "RBIN0002214", micr: "400002214", phone: "022-26845572", pin: "400069", addr: "M.V. Road, Andheri East, Mumbai" },
  { name: "M.G. Road", city: "Bengaluru", state: "Karnataka", ifsc: "RBIN0003301", micr: "560002301", phone: "080-25581234", pin: "560001", addr: "Public Utility Bldg, M.G. Road, Bengaluru" },
  { name: "Koramangala", city: "Bengaluru", state: "Karnataka", ifsc: "RBIN0003415", micr: "560002315", phone: "080-25534411", pin: "560034", addr: "80 Feet Rd, 4th Block, Koramangala, Bengaluru" },
  { name: "Salt Lake Sec-V", city: "Kolkata", state: "West Bengal", ifsc: "RBIN0004421", micr: "700002421", phone: "033-23578811", pin: "700091", addr: "Sector V, Salt Lake, Bidhannagar, Kolkata" },
  { name: "T. Nagar", city: "Chennai", state: "Tamil Nadu", ifsc: "RBIN0005512", micr: "600002512", phone: "044-24341122", pin: "600017", addr: "Ranganathan Street, T. Nagar, Chennai" },
  { name: "Banjara Hills", city: "Hyderabad", state: "Telangana", ifsc: "RBIN0006618", micr: "500002618", phone: "040-23354499", pin: "500034", addr: "Road No. 12, Banjara Hills, Hyderabad" },
  { name: "C.G. Road", city: "Ahmedabad", state: "Gujarat", ifsc: "RBIN0007712", micr: "380002712", phone: "079-26445588", pin: "380009", addr: "C.G. Road, Navrangpura, Ahmedabad" },
  { name: "Sector 17", city: "Chandigarh", state: "Chandigarh", ifsc: "RBIN0008801", micr: "160002801", phone: "0172-2701122", pin: "160017", addr: "SCO 44-45, Sector 17-C, Chandigarh" },
  { name: "Hazratganj", city: "Lucknow", state: "Uttar Pradesh", ifsc: "RBIN0009911", micr: "226002911", phone: "0522-2201188", pin: "226001", addr: "Halwasiya Court, Hazratganj, Lucknow" },
  { name: "Boring Road", city: "Patna", state: "Bihar", ifsc: "RBIN0010102", micr: "800002102", phone: "0612-2528877", pin: "800001", addr: "Boring Canal Road, Patna" },
  { name: "M.G. Marg", city: "Jaipur", state: "Rajasthan", ifsc: "RBIN0011203", micr: "302002203", phone: "0141-2367788", pin: "302001", addr: "M.I. Road, Jaipur" },
  { name: "Panjim", city: "Panaji", state: "Goa", ifsc: "RBIN0012304", micr: "403002304", phone: "0832-2422100", pin: "403001", addr: "Dr. Dada Vaidya Road, Panjim, Goa" },
];

function Branches() {
  const [q, setQ] = useState("");
  const [stateF, setStateF] = useState("All");

  const filtered = branches.filter(b => {
    const okQ = !q || (b.name+b.city+b.ifsc+b.pin+b.addr).toLowerCase().includes(q.toLowerCase());
    const okS = stateF === "All" || b.state === stateF;
    return okQ && okS;
  });

  return (
    <BankLayout>
      <div className="max-w-[1200px] mx-auto px-2 py-3 bg-white">
        <div className="text-[11px] text-gray-600 mb-2 border-b border-gray-300 pb-1">
          <a className="old-link">Home</a> » <b>Branch / ATM Locator</b>
        </div>

        <div className="bg-gradient-to-b from-[#3a6bb8] to-[#0d3b7f] text-white px-3 py-2 flex items-center gap-2">
          <MapPin className="text-[#fdd835]"/>
          <div>
            <div className="text-sm font-bold" style={{fontFamily:'Times New Roman, serif'}}>Branch &amp; ATM Locator</div>
            <div className="text-[10px] text-[#fdd835]">Over 8,500 branches and 22,000+ ATMs across India</div>
          </div>
        </div>

        <div className="border-2 border-t-0 border-[#0d3b7f] p-2 bg-[#f4efe6]">
          <table className="text-[11px]">
            <tbody>
              <tr>
                <td className="pr-2 font-bold">Search by:</td>
                <td>
                  <label className="mr-2"><input type="radio" name="s" defaultChecked/> Branch Name / City</label>
                  <label className="mr-2"><input type="radio" name="s"/> PIN Code</label>
                  <label className="mr-2"><input type="radio" name="s"/> IFSC Code</label>
                  <label><input type="radio" name="s"/> MICR Code</label>
                </td>
              </tr>
              <tr>
                <td className="pr-2 font-bold py-1">State:</td>
                <td className="py-1">
                  <select value={stateF} onChange={e=>setStateF(e.target.value)} className="border border-gray-500 text-[11px] px-1 py-0.5 w-52">
                    <option>All</option>
                    {[...new Set(branches.map(b=>b.state))].map(s=><option key={s}>{s}</option>)}
                  </select>
                  <span className="ml-3 font-bold">Keyword:</span>
                  <input value={q} onChange={e=>setQ(e.target.value)} placeholder="e.g. Connaught, 110001, RBIN0001234" className="ml-1 border border-gray-500 text-[11px] px-1 py-0.5 w-64"/>
                  <button className="btn-3d ml-2"><Search size={10} className="inline"/> Search</button>
                  <button className="btn-3d-yellow ml-1">Reset</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-12 gap-2 mt-2">
          {/* Map */}
          <div className="col-span-5">
            <div className="gov-panel">
              <div className="gov-panel-title flex items-center justify-between">
                <span>Map View</span>
                <span className="text-[10px] text-white">Powered by MapMyIndia™</span>
              </div>
              <div className="relative bg-[#e8f4d8] border-t-2 border-[#0d3b7f]" style={{height:340}}>
                {/* Fake map */}
                <svg viewBox="0 0 200 240" className="w-full h-full">
                  <path d="M100 15 Q140 30 160 60 Q175 90 170 130 Q160 170 130 200 Q100 225 70 210 Q40 195 30 160 Q20 120 30 85 Q45 45 100 15 Z" fill="#c8e6c9" stroke="#2e7d32" strokeWidth="1"/>
                  <path d="M45 90 L50 110 L60 105 L58 125 M100 60 L110 80 M130 100 L145 120 M85 150 L100 165" stroke="#4a90a4" strokeWidth="0.6" fill="none"/>
                  {[{x:95,y:50,c:'Delhi'},{x:60,y:120,c:'Mumbai'},{x:95,y:170,c:'Bengaluru'},{x:135,y:150,c:'Chennai'},{x:145,y:110,c:'Kolkata'},{x:110,y:130,c:'Hyd'},{x:55,y:95,c:'Ahd'},{x:80,y:50,c:'Chd'},{x:110,y:60,c:'Lko'},{x:135,y:85,c:'Patna'},{x:70,y:75,c:'Jpr'},{x:65,y:145,c:'Goa'}].map((p,i)=>(
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="2.5" fill="#cc0000" stroke="white" strokeWidth="0.5"/>
                      <text x={p.x+3} y={p.y+1} fontSize="4" fill="#0d3b7f" fontWeight="bold">{p.c}</text>
                    </g>
                  ))}
                </svg>
                <div className="absolute top-1 left-1 bg-white border border-gray-500 p-0.5 text-[9px]">
                  <div className="border-b">＋</div>
                  <div>−</div>
                </div>
                <div className="absolute bottom-1 right-1 bg-white/90 px-1 py-0.5 text-[8px] border border-gray-400">
                  © MapMyIndia 2026 | Terms
                </div>
                <div className="absolute bottom-1 left-1 bg-white/90 px-1 text-[8px] border border-gray-400">
                  100 km ├─────┤
                </div>
              </div>
              <div className="p-1 text-[10px] text-center bg-[#ececec] border-t border-gray-400">
                <a className="old-link">Get Directions</a> | <a className="old-link">Print Map</a> | <a className="old-link">Report incorrect location</a>
              </div>
            </div>

            <div className="thin-panel p-2 mt-2 text-[10px]">
              <b>Legend:</b>
              <div className="mt-1">🔴 Branch &nbsp; 🟡 ATM &nbsp; 🟢 Cash Deposit Machine &nbsp; 🔵 Passbook Printer</div>
              <div className="mt-1 text-gray-600">Note: Google Maps embed available <a className="old-link">here</a> (requires Flash Player 10+).</div>
            </div>
          </div>

          {/* Table */}
          <div className="col-span-7">
            <div className="gov-panel">
              <div className="gov-panel-title flex items-center justify-between">
                <span>Branch List — {filtered.length} result(s) found</span>
                <div className="flex items-center gap-1 text-[10px]">
                  <button className="text-white underline"><Printer size={9} className="inline"/> Print</button>
                  <span className="text-white">|</span>
                  <button className="text-white underline">Export to Excel</button>
                </div>
              </div>
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>#</th><th>Branch Name</th><th>City / State</th><th>Address</th><th>IFSC</th><th>MICR</th><th>PIN</th><th>Phone</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b,i)=>(
                    <tr key={b.ifsc}>
                      <td>{i+1}</td>
                      <td className="font-bold text-[#0d3b7f]">{b.name}</td>
                      <td>{b.city}<br/><span className="text-[9px] text-gray-600">{b.state}</span></td>
                      <td className="text-[10px]">{b.addr}</td>
                      <td className="font-mono">{b.ifsc}</td>
                      <td className="font-mono">{b.micr}</td>
                      <td>{b.pin}</td>
                      <td className="text-[10px]"><Phone size={8} className="inline"/> {b.phone}</td>
                      <td className="text-[10px] whitespace-nowrap"><a className="old-link">Map »</a><br/><a className="old-link">Details »</a></td>
                    </tr>
                  ))}
                  {filtered.length===0 && <tr><td colSpan={9} className="text-center py-4 text-[#cc0000]">No branches found matching your criteria. Please refine your search.</td></tr>}
                </tbody>
              </table>
              <div className="p-1 bg-[#ececec] border-t border-gray-400 text-[10px] flex items-center justify-between">
                <div>Showing 1 - {filtered.length} of {filtered.length}</div>
                <div className="flex gap-1">
                  <button className="btn-3d">« First</button>
                  <button className="btn-3d">‹ Prev</button>
                  <span className="px-2 py-1 bg-white border border-gray-500">Page 1 of 1</span>
                  <button className="btn-3d">Next ›</button>
                  <button className="btn-3d">Last »</button>
                </div>
              </div>
            </div>

            <div className="thin-panel p-2 mt-2 text-[10px]">
              <b>Note:</b> Branch timings are generally Monday to Friday 10:00 AM to 4:00 PM, Saturday 10:00 AM to 1:00 PM (1st, 3rd, 5th Saturdays only). Branches remain closed on 2nd &amp; 4th Saturdays, Sundays and Public/Bank Holidays as declared by RBI. For 24x7 services, please use ATM, Net Banking or YONA Mobile App.
            </div>
          </div>
        </div>
      </div>
    </BankLayout>
  );
}
