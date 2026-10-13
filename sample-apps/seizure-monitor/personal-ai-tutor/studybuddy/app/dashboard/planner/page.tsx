"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight, Clock, BookOpen, Target, Zap, CheckCircle, AlertCircle } from "lucide-react";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const PLAN_DATA = {
  "2025-07-31": { tasks: ["Equilibrium Constant revision", "10 MCQ practice"], hours: 2, type: "revision" },
  "2025-08-01": { tasks: ["Le Chatelier Principle", "Ionic Equilibrium intro", "5 Numerical"], hours: 3, type: "study" },
  "2025-08-02": { tasks: ["pH & Buffer solutions", "Mock Test: Equilibrium"], hours: 4, type: "mock" },
  "2025-08-03": { tasks: ["Weak topics revision", "Flashcard review"], hours: 2, type: "revision" },
  "2025-08-04": { tasks: ["Full chapter revision", "15 Mixed MCQ"], hours: 3, type: "study" },
  "2025-08-05": { tasks: ["Rest day", "Optional: 5 easy questions"], hours: 1, type: "rest" },
  "2025-08-06": { tasks: ["Full Mock Test", "Performance analysis"], hours: 4, type: "mock" },
};

const KANBAN = {
  today: [
    { text: "Equilibrium Constant (Kc, Kp)", subject: "Chemistry", time: "45 min", priority: "high" },
    { text: "Practice 15 JEE MCQs", subject: "Chemistry", time: "30 min", priority: "high" },
    { text: "Review Le Chatelier notes", subject: "Chemistry", time: "25 min", priority: "medium" },
  ],
  thisWeek: [
    { text: "Ionic Equilibrium chapter", subject: "Chemistry", time: "2h", priority: "medium" },
    { text: "pH and Buffer solutions", subject: "Chemistry", time: "1.5h", priority: "high" },
    { text: "Newton's Laws – Friction numericals", subject: "Physics", time: "1h", priority: "low" },
  ],
  completed: [
    { text: "Dynamic Equilibrium basics", subject: "Chemistry", time: "30 min", priority: "done" },
    { text: "Kc/Kp formula practice", subject: "Chemistry", time: "20 min", priority: "done" },
  ],
};

const typeConfig = {
  study: { label: "Study", color: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  revision: { label: "Revision", color: "bg-purple-500", text: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  mock: { label: "Mock Test", color: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  rest: { label: "Rest", color: "bg-green-500", text: "text-green-700", bg: "bg-green-50 border-green-200" },
};

const priorityConfig = {
  high: "border-l-red-400 bg-red-50",
  medium: "border-l-yellow-400 bg-yellow-50",
  low: "border-l-blue-400 bg-blue-50",
  done: "border-l-green-400 bg-green-50 opacity-60",
};

function KanbanCard({ item }: { item: any }) {
  return (
    <div className={`border-l-4 ${priorityConfig[item.priority]} rounded-r-xl p-3 mb-2`}>
      <div className="font-medium text-slate-800 text-sm">{item.text}</div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="badge-blue text-xs px-2 py-0.5 rounded-full">{item.subject}</span>
        <div className="flex items-center gap-1 text-slate-400"><Clock className="w-3 h-3" /><span className="text-xs">{item.time}</span></div>
      </div>
    </div>
  );
}

export default function PlannerPage() {
  const [view, setView] = useState<"calendar"|"kanban">("calendar");
  const now = new Date(2025, 6, 31); // Jul 31, 2025
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState("2025-07-31");

  const getDaysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (m: number, y: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(month, year);
  const firstDay = getFirstDay(month, year);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  const getDateKey = (day: number) => `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  const selectedPlan = PLAN_DATA[selectedDate as keyof typeof PLAN_DATA];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Revision Planner</h2>
          <p className="text-slate-500">AI-generated study schedule based on your exam date and performance</p>
        </div>
        <div className="flex gap-2 bg-white border border-slate-200 rounded-xl p-1">
          <button onClick={() => setView("calendar")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view==="calendar" ? "gradient-primary text-white" : "text-slate-600 hover:text-slate-900"}`}>
            <Calendar className="w-4 h-4" /> Calendar
          </button>
          <button onClick={() => setView("kanban")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view==="kanban" ? "gradient-primary text-white" : "text-slate-600 hover:text-slate-900"}`}>
            <Target className="w-4 h-4" /> Kanban
          </button>
        </div>
      </div>

      {/* Exam countdown */}
      <div className="gradient-primary rounded-2xl p-5 text-white flex items-center justify-between">
        <div>
          <div className="text-blue-100 text-sm mb-1">Target Exam</div>
          <div className="text-xl font-bold">JEE Main 2026 · Attempt 1</div>
          <div className="text-blue-200 text-sm mt-1">Currently: Chemical Equilibrium revision</div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-black">147</div>
          <div className="text-blue-200">days remaining</div>
        </div>
      </div>

      {view === "calendar" ? (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900 text-xl">{MONTHS[month]} {year}</h3>
              <div className="flex gap-2">
                <button onClick={() => { if (month === 0) { setMonth(11); setYear(y=>y-1); } else setMonth(m=>m-1); }}
                  className="p-2 rounded-xl hover:bg-slate-100 transition-colors"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
                <button onClick={() => { if (month === 11) { setMonth(0); setYear(y=>y+1); } else setMonth(m=>m+1); }}
                  className="p-2 rounded-xl hover:bg-slate-100 transition-colors"><ChevronRight className="w-5 h-5 text-slate-600" /></button>
              </div>
            </div>
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS_OF_WEEK.map(d => <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">{d}</div>)}
            </div>
            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
              {blanks.map(i => <div key={`b${i}`} />)}
              {days.map(day => {
                const key = getDateKey(day);
                const plan = PLAN_DATA[key as keyof typeof PLAN_DATA];
                const isSelected = key === selectedDate;
                const isToday = day === 31 && month === 6;
                return (
                  <button key={day} onClick={() => setSelectedDate(key)}
                    className={`relative p-2 rounded-xl text-sm flex flex-col items-center transition-all ${isSelected ? "gradient-primary text-white shadow-lg" : isToday ? "border-2 border-blue-500 text-blue-700 font-bold" : "hover:bg-slate-50"}`}>
                    <span className={`font-medium ${isSelected ? "text-white" : "text-slate-700"}`}>{day}</span>
                    {plan && !isSelected && (
                      <div className={`w-2 h-2 rounded-full mt-0.5 ${typeConfig[plan.type as keyof typeof typeConfig]?.color}`} />
                    )}
                    {plan && isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white/70 mt-0.5" />}
                  </button>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex gap-4 mt-4 pt-4 border-t border-slate-100">
              {Object.entries(typeConfig).map(([key, val]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${val.color}`} />
                  <span className="text-xs text-slate-500">{val.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Day detail */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-1">
              {selectedDate === "2025-07-31" ? "Today" : new Date(selectedDate).toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" })}
            </h3>
            {selectedPlan ? (
              <>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border mb-4 ${typeConfig[selectedPlan.type as keyof typeof typeConfig]?.bg} ${typeConfig[selectedPlan.type as keyof typeof typeConfig]?.text}`}>
                  {typeConfig[selectedPlan.type as keyof typeof typeConfig]?.label}
                </div>
                <div className="flex items-center gap-2 mb-4 text-slate-600 text-sm">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>Estimated: <strong>{selectedPlan.hours}h</strong></span>
                </div>
                <div className="space-y-2">
                  {selectedPlan.tasks.map((task, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-700">{task}</span>
                    </div>
                  ))}
                </div>
                <button className="mt-4 w-full gradient-primary text-white py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4" /> Start Study Session
                </button>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📅</div>
                <p className="text-slate-500 text-sm">No plan for this date yet.</p>
                <button className="mt-3 text-blue-600 text-sm font-medium hover:underline">+ Add tasks</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Kanban View */
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: "📌 Today", key: "today", color: "border-t-red-400" },
            { title: "📅 This Week", key: "thisWeek", color: "border-t-blue-400" },
            { title: "✅ Completed", key: "completed", color: "border-t-green-400" },
          ].map(col => (
            <motion.div key={col.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-2xl border border-slate-200 border-t-4 ${col.color} overflow-hidden`}>
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-900">{col.title}</h3>
                <p className="text-slate-400 text-xs">{KANBAN[col.key as keyof typeof KANBAN].length} tasks</p>
              </div>
              <div className="p-4">
                {KANBAN[col.key as keyof typeof KANBAN].map((item, i) => <KanbanCard key={i} item={item} />)}
                {col.key !== "completed" && (
                  <button className="w-full border-2 border-dashed border-slate-200 rounded-xl py-2.5 text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-all text-sm font-medium">+ Add task</button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
