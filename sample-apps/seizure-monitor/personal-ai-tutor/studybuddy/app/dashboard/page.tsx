"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Flame, Target, TrendingUp, BookOpen, Upload, MessageCircle,
  FileQuestion, CreditCard, ArrowRight, CheckCircle, AlertTriangle,
  Clock, Zap, BarChart3, Star
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";

const weeklyData = [
  { day: "Mon", hours: 2.5 }, { day: "Tue", hours: 3.2 }, { day: "Wed", hours: 1.8 },
  { day: "Thu", hours: 4.1 }, { day: "Fri", hours: 3.5 }, { day: "Sat", hours: 5.2 }, { day: "Sun", hours: 2.0 },
];

const todayTasks = [
  { done: true, text: "Revise Chemical Equilibrium – Le Chatelier Principle", time: "30 min" },
  { done: true, text: "Practice 15 JEE MCQs on Equilibrium Constants", time: "25 min" },
  { done: false, text: "Read Ionic Equilibrium notes", time: "40 min" },
  { done: false, text: "Solve 5 Numerical on pH calculations", time: "20 min" },
  { done: false, text: "Review Flashcards – Acids & Bases", time: "15 min" },
];

const weakTopics = [
  { topic: "Equilibrium Constant (Kc, Kp)", subject: "Chemistry", score: 42, color: "text-red-500", bg: "bg-red-50", bar: "bg-red-400" },
  { topic: "Newton's Laws – Friction", subject: "Physics", score: 55, color: "text-orange-500", bg: "bg-orange-50", bar: "bg-orange-400" },
  { topic: "Differential Calculus", subject: "Mathematics", score: 61, color: "text-yellow-600", bg: "bg-yellow-50", bar: "bg-yellow-400" },
];

const recentUploads = [
  { name: "Ch-7 Equilibrium.pdf", subject: "Chemistry", pages: 24, progress: 85, time: "2h ago", color: "from-blue-500 to-indigo-600" },
  { name: "Kinematics Notes.pdf", subject: "Physics", pages: 18, progress: 100, time: "1d ago", color: "from-purple-500 to-violet-600" },
  { name: "Organic Chemistry PPT.pptx", subject: "Chemistry", pages: 45, progress: 30, time: "3d ago", color: "from-green-500 to-teal-600" },
];

const quickActions = [
  { label: "Upload PDF", icon: Upload, href: "/dashboard/upload", color: "from-blue-500 to-indigo-600" },
  { label: "Ask AI", icon: MessageCircle, href: "/dashboard/tutor", color: "from-purple-500 to-violet-600" },
  { label: "Generate Quiz", icon: FileQuestion, href: "/dashboard/quiz", color: "from-green-500 to-teal-600" },
  { label: "Flashcards", icon: CreditCard, href: "/dashboard/flashcards", color: "from-orange-500 to-amber-500" },
];

const subjectScores = [
  { name: "Chemistry", score: 78, color: "bg-blue-500" },
  { name: "Physics", score: 65, color: "bg-purple-500" },
  { name: "Mathematics", score: 82, color: "bg-green-500" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="gradient-primary rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Good evening, Priya! 👋</h2>
          <p className="text-blue-100">You have 3 tasks remaining today. Keep up the momentum!</p>
        </div>
        <Link href="/dashboard/tutor"
          className="bg-white text-blue-600 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-50 transition-colors whitespace-nowrap">
          <Zap className="w-4 h-4" /> Ask AI Now
        </Link>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Study Streak", value: "12 Days", icon: Flame, color: "text-orange-500", bg: "bg-orange-50", sub: "Personal best: 18 days" },
          { label: "Quiz Accuracy", value: "87%", icon: Target, color: "text-green-600", bg: "bg-green-50", sub: "+5% this week" },
          { label: "Hours This Week", value: "22.3h", icon: Clock, color: "text-blue-600", bg: "bg-blue-50", sub: "Goal: 25h" },
          { label: "Topics Mastered", value: "34", icon: Star, color: "text-purple-600", bg: "bg-purple-50", sub: "8 remaining" },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="stat-card">
            <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className={`text-2xl font-bold ${stat.color} mb-0.5`}>{stat.value}</div>
            <div className="text-slate-700 text-sm font-medium">{stat.label}</div>
            <div className="text-slate-400 text-xs mt-1">{stat.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Tasks */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Today's Study Plan</h3>
              <p className="text-slate-500 text-sm">AI-generated for July 31, 2025</p>
            </div>
            <span className="badge-blue text-xs font-semibold px-2.5 py-1 rounded-full">2/5 Done</span>
          </div>
          <div className="space-y-3">
            {todayTasks.map((task, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${task.done ? "bg-green-50" : "bg-slate-50 hover:bg-blue-50 cursor-pointer"}`}>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${task.done ? "border-green-500 bg-green-500" : "border-slate-300"}`}>
                  {task.done && <CheckCircle className="w-3 h-3 text-white fill-white" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${task.done ? "text-slate-400 line-through" : "text-slate-800"}`}>{task.text}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-400">{task.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 bg-slate-100 rounded-full h-2">
            <div className="bg-gradient-to-r from-green-500 to-emerald-400 h-2 rounded-full" style={{ width: "40%" }} />
          </div>
          <p className="text-slate-500 text-xs mt-1">40% complete · Est. 1h 35min remaining</p>
        </motion.div>

        {/* Study Hours Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 text-lg mb-1">Study Hours</h3>
          <p className="text-slate-500 text-sm mb-4">This week</p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip formatter={(v: number) => [`${v}h`, "Hours"]} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                <Area type="monotone" dataKey="hours" stroke="#2563EB" strokeWidth={2} fill="url(#colorHours)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {subjectScores.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-sm font-bold text-slate-900">{s.score}%</div>
                <div className="h-1.5 bg-slate-100 rounded-full mt-1"><div className={`${s.color} h-1.5 rounded-full`} style={{ width: `${s.score}%` }} /></div>
                <div className="text-slate-500 text-xs mt-1">{s.name.slice(0,4)}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weak Topics */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-500" /> Weak Topics</h3>
              <p className="text-slate-500 text-sm">Needs your attention</p>
            </div>
            <Link href="/dashboard/analytics" className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">View all <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="space-y-4">
            {weakTopics.map((topic, i) => (
              <div key={i} className={`p-4 ${topic.bg} rounded-xl`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">{topic.topic}</div>
                    <div className="text-slate-500 text-xs">{topic.subject}</div>
                  </div>
                  <span className={`${topic.color} font-bold text-lg`}>{topic.score}%</span>
                </div>
                <div className="h-2 bg-white/60 rounded-full">
                  <div className={`${topic.bar} h-2 rounded-full transition-all`} style={{ width: `${topic.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Uploads */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-500" /> Recent Uploads</h3>
              <p className="text-slate-500 text-sm">Your study materials</p>
            </div>
            <Link href="/dashboard/upload" className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">Upload <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="space-y-4">
            {recentUploads.map((file, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${file.color} flex items-center justify-center flex-shrink-0`}>
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 text-sm truncate">{file.name}</div>
                  <div className="text-slate-500 text-xs">{file.subject} · {file.pages} pages · {file.time}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full">
                      <div className={`h-1.5 rounded-full bg-gradient-to-r ${file.color}`} style={{ width: `${file.progress}%` }} />
                    </div>
                    <span className="text-xs text-slate-500">{file.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <h3 className="font-bold text-slate-900 text-lg mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, i) => (
            <Link key={i} href={action.href}
              className={`bg-gradient-to-br ${action.color} rounded-2xl p-5 text-white card-hover flex flex-col items-center gap-3 text-center group`}>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <action.icon className="w-6 h-6" />
              </div>
              <span className="font-bold text-sm">{action.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
