'use client';

import Link from 'next/link';
import { useAuth, type UserRole } from '@/lib/auth-context';
import { CaseFileShell } from './CaseFileShell';

const ROLE_NAMES: Record<Exclude<UserRole, 'guest'>, string> = {
  hospital: 'Hospital Staff',
  patient: 'Patient',
  insurer: 'Insurance Agent',
};

const ROLE_TONES: Record<Exclude<UserRole, 'guest'>, 'ink' | 'verified' | 'slate'> = {
  hospital: 'ink',
  patient: 'verified',
  insurer: 'slate',
};

export function ProtectedPage({
  requiredRole,
  children,
}: {
  requiredRole: Exclude<UserRole, 'guest'>;
  children: React.ReactNode;
}) {
  const { user, isAuthenticated } = useAuth();

  // Case 1: Not Logged In
  if (!isAuthenticated || !user) {
    return (
      <CaseFileShell
        role={ROLE_NAMES[requiredRole]}
        roleTone={ROLE_TONES[requiredRole]}
        timeline={null}
      >
        <div className="glass mx-auto max-w-md rounded-2xl p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/20 backdrop-blur-md text-amber-800 text-xl font-bold">
            🔒
          </div>
          <h2 className="mt-4 text-xl font-extrabold text-slate-900">
            Login Required
          </h2>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            You must sign in as <strong className="text-slate-900">{ROLE_NAMES[requiredRole]}</strong> to access the {ROLE_NAMES[requiredRole]} portal.
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              href={`/login?role=${requiredRole}`}
              className="cm-button cm-button-primary py-2.5 text-xs font-bold w-full"
            >
              Sign In as {ROLE_NAMES[requiredRole]} →
            </Link>
            <Link
              href="/login"
              className="cm-button py-2.5 text-xs font-semibold w-full text-slate-700"
            >
              View All Role Logins
            </Link>
          </div>
        </div>
      </CaseFileShell>
    );
  }

  // Case 2: Logged In as a DIFFERENT Role (Access Restricted)
  if (user.role !== requiredRole) {
    const userRoleName = ROLE_NAMES[user.role as Exclude<UserRole, 'guest'>] || user.role;
    const allowedDashboard = `/${user.role}`;

    return (
      <CaseFileShell
        role={ROLE_NAMES[requiredRole]}
        roleTone={ROLE_TONES[requiredRole]}
        timeline={null}
      >
        <div className="mx-auto max-w-md rounded-2xl border border-amber-300/50 bg-amber-400/10 backdrop-blur-xl p-8 text-center shadow-lg shadow-amber-900/5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white text-xl font-bold shadow-2xs">
            🚫
          </div>
          <h2 className="mt-4 text-xl font-extrabold text-amber-950">
            Access Restricted
          </h2>
          <p className="mt-2 text-xs text-amber-900 leading-relaxed">
            You are signed in as <strong className="font-bold">{user.name} ({userRoleName})</strong>.
          </p>
          <p className="mt-1 text-xs text-amber-800">
            {userRoleName} accounts do not have permission to view the <strong className="font-bold">{ROLE_NAMES[requiredRole]} Portal</strong>.
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              href={allowedDashboard}
              className="cm-button cm-button-primary py-2.5 text-xs font-bold w-full"
            >
              Return to My {userRoleName} Dashboard →
            </Link>
            <Link
              href={`/login?role=${requiredRole}`}
              className="cm-button py-2.5 text-xs font-semibold w-full text-amber-900"
            >
              Switch Account / Login as {ROLE_NAMES[requiredRole]}
            </Link>
          </div>
        </div>
      </CaseFileShell>
    );
  }

  // Case 3: Authenticated and Authorized!
  return <>{children}</>;
}
