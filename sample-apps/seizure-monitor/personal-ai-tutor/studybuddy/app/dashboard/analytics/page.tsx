"use client";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from "recharts";

const studyHoursData = [
  { week: "W1", chemistry: 8, physics: 6, math: 7 },
  { week: "W2", chemistry: 10, physics: 5, math: 9 },
  { week: "W3", chemistry: 7, physics: 8, math: 6 },
  { week: "W4", chemistry: 12, physics: 9, math: 11 },
];

const quizScoreData = [
  { date: "Jul 20", score: 62 }, { date: "Jul 22", score: 70 },
  { date: "Jul 24", score: 68 }, { date: "Jul 26", score: 75 },
  { date: "Jul 28", score: 82 }, { date: "Jul 30", score: 87 },
];

const subjectRadarData = [
  { subject: "Equilibrium", score: 42 }, { subject: "Thermochemistry", score: 75 },
  { subject: "Electrochemistry", score: 68 }, { subject: "Kinetics", score: 82 },
  { subject: "Solutions", score: 90 }, { subject: "Organic", score: 55 },
];

const dailyHours = [
  { day: "Mon", hours: 2.5 }, { day: "Tue", hours: 3.2 }, { day: "Wed", hours: 1.8 },
  { day: "Thu", hours: 4.1 }, { day: "Fri", hours: 3.5 }, { day: "Sat", hours: 5.2 }, { day: "Sun", hours: 2.0 },
];

const topicProgress = [
  { topic: "Chemical Equilibrium", mastery: 42, questions: 45, correct: 19 },
  { topic: "Le Chatelier Principle", mastery: 68, questions: 30, correct: 20 },
  { topic: "Equilibrium Constant", mastery: 35, questions: 40, correct: 14 },
  { topic: "Ionic Equilibrium", mastery: 78, questions: 25, correct: 19 },
  { topic: "pH & Buffer Solutions", mastery: 85, questions: 20, correct: 17 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-sm">
        <div className="font-semibold text-slate-800 mb-1">{label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-600">{p.name}: <strong>{p.value}</strong></span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Analytics</h2>
        <p className="text-slate-500">Track your learning progress and identify improvement areas</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Study Hours", value: "47.3h", change: "+12h", positive: true, bg: "from-blue-500 to-indigo-600" },
          { label: "Avg Quiz Score", value: "87%", change: "+15%", positive: true, bg: "from-green-500 to-teal-600" },
          { label: "Flashcard Retention", value: "72%", change: "+8%", positive: true, bg: "from-purple-500 to-violet-600" },
          { label: "Topics Mastered", value: "34/52", change: "+6", positive: true, bg: "from-orange-500 to-amber-600" },
        ].map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className={`bg-gradient-to-br ${kpi.bg} rounded-2xl p-5 text-white`}>
            <div className="text-white/70 text-xs font-medium mb-1">{kpi.label}</div>
            <div className="text-3xl font-bold mb-1">{kpi.value}</div>
            <div className={`text-xs font-semibold ${kpi.positive ? "text-green-200" : "text-red-200"}`}>
              ↑ {kpi.change} this month
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quiz Score Trend */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-1">Quiz Score Trend</h3>
          <p className="text-slate-500 text-sm mb-4">Last 6 quiz sessions</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={quizScoreData}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis domain={[50, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="score" name="Score %" stroke="#2563EB" strokeWidth={2.5} fill="url(#scoreGrad)" dot={{ fill: "#2563EB", r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Subject Radar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-1">Subject Mastery Radar</h3>
          <p className="text-slate-500 text-sm mb-4">Chemistry topics overview</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={subjectRadarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#94a3b8" }} />
                <Radar name="Mastery" dataKey="score" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Weekly Study Hours */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-1">Weekly Study Hours by Subject</h3>
          <p className="text-slate-500 text-sm mb-4">Last 4 weeks</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studyHoursData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="chemistry" name="Chemistry" fill="#2563EB" radius={[4,4,0,0]} />
                <Bar dataKey="physics" name="Physics" fill="#7C3AED" radius={[4,4,0,0]} />
                <Bar dataKey="math" name="Math" fill="#06B6D4" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-3">
            {[{c:"bg-blue-500",l:"Chemistry"},{c:"bg-purple-600",l:"Physics"},{c:"bg-cyan-500",l:"Math"}].map((l,i)=>(
              <div key={i} className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded-sm ${l.c}`}/><span className="text-xs text-slate-500">{l.l}</span></div>
            ))}
          </div>
        </motion.div>

        {/* Daily hours this week */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-1">Daily Study Hours</h3>
          <p className="text-slate-500 text-sm mb-4">This week · Goal: 4h/day</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis domain={[0, 6]} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="hours" name="Hours" stroke="#06B6D4" strokeWidth={2.5} dot={{ fill: "#06B6D4", r: 4 }} />
                {/* Goal reference */}
                <Line type="monotone" dataKey={() => 4} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Goal" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Topic progress table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Topic-wise Performance Breakdown</h3>
          <p className="text-slate-500 text-sm">Chemistry – Class 12</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                {["Topic", "Mastery", "Questions Attempted", "Correct", "Accuracy", "Status"].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topicProgress.map((t, i) => {
                const accuracy = Math.round((t.correct / t.questions) * 100);
                const status = t.mastery >= 80 ? "Mastered" : t.mastery >= 60 ? "Good" : t.mastery >= 40 ? "Needs Work" : "Weak";
                const statusColor = t.mastery >= 80 ? "badge-green" : t.mastery >= 60 ? "badge-blue" : t.mastery >= 40 ? "badge-yellow" : "badge-red";
                return (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800 text-sm">{t.topic}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-slate-100 rounded-full">
                          <div className="h-2 rounded-full gradient-primary" style={{ width: `${t.mastery}%` }} />
                        </div>
                        <span className="text-sm font-bold text-slate-700">{t.mastery}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{t.questions}</td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{t.correct}</td>
                    <td className="px-6 py-4 text-slate-700 font-medium text-sm">{accuracy}%</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusColor}`}>{status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
