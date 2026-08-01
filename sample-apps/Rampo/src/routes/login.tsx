import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, User, Shield, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { BankLayout } from "@/components/BankLayout";
import { useAuth, checkAuthSession } from "@/hooks/use-auth";
import { reportFormFailure } from "@/lib/tracker";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const isAuthenticated = await checkAuthSession();
    if (isAuthenticated) {
      throw redirect({
        to: "/dashboard",
      });
    }
  },
  head: () => ({
    meta: [
      { title: "Net Banking Login — Rashtriya Bank of India" },
      { name: "description", content: "Secure Net Banking login portal for Rashtriya Bank of India customers. Personal and corporate internet banking." },
      { property: "og:title", content: "Net Banking Login — Rashtriya Bank of India" },
      { property: "og:description", content: "Secure Net Banking login portal." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [userId, setUserId] = useState("30014782291");
  const [password, setPassword] = useState("Demo@12345");
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleReset = () => {
    setUserId("");
    setPassword("");
    setTermsAccepted(false);
    setError(null);
  };

  const handleLogin = async (e: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!userId.trim()) {
      setError("User ID / CIF No is required.");
      reportFormFailure("login_fail", "submit", ["userId"]);
      return;
    }
    if (!password) {
      setError("Login Password is required.");
      reportFormFailure("login_fail", "submit", ["password"]);
      return;
    }
    if (!termsAccepted) {
      setError("Please agree to the Terms & Conditions and Privacy Policy.");
      reportFormFailure("login_fail", "submit", ["terms"]);
      return;
    }

    setSubmitting(true);
    const { error: signInError } = await signIn(userId, password);
    setSubmitting(false);

    if (signInError) {
      setError(signInError.message || "Invalid credentials. Please verify your CIF No and Password.");
      reportFormFailure("login_fail", "submit", [signInError.message || "Invalid credentials"], { field: "password" });
    } else {
      navigate({ to: "/dashboard" });
    }
  };

  return (
    <BankLayout>
      <div className="max-w-[1200px] mx-auto px-2 py-3 bg-white">
        <div className="text-[11px] text-gray-600 mb-2 border-b border-gray-300 pb-1">
          <a className="old-link">Home</a> » <a className="old-link">Personal Banking</a> » <b>Net Banking Login</b>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <aside className="col-span-3 space-y-2">
            <div className="gov-panel">
              <div className="gov-panel-title">Security Tips</div>
              <ul className="p-2 text-[11px] space-y-1.5 bg-[#fffde7]">
                <li className="flex gap-1"><Shield size={11} className="text-[#007a3d] shrink-0 mt-0.5"/> Always type <b>www.rbibank.co.in</b> directly into address bar.</li>
                <li className="flex gap-1"><Shield size={11} className="text-[#007a3d] shrink-0 mt-0.5"/> Check for <b>HTTPS</b> and padlock icon before login.</li>
                <li className="flex gap-1"><Shield size={11} className="text-[#007a3d] shrink-0 mt-0.5"/> Never login from cyber cafes or shared computers.</li>
                <li className="flex gap-1"><Shield size={11} className="text-[#007a3d] shrink-0 mt-0.5"/> Change your password every 30 days.</li>
                <li className="flex gap-1"><Shield size={11} className="text-[#007a3d] shrink-0 mt-0.5"/> Use virtual keyboard for password entry.</li>
                <li className="flex gap-1"><Shield size={11} className="text-[#007a3d] shrink-0 mt-0.5"/> Logout properly after banking session.</li>
                <li className="flex gap-1"><Shield size={11} className="text-[#007a3d] shrink-0 mt-0.5"/> Enable SMS alerts on your registered mobile.</li>
              </ul>
            </div>
            <div className="gov-panel">
              <div className="gov-panel-title">Do's & Don'ts</div>
              <div className="p-2 text-[10px] bg-white space-y-1">
                <div className="text-[#007a3d] font-bold">✓ DO's</div>
                <div>• Keep OS & Browser updated</div>
                <div>• Use licensed antivirus</div>
                <div>• Verify beneficiary before adding</div>
                <div className="text-[#cc0000] font-bold mt-1">✗ DON'Ts</div>
                <div>• Never share OTP/PIN/CVV</div>
                <div>• Don't click unknown SMS/email links</div>
                <div>• Don't save password in browser</div>
              </div>
            </div>
          </aside>

          <main className="col-span-6">
            <div className="border-4 border-[#0d3b7f]">
              <div className="bg-gradient-to-b from-[#3a6bb8] to-[#0d3b7f] px-3 py-2 flex items-center gap-2">
                <Lock className="text-[#fdd835]" size={18}/>
                <div>
                  <div className="text-white font-bold text-sm" style={{fontFamily:'Times New Roman, serif'}}>Internet Banking Login</div>
                  <div className="text-[#fdd835] text-[10px]">Secure Site — Verified by DigiSign India CA</div>
                </div>
              </div>

              <div className="bg-[#cc0000] text-white px-2 py-1 text-[10px] flex items-center gap-1 border-b border-[#8b0000]">
                <AlertTriangle size={11}/> <b>WARNING:</b> Rashtriya Bank of India will NEVER ask for your Password / PIN / OTP over phone, email or SMS. Report suspicious calls to 1930.
              </div>

              <div className="p-4 bg-[#f4efe6]" style={{backgroundImage:'linear-gradient(135deg,#f4efe6 0%,#e8ddc7 100%)'}}>
                <div className="bg-white border border-gray-400 p-4">
                  {error && (
                    <div className="bg-[#fee2e2] border border-[#f87171] text-[#b91c1c] text-[11px] p-2 mb-3 font-semibold rounded flex items-center gap-1.5">
                      <AlertTriangle size={12} className="shrink-0"/> {error}
                    </div>
                  )}

                  <form onSubmit={handleLogin}>
                    <table className="w-full text-[12px]">
                      <tbody>
                        <tr>
                          <td className="py-2 pr-2 w-40 text-right"><label className="font-bold">User ID / CIF No <span className="text-[#cc0000]">*</span> :</label></td>
                          <td className="py-2">
                            <div className="flex items-center border border-gray-500 bg-white">
                              <User size={13} className="mx-1 text-gray-500"/>
                              <input 
                                type="text" 
                                className="flex-1 px-1 py-1 text-[12px] outline-none" 
                                value={userId}
                                onChange={(e) => setUserId(e.target.value.replace(/\D/g, ""))}
                                disabled={submitting}
                                placeholder="e.g. 30014782291"
                              />
                            </div>
                            <div className="text-[9px] text-gray-500 mt-0.5">Your 11-digit CIF or Customer ID as per pass book.</div>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-2 text-right"><label className="font-bold">Login Password <span className="text-[#cc0000]">*</span> :</label></td>
                          <td className="py-2">
                            <div className="flex items-center border border-gray-500 bg-white">
                              <Lock size={13} className="mx-1 text-gray-500"/>
                              <input 
                                type={showPassword ? "text" : "password"} 
                                className="flex-1 px-1 py-1 text-[12px] outline-none" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={submitting}
                                placeholder="Enter your password"
                              />
                              <button 
                                type="button" 
                                className="border-l border-gray-400 px-1 py-1 bg-gray-100 cursor-pointer hover:bg-gray-200"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff size={12}/> : <Eye size={12}/>}
                              </button>
                            </div>
                            <div className="text-[9px] mt-0.5"><a className="old-link">» Virtual Keyboard</a> | <a className="old-link">» Forgot Password?</a></div>
                          </td>
                        </tr>
                        <tr>
                          <td></td>
                          <td className="py-2 text-[10px]">
                            <label className="cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                className="mr-1 cursor-pointer" 
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                                disabled={submitting}
                              /> I agree to the <a className="old-link">Terms & Conditions</a> and <a className="old-link">Privacy Policy</a>.
                            </label>
                          </td>
                        </tr>
                        <tr>
                          <td></td>
                          <td className="py-3">
                            <button 
                              type="submit" 
                              className="btn-3d px-6 py-2 text-[13px] font-bold cursor-pointer"
                              disabled={submitting}
                            >
                              {submitting ? "LOGGING IN..." : "LOGIN »"}
                            </button>
                            <button 
                              type="button" 
                              onClick={handleReset} 
                              className="btn-3d-yellow ml-2 px-4 py-2 text-[13px] cursor-pointer"
                              disabled={submitting}
                            >
                              RESET
                            </button>
                            <span className="ml-3 text-[10px]"><a className="old-link">» New User Registration</a></span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </form>
                </div>

                <div className="text-[10px] mt-2 bg-[#fff9c4] border border-[#f9a825] p-1.5">
                  <b>Last Successful Login:</b> 23-Jul-2026 09:14:22 IST from IP 103.42.xx.xx (Mumbai, MH) —
                  &nbsp;<b>Last Failed Login:</b> None. If this was not you, <a className="old-link">click here immediately</a>.
                </div>
              </div>

              <div className="bg-[#ececec] px-3 py-2 text-[10px] border-t-2 border-[#0d3b7f]">
                <div className="grid grid-cols-3 gap-2">
                  <a className="old-link">» Continue to Personal Banking</a>
                  <a className="old-link">» Continue to Corporate Banking</a>
                  <a className="old-link">» Continue to NRI Services</a>
                  <a className="old-link">» Retail Loan Application</a>
                  <a className="old-link">» Online SB Account Opening</a>
                  <a className="old-link">» Debit Card Hotlisting</a>
                </div>
              </div>
            </div>
          </main>

          <aside className="col-span-3 space-y-2">
            <div className="gov-panel">
              <div className="gov-panel-title">Site Compatibility</div>
              <div className="p-2 text-[10px] bg-white space-y-1">
                <div>✓ Internet Explorer 8.0+</div>
                <div>✓ Mozilla Firefox 3.5+</div>
                <div>✓ Google Chrome 10+</div>
                <div>✓ Safari 5.0+</div>
                <div className="border-t pt-1 mt-1">Best viewed at <b>1024 x 768</b> resolution with JavaScript enabled and Cookies allowed.</div>
              </div>
            </div>
            <div className="gov-panel">
              <div className="gov-panel-title">Certified Secure</div>
              <div className="p-2 text-center bg-white text-[10px]">
                <div className="text-3xl">🔒</div>
                <div className="font-bold text-[#007a3d]">256-bit SSL Encryption</div>
                <div className="text-gray-600 mt-1">Verified by DigiSign India CA</div>
                <div className="text-gray-600">VeriSign Extended Validation</div>
              </div>
            </div>
            <div className="thin-panel p-2 text-center bg-[#fff9c4]">
              <div className="text-[10px] font-bold text-[#cc0000]">⚠ Beware of Phishing Sites!</div>
              <div className="text-[10px] mt-1">Report suspicious emails to:<br/><b>phishing@rbibank.co.in</b></div>
            </div>
          </aside>
        </div>
      </div>
    </BankLayout>
  );
}
