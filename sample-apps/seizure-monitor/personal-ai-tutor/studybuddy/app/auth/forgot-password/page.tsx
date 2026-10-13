"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { GraduationCap, ArrowLeft, Mail, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setSent(true); }, 1500);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero flex-col justify-center items-center p-12 relative overflow-hidden">
        <div className="absolute inset-0">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="absolute rounded-full opacity-10"
              style={{ width: `${200 + i * 100}px`, height: `${200 + i * 100}px`,
                background: `radial-gradient(circle, ${['#2563EB','#4F46E5','#06B6D4','#7C3AED'][i]}, transparent)`,
                top: `${[5, 50, 30, 70][i]}%`, left: `${[10, 60, 40, 20][i]}%`,
              }}/>
          ))}
        </div>
        <div className="relative z-10 text-center">
          <div className="text-7xl mb-6">🔐</div>
          <h2 className="text-3xl font-bold text-white mb-4">Don't Worry!</h2>
          <p className="text-blue-200 text-lg max-w-md">We'll help you reset your password and get back to learning in no time.</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Link href="/auth/signin" className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-medium mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Sign In
          </Link>

          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-2xl text-slate-900">StudyBuddy AI</span>
            </div>
            {!sent ? (
              <>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Forgot Password? 🔑</h1>
                <p className="text-slate-500">Enter your email and we'll send you a reset link</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Check Your Email! 📧</h1>
                <p className="text-slate-500">We sent a password reset link to <strong className="text-slate-700">{email}</strong></p>
              </>
            )}
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <input type="email" required placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-3 pl-11 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full gradient-primary text-white py-3.5 rounded-xl font-bold text-base hover:opacity-90 transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                {loading ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
                ) : "Send Reset Link"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
                <p className="font-medium mb-1">Didn't receive the email?</p>
                <ul className="list-disc list-inside text-blue-600 space-y-1 text-xs">
                  <li>Check your spam/junk folder</li>
                  <li>Make sure you entered the correct email</li>
                  <li>Wait a few minutes and try again</li>
                </ul>
              </div>
              <button onClick={() => setSent(false)}
                className="w-full border border-slate-200 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-colors">
                Try Another Email
              </button>
              <Link href="/auth/signin" className="block w-full gradient-primary text-white py-3 rounded-xl font-bold text-center hover:opacity-90 transition-all">
                Back to Sign In
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
