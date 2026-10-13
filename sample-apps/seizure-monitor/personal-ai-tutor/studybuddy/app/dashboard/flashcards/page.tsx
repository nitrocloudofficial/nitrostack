"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCw, Check, Minus, ChevronLeft, ChevronRight, Shuffle, Plus, Zap } from "lucide-react";

type Difficulty = "easy" | "medium" | "hard" | "unrated";

type Flashcard = {
  id: number;
  front: string;
  back: string;
  difficulty: Difficulty;
  nextReview: string;
  tags: string[];
};

const FLASHCARDS: Flashcard[] = [
  { id: 1, front: "What is Chemical Equilibrium?", back: "A state in a reversible reaction where the rate of forward reaction equals the rate of reverse reaction, and concentrations of reactants and products remain constant.", difficulty: "unrated", nextReview: "Today", tags: ["Equilibrium", "Basics"] },
  { id: 2, front: "State Le Chatelier's Principle", back: "If a system at equilibrium is disturbed by changing conditions (concentration, temperature, pressure), the system adjusts itself to oppose the change and re-establish equilibrium.", difficulty: "unrated", nextReview: "Today", tags: ["Le Chatelier", "Principle"] },
  { id: 3, front: "Formula for Equilibrium Constant (Kc)", back: "For aA + bB ⇌ cC + dD:\n\nKc = [C]ᶜ[D]ᵈ / [A]ᵃ[B]ᵇ\n\nOnly includes gaseous and aqueous species (not pure solids/liquids)", difficulty: "unrated", nextReview: "Today", tags: ["Formula", "Kc"] },
  { id: 4, front: "Relationship between Kp and Kc", back: "Kp = Kc(RT)^Δn\n\nWhere:\n• R = 0.0821 L·atm·mol⁻¹·K⁻¹\n• T = temperature in Kelvin\n• Δn = moles of gaseous products − moles of gaseous reactants", difficulty: "unrated", nextReview: "Today", tags: ["Formula", "Kp", "Kc"] },
  { id: 5, front: "What is the Reaction Quotient (Q)?", back: "Q has the same expression as Kc but uses initial concentrations.\n\n• If Q < K → forward reaction proceeds\n• If Q > K → reverse reaction proceeds\n• If Q = K → system is at equilibrium", difficulty: "unrated", nextReview: "Today", tags: ["Reaction Quotient", "Q"] },
  { id: 6, front: "Effect of temperature on Kc for exothermic reaction?", back: "For exothermic reactions (ΔH < 0):\n\nIncreasing temperature → Kc DECREASES (equilibrium shifts backward)\n\nDecreasing temperature → Kc INCREASES (equilibrium shifts forward)", difficulty: "unrated", nextReview: "Today", tags: ["Temperature", "Exothermic"] },
];

const difficultyConfig = {
  easy: { label: "Easy ✅", color: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500" },
  medium: { label: "Medium ⚡", color: "bg-yellow-100 text-yellow-700 border-yellow-200", dot: "bg-yellow-500" },
  hard: { label: "Hard 🔥", color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
  unrated: { label: "Unrated", color: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
};

export default function FlashcardsPage() {
  const [cards, setCards] = useState(FLASHCARDS);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionDone, setSessionDone] = useState<number[]>([]);
  const [mode, setMode] = useState<"browse"|"session">("browse");

  const card = cards[currentIdx];

  const markDifficulty = (diff: Difficulty) => {
    setCards(prev => prev.map(c => c.id === card.id ? { ...c, difficulty: diff } : c));
    setSessionDone(prev => [...prev, card.id]);
    setFlipped(false);
    if (currentIdx < cards.length - 1) setCurrentIdx(i => i + 1);
  };

  const shuffle = () => {
    setCards(prev => [...prev].sort(() => Math.random() - 0.5));
    setCurrentIdx(0);
    setFlipped(false);
  };

  const counts = { easy: cards.filter(c=>c.difficulty==="easy").length, medium: cards.filter(c=>c.difficulty==="medium").length, hard: cards.filter(c=>c.difficulty==="hard").length };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Flashcards</h2>
          <p className="text-slate-500 text-sm">Chapter 7 – Chemical Equilibrium · {cards.length} cards</p>
        </div>
        <div className="flex gap-3">
          <button onClick={shuffle} className="flex items-center gap-2 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors">
            <Shuffle className="w-4 h-4" /> Shuffle
          </button>
          <button className="flex items-center gap-2 gradient-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-all">
            <Plus className="w-4 h-4" /> Add Card
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total", value: cards.length, color: "text-slate-900", bg: "bg-white" },
          { label: "Easy ✅", value: counts.easy, color: "text-green-600", bg: "bg-green-50" },
          { label: "Medium ⚡", value: counts.medium, color: "text-yellow-600", bg: "bg-yellow-50" },
          { label: "Hard 🔥", value: counts.hard, color: "text-red-600", bg: "bg-red-50" },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-xl p-4 border border-slate-100 text-center`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-slate-500 text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Flashcard */}
      <div className="flex flex-col items-center">
        <div className="w-full max-w-2xl">
          {/* Progress */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-500 text-sm">{currentIdx + 1} / {cards.length}</span>
            <div className="flex items-center gap-2">
              {card.tags.map(tag => <span key={tag} className="badge-blue text-xs px-2 py-0.5 rounded-full">{tag}</span>)}
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${difficultyConfig[card.difficulty].color}`}>
              {difficultyConfig[card.difficulty].label}
            </span>
          </div>

          {/* Card */}
          <div className="flip-card w-full" style={{ height: "320px" }} onClick={() => setFlipped(f => !f)}>
            <div className={`flip-card-inner w-full h-full relative ${flipped ? "flipped" : ""}`}>
              {/* Front */}
              <div className="flip-card-front absolute inset-0 bg-white rounded-2xl border-2 border-slate-200 p-8 flex flex-col items-center justify-center shadow-lg cursor-pointer hover:border-blue-300 transition-colors group">
                <div className="absolute top-4 left-4 text-xs text-slate-400">📖 QUESTION</div>
                <p className="text-xl font-bold text-slate-900 text-center leading-relaxed">{card.front}</p>
                <div className="absolute bottom-4 right-4 flex items-center gap-1 text-slate-400 text-xs group-hover:text-blue-500 transition-colors">
                  <RotateCw className="w-3 h-3" /> Click to flip
                </div>
              </div>
              {/* Back */}
              <div className="flip-card-back absolute inset-0 gradient-primary rounded-2xl p-8 flex flex-col items-center justify-center shadow-lg cursor-pointer">
                <div className="absolute top-4 left-4 text-xs text-blue-200">✅ ANSWER</div>
                <p className="text-white text-center leading-relaxed whitespace-pre-line">{card.back}</p>
                <div className="absolute bottom-4 right-4 flex items-center gap-1 text-blue-200 text-xs">
                  <RotateCw className="w-3 h-3" /> Click to flip back
                </div>
              </div>
            </div>
          </div>

          {/* Rating buttons (show after flip) */}
          <AnimatePresence>
            {flipped && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 flex gap-3">
                <button onClick={() => markDifficulty("hard")} className="flex-1 bg-red-50 border-2 border-red-200 text-red-600 py-3 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                  🔥 Hard
                </button>
                <button onClick={() => markDifficulty("medium")} className="flex-1 bg-yellow-50 border-2 border-yellow-200 text-yellow-600 py-3 rounded-xl font-bold hover:bg-yellow-100 transition-colors flex items-center justify-center gap-2">
                  ⚡ Medium
                </button>
                <button onClick={() => markDifficulty("easy")} className="flex-1 bg-green-50 border-2 border-green-200 text-green-600 py-3 rounded-xl font-bold hover:bg-green-100 transition-colors flex items-center justify-center gap-2">
                  ✅ Easy
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          {!flipped && (
            <div className="mt-4 flex items-center justify-center gap-4">
              <button onClick={() => { if (currentIdx > 0) { setCurrentIdx(i=>i-1); setFlipped(false); } }}
                disabled={currentIdx === 0}
                className="p-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-slate-500 text-sm">Click card to reveal answer</span>
              <button onClick={() => { if (currentIdx < cards.length-1) { setCurrentIdx(i=>i+1); setFlipped(false); } }}
                disabled={currentIdx === cards.length-1}
                className="p-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Card list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">All Flashcards</h3>
          <span className="text-slate-500 text-sm">{sessionDone.length} reviewed this session</span>
        </div>
        <div className="divide-y divide-slate-100">
          {cards.map((c, i) => (
            <button key={c.id} onClick={() => { setCurrentIdx(i); setFlipped(false); }}
              className={`w-full text-left flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors ${currentIdx === i ? "bg-blue-50" : ""}`}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${difficultyConfig[c.difficulty].dot}`} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 text-sm truncate">{c.front}</div>
                <div className="text-slate-400 text-xs truncate mt-0.5">{c.back.slice(0, 60)}...</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${difficultyConfig[c.difficulty].color} flex-shrink-0`}>{difficultyConfig[c.difficulty].label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
