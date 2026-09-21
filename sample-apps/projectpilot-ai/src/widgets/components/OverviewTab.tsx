import { FileText, Calendar, CheckCircle2, Clock } from 'lucide-react';

interface OverviewTabProps {
  data?: {
    srd_summary?: {
      project_duration_weeks?: number;
      deadline?: string;
      parsed_requirements?: Array<{ id: string; title: string; description: string; priority: string }>;
    };
    selected_sdlc_model?: string;
    team_members?: Array<{ name: string; preferred_role?: string }>;
  };
  selectedSdlc: string;
}

export default function OverviewTab({ data, selectedSdlc }: OverviewTabProps) {
  const duration = data?.srd_summary?.project_duration_weeks ?? 0;
  const deadline = data?.srd_summary?.deadline ?? 'Not set';
  const reqs = data?.srd_summary?.parsed_requirements ?? [];
  const members = data?.team_members ?? [];
  const activeSdlc = data?.selected_sdlc_model || selectedSdlc;

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-pastel-blue/60 p-4 rounded-xl border border-blue-100">
          <div className="flex justify-between items-center text-slate-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Duration</span>
            <Calendar size={18} className="text-pastel-blue-accent" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{duration > 0 ? `${duration} Weeks` : 'N/A'}</div>
          <p className="text-xs text-slate-500 mt-1">Target: {deadline}</p>
        </div>

        <div className="bg-pastel-purple/60 p-4 rounded-xl border border-purple-100">
          <div className="flex justify-between items-center text-slate-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Requirements</span>
            <FileText size={18} className="text-pastel-purple-accent" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{reqs.length} Parsed</div>
          <p className="text-xs text-slate-500 mt-1">
            {reqs.filter((r) => r.priority === 'high').length} High Priority
          </p>
        </div>

        <div className="bg-pastel-amber/60 p-4 rounded-xl border border-amber-100">
          <div className="flex justify-between items-center text-slate-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Model</span>
            <Clock size={18} className="text-pastel-amber-accent" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{activeSdlc}</div>
          <p className="text-xs text-slate-500 mt-1">Selected Framework</p>
        </div>

        <div className="bg-pastel-green/60 p-4 rounded-xl border border-green-100">
          <div className="flex justify-between items-center text-slate-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Roster</span>
            <CheckCircle2 size={18} className="text-pastel-green-accent" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{members.length} Members</div>
          <p className="text-xs text-slate-500 mt-1">Registered for project</p>
        </div>
      </div>

      {/* Extracted Requirements Section */}
      <div className="border border-slate-100 rounded-xl p-5 bg-white shadow-sm">
        <h3 className="text-base font-semibold text-slate-800 mb-3">Extracted Requirements</h3>
        {reqs.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No requirements ingested yet. Execute `parse_srd` to populate.</p>
        ) : (
          <ul className="space-y-2.5">
            {reqs.map((req) => (
              <li key={req.id} className="flex items-start gap-3 p-3 rounded-lg bg-pastel-slate text-sm">
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-mono text-xs font-semibold">
                  {req.id}
                </span>
                <span className="text-slate-700">{req.description}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}