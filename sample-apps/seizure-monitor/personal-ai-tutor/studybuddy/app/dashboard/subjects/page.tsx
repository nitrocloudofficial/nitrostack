"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { BookOpen, Plus, ArrowRight, BarChart3, FileText, MessageCircle } from "lucide-react";

const subjects = [
  { name: "Chemistry", emoji: "⚗️", chapters: 16, uploaded: 8, score: 78, color: "from-blue-500 to-indigo-600", topics: ["Equilibrium","Thermodynamics","Electrochemistry"] },
  { name: "Physics", emoji: "⚡", chapters: 14, uploaded: 6, score: 65, color: "from-purple-500 to-violet-600", topics: ["Kinematics","Newton's Laws","Optics"] },
  { name: "Mathematics", emoji: "📐", chapters: 18, uploaded: 10, score: 82, color: "from-green-500 to-teal-600", topics: ["Calculus","Algebra","Coordinate Geometry"] },
  { name: "Biology", emoji: "🧬", chapters: 22, uploaded: 4, score: 71, color: "from-pink-500 to-rose-600", topics: ["Cell Biology","Genetics","Ecology"] },
];

export default function SubjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Subjects</h2>
          <p className="text-slate-500 text-sm">Manage your study material by subject</p>
        </div>
        <button className="flex items-center gap-2 gradient-primary text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-all">
          <Plus className="w-4 h-4" /> Add Subject
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {subjects.map((sub, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden card-hover group">
            <div className={`bg-gradient-to-r ${sub.color} p-5 relative`}>
              <div className="text-4xl mb-2">{sub.emoji}</div>
              <h3 className="text-xl font-bold text-white">{sub.name}</h3>
              <div className="text-white/70 text-sm">{sub.chapters} chapters · {sub.uploaded} uploaded</div>
              <div className="absolute top-4 right-4 bg-white/20 rounded-xl px-3 py-1">
                <span className="text-white font-bold">{sub.score}%</span>
              </div>
            </div>
            <div className="p-5">
              <div className="flex flex-wrap gap-1.5 mb-4">
                {sub.topics.map((t, j) => <span key={j} className="badge-blue text-xs px-2.5 py-1 rounded-full">{t}</span>)}
              </div>
              <div className="h-2 bg-slate-100 rounded-full mb-4">
                <div className={`h-2 rounded-full bg-gradient-to-r ${sub.color}`} style={{ width: `${sub.score}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Link href="/dashboard/tutor" className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-blue-50 transition-colors text-slate-600 hover:text-blue-600">
                  <MessageCircle className="w-4 h-4" /><span className="text-xs">Ask AI</span>
                </Link>
                <Link href="/dashboard/upload" className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-blue-50 transition-colors text-slate-600 hover:text-blue-600">
                  <FileText className="w-4 h-4" /><span className="text-xs">Notes</span>
                </Link>
                <Link href="/dashboard/analytics" className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-blue-50 transition-colors text-slate-600 hover:text-blue-600">
                  <BarChart3 className="w-4 h-4" /><span className="text-xs">Analytics</span>
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
