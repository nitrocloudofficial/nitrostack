type ScoreTone = "green" | "amber" | "red";

interface ScoreCardProps {
  label: string;
  score: number;
  helperText?: string;
  tone?: ScoreTone;
}

function autoTone(score: number): ScoreTone {
  if (score >= 75) return "green";
  if (score >= 50) return "amber";
  return "red";
}

const toneClasses: Record<ScoreTone, { text: string; bar: string }> = {
  green: { text: "text-green-600", bar: "bg-green-500" },
  amber: { text: "text-amber-600", bar: "bg-amber-500" },
  red: { text: "text-red-600", bar: "bg-red-500" },
};

export default function ScoreCard({
  label,
  score,
  helperText,
  tone,
}: ScoreCardProps) {
  const resolvedTone = toneClasses[tone ?? autoTone(score)];

  return (
    <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
      <p className="text-sm font-medium text-gray-500">{label}</p>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className={`text-3xl font-bold ${resolvedTone.text}`}>
          {score}
        </span>
        <span className="text-sm text-gray-400">/100</span>
      </div>

      {helperText && (
        <p className="mt-2 text-xs text-gray-500">{helperText}</p>
      )}

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${resolvedTone.bar}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  );
}
