'use client';

import React, { useState } from 'react';
import { Shield, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Simulate network delay for mock login
    setTimeout(() => {
      if (email === 'admin@aegis.com' && password === 'admin') {
        window.location.href = '/tools';
      } else {
        setIsLoading(false);
        setError('Invalid credentials. Try admin@aegis.com / admin');
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-white rounded-2xl border border-[#EAEDF3] shadow-sm">
            <Shield className="w-10 h-10 text-[#29C5CE]" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-black tracking-widest text-[#1F2937]">AEGIS</h2>
        <p className="mt-2 text-center text-sm text-[#8A93A6]">
          Project Aegis SRE Command Center
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#EAEDF3] sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-[#1F2937]">
                Email Address
              </label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-[#8A93A6]" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-[#EAEDF3] rounded-xl text-[#1F2937] placeholder-[#8A93A6] focus:outline-none focus:ring-2 focus:ring-[#29C5CE]/30 focus:border-[#29C5CE] transition-all sm:text-sm"
                  placeholder="admin@aegis.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1F2937]">
                Password
              </label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-[#8A93A6]" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-[#EAEDF3] rounded-xl text-[#1F2937] placeholder-[#8A93A6] focus:outline-none focus:ring-2 focus:ring-[#29C5CE]/30 focus:border-[#29C5CE] transition-all sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-[#29C5CE] focus:ring-[#29C5CE] border-[#EAEDF3] rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-[#8A93A6] cursor-pointer">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-semibold text-[#3B7DD8] hover:text-blue-600 transition-colors">
                  Forgot password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#3B7DD8] hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3B7DD8] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#EAEDF3]" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-[#8A93A6]">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <button className="w-full flex justify-center items-center py-2.5 px-4 border border-[#EAEDF3] rounded-xl shadow-sm bg-white text-sm font-semibold text-[#1F2937] hover:bg-gray-50 transition-colors">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25C22.56 11.47 22.49 10.71 22.36 9.99H12V14.26H17.92C17.66 15.64 16.89 16.81 15.7 17.6V20.35H19.26C21.34 18.43 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
                  <path d="M12 23C14.97 23 17.46 22.02 19.26 20.35L15.7 17.6C14.73 18.25 13.48 18.64 12 18.64C9.13 18.64 6.7 16.71 5.82 14.11H2.15V16.96C3.96 20.55 7.69 23 12 23Z" fill="#34A853"/>
                  <path d="M5.82 14.11C5.59 13.44 5.46 12.73 5.46 12C5.46 11.27 5.59 10.56 5.82 9.89V7.04H2.15C1.4 8.53 0.96 10.21 0.96 12C0.96 13.79 1.4 15.47 2.15 16.96L5.82 14.11Z" fill="#FBBC05"/>
                  <path d="M12 5.36C13.62 5.36 15.07 5.92 16.21 7L19.34 3.87C17.45 2.11 14.97 1 12 1C7.69 1 3.96 3.45 2.15 7.04L5.82 9.89C6.7 7.29 9.13 5.36 12 5.36Z" fill="#EA4335"/>
                </svg>
                Google SSO
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
