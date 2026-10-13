interface ReportCardProps {
  areaName: string;
  executiveSummary: string;
  reasons: string[];
  risks: string[];
  suggestions: string[];
}

export default function ReportCard({
  areaName,
  executiveSummary,
  reasons,
  risks,
  suggestions,
}: ReportCardProps) {
  return (
    <div className="rounded-2xl bg-white p-7 shadow-lg ring-1 ring-gray-100">
      <h3 className="text-xl font-semibold text-gray-900">
        Executive Summary
      </h3>

      <p className="mt-3 leading-relaxed text-gray-600">{executiveSummary}</p>

      <div className="mt-7 grid gap-7 sm:grid-cols-2">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-green-600">
            Why {areaName}?
          </h4>

          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            {reasons.map((reason, index) => (
              <li key={index} className="flex gap-2">
                <span className="text-green-500">✓</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-amber-600">
            Risks
          </h4>

          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            {risks.map((risk, index) => (
              <li key={index} className="flex gap-2">
                <span className="text-amber-500">!</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-7">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Suggestions
        </h4>

        <ul className="mt-3 space-y-2 text-sm text-gray-600">
          {suggestions.map((suggestion, index) => (
            <li key={index} className="flex gap-2">
              <span className="text-blue-500">→</span>
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
