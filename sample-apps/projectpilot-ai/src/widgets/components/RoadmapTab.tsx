import { ShieldAlert } from 'lucide-react';

interface RoadmapTabProps {
  sdlcModel: string;
  roadmap?: {
    phases?: Array<{ phase_number: number; name: string; duration_weeks: number; objectives: string[] }>;
    milestones?: Array<{ id: string; title: string; target_week: number }>;
    risks?: Array<{ id: string; category: string; description: string; mitigation: string }>;
  };
}

export default function RoadmapTab({ sdlcModel, roadmap }: RoadmapTabProps) {
  const phases = roadmap?.phases ?? [];
  const milestones = roadmap?.milestones ?? [];
  const risks = roadmap?.risks ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-semibold text-slate-800">Roadmap Breakdown ({sdlcModel})</h2>
        <span className="text-xs text-slate-500">Phases: {phases.length}</span>
      </div>

      {phases.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 border border-slate-100 rounded-xl text-slate-400 text-xs italic">
          Roadmap not generated. Call `build_roadmap` after selecting an SDLC model.
        </div>
      ) : (
        <div className="space-y-3">
          {phases.map((p) => {
            const milestone = milestones.find((m) => m.target_week >= p.phase_number);
            return (
              <div
                key={p.phase_number}
                className="p-4 rounded-xl bg-pastel-amber/40 border border-amber-100 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center"
              >
                <div>
                  <span className="text-xs font-semibold text-amber-700">
                    Phase {p.phase_number} • {p.duration_weeks} Weeks
                  </span>
                  <h3 className="font-semibold text-slate-800 text-sm">{p.name}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">{p.objectives.join(', ')}</p>
                </div>
                {milestone && (
                  <span className="text-xs font-medium px-3 py-1 bg-white rounded-full text-slate-600 border border-amber-200">
                    Milestone: {milestone.title}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Identified Risks */}
      {risks.length > 0 && (
        <div className="space-y-2">
          {risks.map((r) => (
            <div key={r.id} className="p-4 rounded-xl bg-pastel-rose/40 border border-rose-100">
              <div className="flex items-center gap-2 text-rose-700 font-semibold text-sm mb-1">
                <ShieldAlert size={16} /> Risk: {r.category}
              </div>
              <p className="text-xs text-slate-700">
                <strong>{r.description}</strong> — <em>Mitigation: {r.mitigation}</em>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}