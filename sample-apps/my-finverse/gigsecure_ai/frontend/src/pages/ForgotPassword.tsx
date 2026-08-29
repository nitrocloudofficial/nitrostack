import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '../layouts/AuthLayout';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-md glass-card p-8 rounded-3xl border border-slate-800 shadow-2xl relative z-10">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-7 h-7 text-black" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Reset Password</h1>
          <p className="text-xs text-slate-400 mt-1">Enter your registered email to receive password reset instructions</p>
        </div>

        {submitted ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <div className="text-sm font-bold text-white">Reset Link Sent</div>
            <p className="text-xs text-slate-300">Check your email inbox for password recovery instructions.</p>
            <Link to="/login" className="inline-block mt-3 text-xs text-emerald-400 font-bold hover:underline">
              Return to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300 mb-1 block">Registered Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="ramesh@zomato.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              Send Password Reset Link
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center text-xs text-slate-400 pt-2">
              <Link to="/login" className="text-emerald-400 hover:underline">
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </AuthLayout>
  );
};
