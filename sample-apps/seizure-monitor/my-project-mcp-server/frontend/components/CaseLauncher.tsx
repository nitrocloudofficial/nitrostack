'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DEMO_CASES, type Role } from '@/lib/types';

const ROLES: { role: Role; title: string; description: string; icon: string }[] = [
  {
    role: 'hospital',
    title: 'Hospital Portal',
    description: 'Billing, CGHS benchmarks, and claim alignment',
    icon: '🏥',
  },
  {
    role: 'patient',
    title: 'Patient Portal',
    description: 'Coverage gap, financing options, and fair-rate guidance',
    icon: '🧑‍⚕️',
  },
  {
    role: 'insurer',
    title: 'Insurer Portal',
    description: 'Claim decisions, network status, and audit trail',
    icon: '🛡️',
  },
];

export function CaseLauncher() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('patient');
  const [patientId, setPatientId] = useState('PAT-01');
  const [procedureCode, setProcedureCode] = useState('CGHS-CARD-001');
  const [city, setCity] = useState('Chennai');
  const [hospitalBilledAmount, setHospitalBilledAmount] = useState('65000');

  const loadDemo = (demoId: string) => {
    const demo = DEMO_CASES.find((d) => d.id === demoId);
    if (!demo) return;
    setPatientId(demo.input.patientId);
    setProcedureCode(demo.input.procedureCode);
    setCity(demo.input.city);
    setHospitalBilledAmount(String(demo.input.hospitalBilledAmount));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({
      patientId,
      procedureCode,
      city,
      hospitalBilledAmount,
    });
    router.push(`/${role}?${params.toString()}`);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-10 text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand-600">
          Healthcare mediation demo
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          One case record.
          <br />
          <span className="text-brand-600">Three perspectives.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600">
          All portals read from a single <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">reconcile_case</code>{' '}
          response — pick a role, load a demo patient, and see how billing, coverage, and financing
          line up.
        </p>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        {ROLES.map((r) => (
          <button
            key={r.role}
            type="button"
            onClick={() => setRole(r.role)}
            className={`rounded-2xl border p-4 text-left transition ${
              role === r.role
                ? 'border-brand-400 bg-brand-50 shadow-card ring-2 ring-brand-200'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <span className="text-2xl">{r.icon}</span>
            <p className="mt-2 font-semibold text-slate-900">{r.title}</p>
            <p className="mt-1 text-xs text-slate-500">{r.description}</p>
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {DEMO_CASES.map((demo) => (
          <button
            key={demo.id}
            type="button"
            onClick={() => loadDemo(demo.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              demo.variant === 'gotcha'
                ? 'border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100'
                : demo.variant === 'pending'
                  ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            {demo.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="card space-y-5">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900">Case details</h2>
          <p className="text-sm text-slate-500">These fields are sent to the MCP server as reconcile_case arguments.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Patient ID</span>
            <input
              className="input-field"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="PAT-01"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Procedure code</span>
            <input
              className="input-field"
              value={procedureCode}
              onChange={(e) => setProcedureCode(e.target.value)}
              placeholder="CGHS-CARD-001"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">City</span>
            <input
              className="input-field"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Chennai"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Hospital billed amount (INR)</span>
            <input
              className="input-field"
              type="number"
              min={0}
              value={hospitalBilledAmount}
              onChange={(e) => setHospitalBilledAmount(e.target.value)}
              required
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button type="submit" className="btn-primary">
            Open {ROLES.find((r) => r.role === role)?.title}
          </button>
          <p className="text-xs text-slate-500">No authentication — role picker only for this demo.</p>
        </div>
      </form>
    </div>
  );
}
