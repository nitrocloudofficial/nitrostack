import { VerificationStamp } from './VerificationStamp';

export type VerificationRailItem = {
  context: string;
  status: 'verified' | 'pending';
  label?: string;
  verb?: 'Verified' | 'Cross-checked';
};

export function VerificationRail({ items }: { items: VerificationRailItem[] }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="border-b border-white/40 pb-2 mb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Source Verification
        </h2>
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.context} className="rounded-xl border border-white/50 bg-white/30 backdrop-blur-md p-2.5">
            <p className="text-xs font-bold text-slate-800 mb-1">{item.context}</p>
            <VerificationStamp
              status={item.status}
              label={item.label}
              verb={item.verb}
              compact
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
