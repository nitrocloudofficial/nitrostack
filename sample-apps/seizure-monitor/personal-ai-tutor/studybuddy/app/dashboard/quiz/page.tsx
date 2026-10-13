"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, ChevronRight, CheckCircle, XCircle, RotateCcw, Download, Zap, BookOpen, Trophy } from "lucide-react";

type QuizMode = "config" | "playing" | "results";
type QuizType = "mcq" | "numerical" | "short";

const SAMPLE_QUIZ = [
  {
    id: 1, type: "mcq", difficulty: "Medium",
    question: "For the reaction N₂(g) + 3H₂(g) ⇌ 2NH₃(g), if the pressure is increased at constant temperature, the equilibrium will shift:",
    options: ["To the left (backward reaction)", "To the right (forward reaction)", "No change in equilibrium", "Both forward and backward equally"],
    correct: 1,
    explanation: "According to Le Chatelier's principle, increasing pressure favors the side with fewer moles of gas. Left side: 1+3=4 moles, Right side: 2 moles. So equilibrium shifts RIGHT.",
    source: "Ch-7, Page 13",
  },
  {
    id: 2, type: "mcq", difficulty: "Hard",
    question: "If Kc = 0.04 for the reaction H₂(g) + I₂(g) ⇌ 2HI(g) at 700K, what is Kp?",
    options: ["0.04", "0.04 × RT", "0.04 / RT", "Cannot be determined"],
    correct: 0,
    explanation: "For this reaction, Δn = 2 - (1+1) = 0. Since Kp = Kc(RT)^Δn and Δn=0, Kp = Kc = 0.04",
    source: "Ch-7, Page 18",
  },
  {
    id: 3, type: "mcq", difficulty: "Easy",
    question: "Which of the following does NOT affect the equilibrium constant (K)?",
    options: ["Temperature change", "Addition of catalyst", "Change in concentration", "Both B and C"],
    correct: 1,
    explanation: "A catalyst speeds up both forward and reverse reactions equally, so it does NOT change the value of K. Only temperature changes K.",
    source: "Ch-7, Page 11",
  },
  {
    id: 4, type: "numerical", difficulty: "Hard",
    question: "At 500°C, the equilibrium constant Kc for the synthesis of ammonia is 6.0×10⁻². If [N₂] = 1.5M and [H₂] = 3.0M at equilibrium, calculate [NH₃].",
    options: ["0.65 M", "0.92 M", "1.14 M", "1.43 M"],
    correct: 1,
    explanation: "Kc = [NH₃]²/[N₂][H₂]³ = 6×10⁻²\n[NH₃]² = 6×10⁻² × 1.5 × 27 = 2.43\n[NH₃] = √2.43 ≈ 0.92 M",
    source: "Ch-7, Page 20",
  },
  {
    id: 5, type: "mcq", difficulty: "Medium",
    question: "For an endothermic reaction at equilibrium, increasing temperature will:",
    options: ["Increase Kc", "Decrease Kc", "No effect on Kc", "First increase then decrease"],
    correct: 0,
    explanation: "For an endothermic reaction, heat is a reactant. Adding heat (increasing T) shifts equilibrium forward, increasing product concentration and thus Kc increases.",
    source: "Ch-7, Page 15",
  },
];

const difficultyColor: Record<string, string> = {
  Easy: "badge-green", Medium: "badge-yellow", Hard: "badge-red",
};

export default function QuizPage() {
  const [mode, setMode] = useState<QuizMode>("config");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(600); // 10 min
  const [quizType, setQuizType] = useState("mcq");
  const [questionCount, setQuestionCount] = useState(5);

  const q = SAMPLE_QUIZ[currentQ];
  const selected = answers[currentQ];
  const isRevealed = revealed[currentQ];

  const selectAnswer = (idx: number) => {
    if (isRevealed) return;
    setAnswers(prev => ({ ...prev, [currentQ]: idx }));
  };

  const submitAnswer = () => setRevealed(prev => ({ ...prev, [currentQ]: true }));

  const nextQuestion = () => {
    if (currentQ < SAMPLE_QUIZ.length - 1) setCurrentQ(c => c + 1);
    else setMode("results");
  };

  const score = Object.keys(answers).filter(k => answers[Number(k)] === SAMPLE_QUIZ[Number(k)].correct).length;
  const percentage = Math.round((score / SAMPLE_QUIZ.length) * 100);

  if (mode === "config") return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Quiz Generator</h2>
        <p className="text-slate-500">Generate AI-powered quizzes from your uploaded notes</p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
        <div>
          <label className="block font-semibold text-slate-700 mb-3">Source Material</label>
          <select className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800">
            <option>Ch-7 Equilibrium.pdf – Class 12 Chemistry</option>
            <option>Kinematics Notes.pdf – Class 12 Physics</option>
          </select>
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-3">Quiz Type</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { val: "mcq", label: "📝 MCQ", desc: "4 options, single correct" },
              { val: "numerical", label: "🔢 Numerical", desc: "JEE-style problems" },
              { val: "assertion", label: "⚖️ Assertion-Reason", desc: "CBSE/NEET pattern" },
              { val: "short", label: "✍️ Short Answer", desc: "2-5 mark descriptive" },
            ].map(t => (
              <button key={t.val} onClick={() => setQuizType(t.val)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${quizType === t.val ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-300"}`}>
                <div className="font-bold text-slate-800 text-sm">{t.label}</div>
                <div className="text-slate-500 text-xs mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-3">Number of Questions: {questionCount}</label>
          <input type="range" min={5} max={30} value={questionCount} onChange={e => setQuestionCount(Number(e.target.value))}
            className="w-full accent-blue-600" />
          <div className="flex justify-between text-xs text-slate-400 mt-1"><span>5</span><span>30</span></div>
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-3">Difficulty</label>
          <div className="flex gap-3">
            {["Easy", "Medium", "Hard", "Mixed"].map(d => (
              <button key={d} className="flex-1 py-2.5 rounded-xl border-2 border-blue-500 bg-blue-50 text-blue-700 text-sm font-semibold">{d}</button>
            ))}
          </div>
        </div>
        <button onClick={() => setMode("playing")}
          className="w-full gradient-primary text-white py-4 rounded-xl font-bold text-base hover:opacity-90 transition-all flex items-center justify-center gap-2">
          <Zap className="w-5 h-5" /> Generate Quiz with AI
        </button>
      </div>
    </div>
  );

  if (mode === "results") return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <div className="text-6xl mb-4">{percentage >= 80 ? "🏆" : percentage >= 60 ? "🎯" : "📚"}</div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">{score}/{SAMPLE_QUIZ.length} Correct</h2>
        <div className={`text-5xl font-black mb-4 ${percentage >= 80 ? "text-green-500" : percentage >= 60 ? "text-yellow-500" : "text-red-500"}`}>{percentage}%</div>
        <p className="text-slate-500 mb-6">{percentage >= 80 ? "Excellent! You've mastered this topic! 🌟" : percentage >= 60 ? "Good progress! Keep practicing the weak areas." : "Don't worry — review the explanations and try again!"}</p>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[{label:"Correct",val:score,color:"text-green-600"},{label:"Wrong",val:SAMPLE_QUIZ.length-score,color:"text-red-500"},{label:"Accuracy",val:`${percentage}%`,color:"text-blue-600"}].map((s,i)=>(
            <div key={i} className="bg-slate-50 rounded-xl p-3">
              <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
              <div className="text-slate-500 text-xs">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setMode("playing"); setCurrentQ(0); setAnswers({}); setRevealed({}); }}
            className="flex-1 flex items-center justify-center gap-2 border border-slate-200 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-colors">
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 gradient-primary text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-all">
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>
      {/* Question review */}
      <div className="space-y-4">
        {SAMPLE_QUIZ.map((q, i) => {
          const userAns = answers[i];
          const isCorrect = userAns === q.correct;
          return (
            <div key={i} className={`bg-white rounded-2xl border-2 p-5 ${isCorrect ? "border-green-200" : "border-red-200"}`}>
              <div className="flex items-start gap-3 mb-3">
                {isCorrect ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
                <p className="text-slate-800 text-sm font-medium">{q.question}</p>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-sm">
                <span className="font-semibold text-green-700">Correct: </span>
                <span className="text-green-700">{q.options[q.correct]}</span>
              </div>
              <div className="mt-2 bg-blue-50 rounded-xl p-3 text-xs text-blue-700">💡 {q.explanation}</div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-900">Question {currentQ + 1} / {SAMPLE_QUIZ.length}</span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${difficultyColor[q.difficulty]}`}>{q.difficulty}</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl">
          <Timer className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-slate-800">9:47</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-100 rounded-full">
        <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
          style={{ width: `${((currentQ + 1) / SAMPLE_QUIZ.length) * 100}%` }} />
      </div>

      {/* Question card */}
      <motion.div key={currentQ} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-start gap-2 mb-6">
          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-md flex-shrink-0 mt-0.5">{q.type.toUpperCase()}</span>
          <p className="text-slate-900 font-semibold leading-relaxed">{q.question}</p>
        </div>
        <div className="space-y-3 mb-6">
          {q.options.map((opt, i) => {
            let cls = "quiz-option border-2 border-slate-200 rounded-xl p-4 text-sm";
            if (isRevealed) {
              if (i === q.correct) cls += " correct";
              else if (i === selected && i !== q.correct) cls += " incorrect";
            } else if (selected === i) cls += " selected";
            return (
              <button key={i} onClick={() => selectAnswer(i)} className={`w-full text-left flex items-start gap-3 ${cls}`}>
                <span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center flex-shrink-0 font-bold text-xs">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-slate-700">{opt}</span>
                {isRevealed && i === q.correct && <CheckCircle className="w-5 h-5 text-green-500 ml-auto flex-shrink-0" />}
                {isRevealed && i === selected && i !== q.correct && <XCircle className="w-5 h-5 text-red-500 ml-auto flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {isRevealed && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
            <div className="font-semibold text-blue-800 text-sm mb-1">💡 Explanation</div>
            <p className="text-blue-700 text-sm">{q.explanation}</p>
            <div className="text-blue-500 text-xs mt-1">Source: {q.source}</div>
          </motion.div>
        )}

        <div className="flex gap-3">
          {!isRevealed ? (
            <button onClick={submitAnswer} disabled={selected === undefined} className="flex-1 gradient-primary text-white py-3 rounded-xl font-bold disabled:opacity-50 hover:opacity-90 transition-all">
              Submit Answer
            </button>
          ) : (
            <button onClick={nextQuestion} className="flex-1 gradient-primary text-white py-3 rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2">
              {currentQ < SAMPLE_QUIZ.length - 1 ? "Next Question" : "See Results"} <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </motion.div>

      <div className="text-center text-slate-400 text-xs">📖 Source: {q.source} · Chapter 7 – Chemical Equilibrium</div>
    </div>
  );
}
