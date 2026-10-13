import { Suspense } from 'react';
import { CaseLauncher } from '@/components/CaseLauncher';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <Suspense fallback={<div className="p-12 text-center text-slate-500">Loading Case Launcher...</div>}>
        <CaseLauncher />
      </Suspense>
    </div>
  );
}
