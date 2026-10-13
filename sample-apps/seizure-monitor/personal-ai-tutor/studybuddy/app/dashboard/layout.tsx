"use client";
import { useState, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, BookOpen, Upload, MessageCircle, CreditCard,
  FileQuestion, Calendar, Microscope, BarChart3, Settings,
  GraduationCap, Bell, Search, ChevronDown, X, Menu,
  Flame, Star, Zap, LogOut, User, ChevronRight
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/subjects", icon: BookOpen, label: "My Subjects" },
  { href: "/dashboard/upload", icon: Upload, label: "Upload Notes" },
  { href: "/dashboard/tutor", icon: MessageCircle, label: "AI Tutor" },
  { href: "/dashboard/flashcards", icon: CreditCard, label: "Flashcards" },
  { href: "/dashboard/quiz", icon: FileQuestion, label: "Quizzes" },
  { href: "/dashboard/planner", icon: Calendar, label: "Revision Planner" },
  { href: "/dashboard/research", icon: Microscope, label: "Research Assistant" },
  { href: "/dashboard/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-slate-900 z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">StudyBuddy</div>
              <div className="text-blue-400 text-xs font-semibold">AI</div>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* User card */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50">
            <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-sm">PS</div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-semibold truncate">Priya Sharma</div>
              <div className="text-slate-400 text-xs">Class 12 · JEE</div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
          {/* Streak badge */}
          <div className="mt-3 flex items-center justify-between bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="flame text-lg">🔥</span>
              <span className="text-orange-400 font-bold text-sm">12 Day Streak</span>
            </div>
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${isActive ? "bg-blue-600/20 text-blue-400 border border-blue-600/30" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
                <item.icon className={`w-4 h-4 ${isActive ? "text-blue-400" : ""}`} />
                {item.label}
                {isActive && <ChevronRight className="w-3 h-3 ml-auto text-blue-400" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-white text-xs font-semibold">Pro Plan</span>
            </div>
            <div className="text-slate-400 text-xs">Unlimited AI queries</div>
            <div className="mt-2 w-full bg-slate-700 rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: "65%" }} />
            </div>
            <div className="text-slate-500 text-xs mt-1">650 / 1000 queries used</div>
          </div>
          <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const currentPage = navItems.find(n => n.href === pathname)?.label || "Dashboard";

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="lg:hidden text-slate-600 hover:text-slate-900">
          <Menu className="w-6 h-6" />
        </button>
        <div>
          <h1 className="font-bold text-slate-900 text-lg">{currentPage}</h1>
          <p className="text-slate-500 text-xs">StudyBuddy AI · Class 12 Chemistry</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-xl px-4 py-2 w-64">
          <Search className="w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search notes, topics..." className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none flex-1" />
        </div>
        {/* Notifications */}
        <button className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors">
          <Bell className="w-5 h-5 text-slate-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-sm cursor-pointer">PS</div>
      </div>
    </header>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {children}
          </motion.div>
        </main>
        {/* Mobile bottom nav */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-40">
          {navItems.slice(0, 5).map((item) => (
            <Link key={item.href} href={item.href} className="flex-1 flex flex-col items-center py-3 gap-1">
              <item.icon className="w-5 h-5 text-slate-500" />
              <span className="text-slate-500 text-xs">{item.label.split(" ")[0]}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
