import { Check } from 'lucide-react';

export interface SdlcCandidateData {
  model: string;
  fit_score: number;
  justification: string;
  pros?: string[];
  cons?: string[];
}

interface SdlcSelectorTabProps {
  candidates?: SdlcCandidateData[];
  selected: string;
  onSelect: (model: string) => void;
}

export default function SdlcSelectorTab({ candidates = [], selected, onSelect }: SdlcSelectorTabProps) {
  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h2 className="text-base font-semibold text-slate-800">Select an SDLC Methodology</h2>
        <p className="text-xs text-slate-500">Evaluated candidates based on SRD scope and timeline constraints.</p>
      </div>

      {candidates.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 border border-slate-100 rounded-xl text-slate-400 text-xs italic">
          No candidates evaluated yet. Run `list_sdlc_candidates` to generate options.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {candidates.map((c) => {
            const isSelected = selected === c.model;
            return (
              <div
                key={c.model}
                onClick={() => onSelect(c.model)}
                className={`cursor-pointer rounded-xl p-5 border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-pastel-purple/40 border-pastel-purple-accent shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-pastel-purple-accent">{c.fit_score}% Fit</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">{c.model}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">{c.justification}</p>
                </div>

                <button
                  className={`w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    isSelected
                      ? 'bg-pastel-purple-accent text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isSelected && <Check size={14} />}
                  {isSelected ? 'Selected' : 'Select Model'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}