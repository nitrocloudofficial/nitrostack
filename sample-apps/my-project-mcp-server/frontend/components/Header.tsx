'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { Role } from '@/lib/types';

const NAV: { role: Role; href: string; label: string; icon: string }[] = [
  { role: 'hospital', href: '/hospital', label: 'Hospital Portal', icon: '🏥' },
  { role: 'patient', href: '/patient', label: 'Patient Portal', icon: '🧑‍⚕️' },
  { role: 'insurer', href: '/insurer', label: 'Insurer Portal', icon: '🛡️' },
];

export function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isHome = pathname === '/';

  const query = searchParams.toString();
  const queryString = query ? `?${query}` : '';

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3 transition hover:opacity-90">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 font-display text-base font-bold text-white shadow-sm">
            CM
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-display text-lg font-bold leading-tight tracking-tight text-slate-900">
                Care Mediator
              </p>
              <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                MCP Shared Engine
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500">Cross-portal healthcare case reconciliation</p>
          </div>
        </Link>

        {!isHome && (
          <nav className="flex items-center gap-1 rounded-xl bg-slate-100/80 p-1">
            {NAV.map(({ href, label, icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={`${href}${queryString}`}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                    active
                      ? 'bg-white text-slate-900 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <span>{icon}</span>
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{label.split(' ')[0]}</span>
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-2">
          <Link href="/" className="btn-secondary text-xs sm:text-sm">
            {isHome ? '⚡ Launch Demo Case' : '← Change Case'}
          </Link>
        </div>
      </div>
    </header>
  );
}
