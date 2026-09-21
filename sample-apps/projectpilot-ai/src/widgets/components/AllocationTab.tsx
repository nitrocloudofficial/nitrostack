interface AllocationTabProps {
  allocations?: Array<{
    member_name: string;
    assigned_role: string;
    match_score: number;
    daily_hours: number;
    match_reasons: string[];
  }>;
}

export default function AllocationTab({ allocations = [] }: AllocationTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-semibold text-slate-800">Team Allocations</h2>
        <span className="text-xs text-slate-500">{allocations.length} Assigned Members</span>
      </div>

      {allocations.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 border border-slate-100 rounded-xl text-slate-400 text-xs italic">
          No role allocations computed yet. Execute `allocate_roles` to calculate matches.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {allocations.map((a) => (
            <div key={a.member_name} className="p-4 rounded-xl bg-pastel-green/40 border border-green-100">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{a.member_name}</h3>
                  <span className="text-xs text-green-700 font-medium">{a.assigned_role}</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-white font-semibold text-green-800 border border-green-200">
                  {a.match_score}% Match
                </span>
              </div>
              <div className="text-xs text-slate-500 mb-2">{a.daily_hours} hrs/day</div>
              <div className="flex flex-wrap gap-1">
                {a.match_reasons.map((r, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-white/80 text-slate-600">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}