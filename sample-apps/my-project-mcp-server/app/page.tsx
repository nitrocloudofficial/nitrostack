'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, MOCK_USERS, type UserRole } from '@/lib/auth-context';
import { useCase } from '@/lib/case-context';
import { VerificationStamp } from '@/components/VerificationStamp';
import Link from 'next/link';

function LoginAndOverviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get('role') as Exclude<UserRole, 'guest'>) || 'hospital';

  const { loginAsRole, loginCustom, user } = useAuth();
  const { setCaseId } = useCase();
  const [selectedRole, setSelectedRole] = useState<Exclude<UserRole, 'guest'>>(initialRole);

  // Custom Form State
  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');

  function handleDemoLogin(role: Exclude<UserRole, 'guest'>, caseIdToLoad?: string) {
    if (caseIdToLoad) setCaseId(caseIdToLoad);
    loginAsRole(role);
    router.push(`/${role}`);
  }

  function handleCustomLogin(e: React.FormEvent) {
    e.preventDefault();
    const fallbackMock = MOCK_USERS[selectedRole];
    loginCustom({
      id: `custom-${Date.now()}`,
      name: name.trim() || fallbackMock.name,
      role: selectedRole,
      email: fallbackMock.email,
      organization: fallbackMock.organization,
      idNumber: idNumber.trim() || fallbackMock.idNumber,
      title: selectedRole === 'hospital' ? 'Hospital Employee' : selectedRole === 'insurer' ? 'Claims Agent' : 'Patient',
    });
    router.push(`/${selectedRole}`);
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10 animate-route-in space-y-8">
      
      {/* Hero & Welcome */}
      <section className="glass text-center sm:text-left rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-300/40 bg-teal-500/10 backdrop-blur-md px-3 py-0.5 text-xs font-bold text-teal-700">
              ✓ Care Mediator — Shared Healthcare Record
            </span>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              One Verified File. All Parties.
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-xl">
              Hospitals, patients, and insurers read the exact same record — checked against neutral rate lists before review.
            </p>
          </div>

          {user && (
            <div className="rounded-xl border border-teal-300/40 bg-teal-500/10 backdrop-blur-md p-3 text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">Logged In As</span>
              <p className="text-xs font-bold text-slate-900">{user.name}</p>
              <p className="text-[11px] font-mono text-slate-600">{user.idNumber}</p>
              <Link href={`/${user.role}`} className="mt-1.5 inline-block text-xs font-bold text-teal-700 hover:underline">
                Go to {user.role.toUpperCase()} Dashboard →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* LOGIN PORTAL SECTION */}
      <section className="rounded-2xl border-2 border-teal-400/50 bg-white/55 backdrop-blur-xl shadow-lg p-6 relative">
        <div className="mb-6 text-center sm:text-left border-b border-white/40 pb-4">
          <span className="rounded-full bg-slate-900/80 backdrop-blur-md text-white font-mono text-[10px] font-bold px-2.5 py-0.5 uppercase tracking-wider">
            Required Step
          </span>
          <h2 className="mt-2 text-xl font-extrabold text-slate-900">
            Sign In to Access Your Dashboard
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Select your role below or use a 1-click demo login to enter the live platform.
          </p>
        </div>

        {/* 1-Click Instant Demo Login Buttons */}
        <div className="mb-6 rounded-xl border border-teal-300/40 bg-teal-500/10 backdrop-blur-md p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-teal-800 mb-2.5 text-center sm:text-left">
            ⚡ Instant 1-Click Demo Logins
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => handleDemoLogin('hospital', 'clean-case')}
              className="flex flex-col items-center sm:items-start rounded-xl border border-white/50 bg-white/40 backdrop-blur-md p-3 text-xs font-bold text-slate-900 hover:bg-white/60 transition-all text-center sm:text-left"
            >
              <span className="text-sm">🏥 Hospital Staff Login</span>
              <span className="text-[10px] font-medium text-slate-500 mt-0.5">Submit & audit claims</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('patient', 'clean-case')}
              className="flex flex-col items-center sm:items-start rounded-xl border border-teal-300/50 bg-teal-600/75 backdrop-blur-md p-3 text-xs font-bold text-white hover:bg-teal-600/90 transition-all text-center sm:text-left"
            >
              <span className="text-sm">👤 Patient Portal Login</span>
              <span className="text-[10px] font-medium text-teal-100 mt-0.5">View bills & financing</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('insurer', 'gotcha-case')}
              className="flex flex-col items-center sm:items-start rounded-xl border border-white/10 bg-slate-900/75 backdrop-blur-md p-3 text-xs font-bold text-white hover:bg-slate-900/90 transition-all text-center sm:text-left"
            >
              <span className="text-sm">🛡️ Insurance Agent Login</span>
              <span className="text-[10px] font-medium text-slate-300 mt-0.5">Adjudicate pre-checked cases</span>
            </button>
          </div>
        </div>

        {/* Custom Login Form Tabs */}
        <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-white/50 bg-white/30 backdrop-blur-md p-1 mb-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setSelectedRole('hospital')}
            className={`py-2 px-3 rounded-lg backdrop-blur-md transition-all ${
              selectedRole === 'hospital' ? 'bg-white/70 text-slate-900 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🏥 Hospital
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('patient')}
            className={`py-2 px-3 rounded-lg backdrop-blur-md transition-all ${
              selectedRole === 'patient' ? 'bg-white/70 text-slate-900 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            👤 Patient
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('insurer')}
            className={`py-2 px-3 rounded-lg backdrop-blur-md transition-all ${
              selectedRole === 'insurer' ? 'bg-white/70 text-slate-900 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🛡️ Insurance Agent
          </button>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleCustomLogin} className="space-y-3 rounded-xl border border-white/50 bg-white/25 backdrop-blur-md p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-800">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={MOCK_USERS[selectedRole].name}
                className="cm-field text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800">
                {selectedRole === 'hospital'
                  ? 'Employee ID *'
                  : selectedRole === 'patient'
                    ? 'Policy Number / Aadhaar *'
                    : 'Agent License ID *'}
              </label>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder={MOCK_USERS[selectedRole].idNumber}
                className="cm-field text-xs font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            className="cm-button cm-button-primary w-full py-2.5 text-xs font-bold mt-2"
          >
            Sign In & Open {selectedRole === 'hospital' ? 'Hospital' : selectedRole === 'insurer' ? 'Insurer' : 'Patient'} Dashboard →
          </button>
        </form>
      </section>

      {/* APP INFO & HOW IT WORKS */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          How Care Mediator Works
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="glass rounded-2xl p-5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900/80 backdrop-blur-md font-mono text-xs font-bold text-white">
              1
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-900">Hospital Submits Case</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Hospital staff submits patient information, procedure code, and billing estimate.
            </p>
          </div>

          <div className="rounded-2xl border border-teal-300/40 bg-teal-500/10 backdrop-blur-xl p-5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600/85 backdrop-blur-md font-mono text-xs font-bold text-white">
              2
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-900">Automated Rate Check</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Objectivity agent cross-checks hospital estimates against neutral CGHS rates.
            </p>
            <div className="mt-2">
              <VerificationStamp status="verified" verb="Verified" label="CGHS rates" compact />
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-700/85 backdrop-blur-md font-mono text-xs font-bold text-white">
              3
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-900">Single Shared Truth</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Patient, hospital, and insurer all view the exact same verified record and timeline.
            </p>
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-2">
        <div className="glass rounded-xl p-3 text-center">
          <span className="text-[10px] font-bold uppercase text-slate-400">Claim Speed</span>
          <p className="font-mono text-lg font-extrabold text-slate-900">&lt; 2 Mins</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <span className="text-[10px] font-bold uppercase text-slate-400">Rate Audit</span>
          <p className="font-mono text-lg font-extrabold text-teal-700">100% CGHS</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <span className="text-[10px] font-bold uppercase text-slate-400">Disputes</span>
          <p className="font-mono text-lg font-extrabold text-slate-900">0 Version Conflicts</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <span className="text-[10px] font-bold uppercase text-slate-400">Financing</span>
          <p className="font-mono text-lg font-extrabold text-teal-700">0% APR EMI</p>
        </div>
      </section>
    </main>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header Bar */}
      <header className="glass-nav border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 font-bold text-white shadow-xs">
              CM
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900">Care Mediator</span>
          </div>
          <span className="rounded-full bg-teal-500/15 border border-teal-300/40 backdrop-blur-md px-3 py-1 font-mono text-xs font-semibold text-teal-700">
            ● Live Platform
          </span>
        </div>
      </header>

      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading Login Portal…</div>}>
        <LoginAndOverviewContent />
      </Suspense>
    </div>
  );
}
