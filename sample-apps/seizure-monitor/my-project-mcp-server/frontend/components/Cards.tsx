import { formatINR } from '@/lib/utils';

export function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: 'danger' | 'success' | 'warning';
}) {
  const ring =
    highlight === 'danger'
      ? 'border-rose-200 bg-rose-50/50'
      : highlight === 'success'
        ? 'border-emerald-200 bg-emerald-50/50'
        : highlight === 'warning'
          ? 'border-amber-200 bg-amber-50/50'
          : 'border-slate-200/80 bg-white';

  return (
    <div className={`rounded-2xl border p-5 shadow-card ${ring}`}>
      <p className="stat-label">{label}</p>
      <p className="stat-value mt-1">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export function MoneyStat({
  label,
  amount,
  highlight,
}: {
  label: string;
  amount: number | null | undefined;
  highlight?: 'danger' | 'success' | 'warning';
}) {
  return <StatCard label={label} value={formatINR(amount)} highlight={highlight} />;
}

export function SectionCard({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="card">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center">
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

export function AlertBanner({
  variant,
  title,
  children,
}: {
  variant: 'error' | 'warning' | 'info';
  title: string;
  children?: React.ReactNode;
}) {
  const styles = {
    error: 'border-rose-200 bg-rose-50 text-rose-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    info: 'border-sky-200 bg-sky-50 text-sky-900',
  };

  return (
    <div className={`rounded-xl border px-4 py-3 ${styles[variant]}`}>
      <p className="text-sm font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm opacity-90">{children}</div>}
    </div>
  );
}
