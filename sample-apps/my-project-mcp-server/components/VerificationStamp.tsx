'use client';

type VerificationStampProps = {
  status: 'verified' | 'pending';
  label?: string;
  verb?: 'Verified' | 'Cross-checked';
  compact?: boolean;
};

export function VerificationStamp({
  status,
  label,
  verb = 'Verified',
  compact = false,
}: VerificationStampProps) {
  const isPending = status === 'pending';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-semibold ${
        compact ? 'px-1.5 py-px' : 'px-2 py-0.5'
      } ${
        isPending
          ? 'bg-amber-50 text-amber-800 border border-amber-200'
          : 'bg-teal-50 text-teal-800 border border-teal-200'
      }`}
    >
      <span
        aria-hidden
        className={`flex shrink-0 items-center justify-center rounded-full font-bold ${
          compact ? 'h-3 w-3 text-[8px]' : 'h-3.5 w-3.5 text-[10px]'
        } ${isPending ? 'bg-amber-500 text-white' : 'bg-teal-600 text-white'}`}
      >
        {isPending ? '!' : '✓'}
      </span>
      <span className={`font-medium truncate ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
        {isPending ? 'Pending' : compact ? (label ?? verb) : label ? `${verb} — ${label}` : verb}
      </span>
    </span>
  );
}
