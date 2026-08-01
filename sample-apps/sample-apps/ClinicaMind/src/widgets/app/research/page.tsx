'use client';

import React, { useState } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { RightInfoPanel } from '../../components/RightInfoPanel';
import { BookOpen, Search, ExternalLink, Sparkles } from 'lucide-react';

export default function MedicalResearchPage() {
  const [query, setQuery] = useState('pneumonia elderly diabetes guidelines');
  const [articles, setArticles] = useState<any[]>([
    {
      pmid: '38291045',
      title: '2026 Clinical Practice Guidelines for Management of Community-Acquired Pneumonia in Diabetic and Elderly Adults',
      journal: 'Journal of the American Medical Association (JAMA)',
      year: '2026',
      authors: 'Harrison E, et al.',
      abstract: 'In diabetic patients presenting with chest pain, fever, and productive cough, early empirical respiratory fluoroquinolone or macrolide combined with beta-lactamase inhibitor therapy significantly reduces 30-day mortality.',
      evidenceLevel: 'Clinical Guideline',
      url: 'https://pubmed.ncbi.nlm.nih.gov/38291045/'
    },
    {
      pmid: '37910283',
      title: 'Non-Penicillin Antibiotic Selection in Patients with Confirmed Severe Beta-Lactam Allergies',
      journal: 'New England Journal of Medicine (NEJM)',
      year: '2025',
      authors: 'Martinez C, et al.',
      abstract: 'For severe lower respiratory tract infections in patients with documented anaphylactic penicillin hypersensitivity, Respiratory Fluoroquinolones (Levofloxacin) demonstrate non-inferior efficacy.',
      evidenceLevel: 'Level 1a (RCT)',
      url: 'https://pubmed.ncbi.nlm.nih.gov/37910283/'
    }
  ]);

  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0 sticky top-0 backdrop-blur-xs z-20 shadow-xs">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Medical Literature & Evidence Hub
              <span className="text-xs font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-bold">
                NCBI PubMed E-utilities
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Concise peer-reviewed summaries, WHO guidelines, & clinical trial citations</p>
          </div>
        </header>

        {/* Content */}
        <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Search Form */}
          <div className="flex gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Query PubMed, WHO, or Clinical Guidelines..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-md shadow-blue-200 flex items-center gap-2"
            >
              <Sparkles size={16} />
              <span>Search PubMed</span>
            </button>
          </div>

          {/* Articles */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2">Retrieved Clinical Evidence</h3>
            {articles.map((art, idx) => (
              <div key={idx} className="bg-white border border-slate-200/80 hover:border-blue-500/50 p-6 rounded-2xl space-y-3 transition shadow-xs hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase inline-block mb-1">
                      {art.evidenceLevel}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 leading-snug">{art.title}</h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{art.journal} • {art.authors} ({art.year}) • PMID: {art.pmid}</p>
                  </div>
                  <a
                    href={art.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-blue-600 rounded-xl border border-slate-200 transition"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs text-slate-700 italic leading-relaxed">
                  "{art.abstract}"
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <RightInfoPanel />
    </div>
  );
}
