"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Eye, EyeOff, GraduationCap, ArrowRight, BookOpen, Brain, Zap } from "lucide-react";

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { window.location.href = "/dashboard"; }, 1500);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero flex-col justify-between p-12 relative overflow-hidden">
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
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-2xl text-white">StudyBuddy AI</span>
          </div>
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white mb-4">Learn Smarter, Not Harder</h2>
          <p className="text-blue-200 mb-10 text-lg">Join 50,000+ students who ace their exams with AI-powered personalized learning.</p>
          <div className="space-y-4">
            {[
              { icon: BookOpen, text: "Upload any study material — PDF, PPT, DOCX, images" },
              { icon: Brain, text: "AI tutor answers from your exact notes" },
              { icon: Zap, text: "Generate quizzes and revision plans in seconds" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><item.icon className="w-4 h-4 text-cyan-400" /></div>
                <span className="text-blue-100 text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex -space-x-2">{["PS","RV","AS"].map((av, i) => <div key={i} className="w-8 h-8 rounded-full gradient-primary border-2 border-white flex items-center justify-center text-white text-xs font-bold">{av}</div>)}</div>
          <p className="text-blue-200 text-sm">50,000+ students already learning</p>
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
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome back! 👋</h1>
            <p className="text-slate-500">Sign in to continue your learning journey</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
              <input id="signin-email" type="email" required placeholder="you@example.com"
                value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input id="signin-password" type={showPassword ? "text" : "password"} required placeholder="Enter your password"
                  value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300 text-blue-600" />
                Remember me
              </label>
              <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 font-medium">Forgot password?</Link>
            </div>
            <button id="signin-submit" type="submit" disabled={loading}
              className="w-full gradient-primary text-white py-3.5 rounded-xl font-bold text-base hover:opacity-90 transition-all disabled:opacity-70 flex items-center justify-center gap-2">
              {loading ? (
                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
              ) : (<>Sign In <ArrowRight className="w-5 h-5" /></>)}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div><div className="relative flex justify-center"><span className="bg-white px-4 text-slate-400 text-sm">or continue with</span></div></div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 border border-slate-200 rounded-xl py-3 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700">
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google
              </button>
              <button className="flex items-center justify-center gap-2 border border-slate-200 rounded-xl py-3 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                GitHub
              </button>
            </div>
          </div>

          <p className="text-center mt-6 text-slate-600 text-sm">
            Don't have an account?{" "}
            <Link href="/auth/signup" className="text-blue-600 font-semibold hover:text-blue-700">Sign up free</Link>
          </p>

          <p className="text-center mt-8 text-xs text-slate-400">
            Demo: use any email + password to continue
          </p>
        </motion.div>
      </div>
    </div>
  );
}
