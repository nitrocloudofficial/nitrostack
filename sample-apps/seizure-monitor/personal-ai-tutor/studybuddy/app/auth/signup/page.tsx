"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Eye, EyeOff, GraduationCap, ArrowRight, CheckCircle } from "lucide-react";

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { window.location.href = "/dashboard"; }, 1500);
  };

  const passwordStrength = form.password.length === 0 ? 0 : form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : 3;
  const strengthColors = ["", "bg-red-400", "bg-yellow-400", "bg-green-500"];
  const strengthLabels = ["", "Weak", "Good", "Strong"];

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero flex-col justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="absolute rounded-full opacity-10"
              style={{ width: `${200 + i * 100}px`, height: `${200 + i * 100}px`,
                background: `radial-gradient(circle, ${['#2563EB','#4F46E5','#06B6D4','#7C3AED'][i]}, transparent)`,
                top: `${[5, 50, 30, 70][i]}%`, left: `${[10, 60, 40, 20][i]}%`,
              }}/>
          ))}
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center"><GraduationCap className="w-6 h-6 text-white" /></div>
            <span className="font-bold text-2xl text-white">StudyBuddy AI</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">Start Your AI Learning Journey</h2>
          <p className="text-blue-200 mb-10 text-lg">Free forever for students. No credit card required.</p>
          <div className="space-y-5">
            {[
              "Unlimited AI tutor conversations",
              "Generate 100+ quizzes per month",
              "Personalized revision plans",
              "Bilingual support (English + Hindi)",
              "Research paper analysis",
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-green-400/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-blue-100">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center"><GraduationCap className="w-6 h-6 text-white" /></div>
              <span className="font-bold text-2xl text-slate-900">StudyBuddy AI</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Create your account 🚀</h1>
            <p className="text-slate-500">Join 50,000+ students learning with AI</p>
          </div>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[{ val: "student", label: "🎓 Student" }, { val: "teacher", label: "👩‍🏫 Teacher" }].map(r => (
              <button key={r.val} type="button" onClick={() => setForm({...form, role: r.val})}
                className={`py-3 rounded-xl border-2 font-semibold transition-all ${form.role === r.val ? "border-blue-500 bg-blue-50 text-blue-600" : "border-slate-200 text-slate-600 hover:border-blue-300"}`}>
                {r.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
              <input id="signup-name" type="text" required placeholder="Priya Sharma"
                value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
              <input id="signup-email" type="email" required placeholder="you@example.com"
                value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input id="signup-password" type={showPassword ? "text" : "password"} required placeholder="Create a strong password"
                  value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1,2,3].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= passwordStrength ? strengthColors[passwordStrength] : "bg-slate-200"}`} />)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{strengthLabels[passwordStrength]} password</p>
                </div>
              )}
            </div>
            <div className="flex items-start gap-2">
              <input type="checkbox" id="terms" required className="mt-1 rounded border-slate-300 text-blue-600" />
              <label htmlFor="terms" className="text-sm text-slate-600">
                I agree to the <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
              </label>
            </div>
            <button id="signup-submit" type="submit" disabled={loading}
              className="w-full gradient-primary text-white py-3.5 rounded-xl font-bold text-base hover:opacity-90 transition-all disabled:opacity-70 flex items-center justify-center gap-2">
              {loading ? (
                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating account...</>
              ) : (<>Create Free Account <ArrowRight className="w-5 h-5" /></>)}
            </button>
          </form>

          <p className="text-center mt-6 text-slate-600 text-sm">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-blue-600 font-semibold hover:text-blue-700">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
