'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Factory, BrainCircuit, Package, BarChart3, ShieldCheck, Activity, Zap, ArrowRight, ChevronDown, Layers, Cpu, Database, Code2, Network, Handshake } from 'lucide-react';

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setMounted(true);
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    root.classList.toggle('dark');
    setIsDark(!isDark);
  };



  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-300 relative overflow-hidden font-sans">
      {/* Background CSS Animations */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-slate-900 to-black/80 dark:from-indigo-950 dark:via-[#050816] dark:to-black"></div>
        {/* Animated Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full mix-blend-screen filter blur-3xl animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-4000"></div>
        
        {/* Particle Network Simulation */}
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className={`absolute rounded-full bg-blue-400/20 shadow-[0_0_10px_rgba(56,189,248,0.5)]`}
            style={{
              width: Math.random() * 6 + 2 + 'px',
              height: Math.random() * 6 + 2 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animation: `float ${Math.random() * 10 + 10}s ease-in-out infinite alternate`,
              animationDelay: `-${Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      {/* Navbar */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto backdrop-blur-md bg-white/5 dark:bg-black/10 rounded-b-2xl border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Factory className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">FactoryOS</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#features" className="hover:text-[var(--primary)] transition-colors">Features</a>
          <a href="#tech" className="hover:text-[var(--primary)] transition-colors">Technology</a>
          <Link href="/dashboard" className="hover:text-[var(--primary)] transition-colors">Dashboard</Link>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            {isDark ? <Zap className="w-5 h-5 text-yellow-400" /> : <Zap className="w-5 h-5 text-slate-800" />}
          </button>
          <Link href="/dashboard" className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition-all font-medium text-sm hidden sm:block">
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-[90vh] px-4 text-center">
        
        {/* Floating Cards Background elements */}
        <motion.div 
          animate={{ y: [-10, 10, -10] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-[10%] top-[20%] p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl hidden lg:block"
        >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"></div>
            <div className="text-sm font-medium">Line A: Optimal</div>
          </div>
        </motion.div>

        <motion.div 
          animate={{ y: [10, -10, 10] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute right-[15%] top-[30%] p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl hidden lg:block"
        >
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-blue-400" />
            <div className="text-sm font-medium">OEE: 94.2%</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold tracking-wide uppercase">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            System Online
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 dark:from-white dark:to-slate-500 drop-shadow-sm">
            FactoryOS
          </h1>
          <p className="text-xl md:text-3xl font-light text-slate-400 dark:text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            The Autonomous Operating System for Smart Factories
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/dashboard"
              className="group flex items-center gap-2 px-8 py-4 rounded-full bg-[var(--primary)] hover:bg-blue-600 text-white font-semibold transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)]"
            >
              Launch Dashboard
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-10"
        >
          <a href="#features" className="p-3 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center">
            <ChevronDown className="w-6 h-6 text-slate-400" />
          </a>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">AI-Powered Intelligence</h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">Next-generation multi-agent system managing every aspect of your facility automatically.</p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {[
            { icon: BrainCircuit, title: "Predictive Maintenance", desc: "ML-driven failure prediction before breakdowns occur.", color: "text-blue-400", bg: "bg-blue-400/10" },
            { icon: Package, title: "Smart Inventory", desc: "Automated tracking and reorder point optimization.", color: "text-emerald-400", bg: "bg-emerald-400/10" },
            { icon: Handshake, title: "Supplier Negotiation", desc: "AI agents that handle procurement autonomously.", color: "text-purple-400", bg: "bg-purple-400/10" },
            { icon: BarChart3, title: "Production Optimization", desc: "Real-time routing and line balancing.", color: "text-amber-400", bg: "bg-amber-400/10" },
            { icon: ShieldCheck, title: "Safety Compliance", desc: "Continuous monitoring for hazard prevention.", color: "text-rose-400", bg: "bg-rose-400/10" },
            { icon: Activity, title: "Real-Time Monitoring", desc: "Millisecond-level telemetry and insights.", color: "text-cyan-400", bg: "bg-cyan-400/10" }
          ].map((feature, idx) => (
            <motion.div 
              key={idx}
              variants={itemVariants}
              className="group p-6 rounded-3xl bg-[var(--bg-card)] backdrop-blur-xl border border-white/5 hover:border-white/10 transition-all hover:-translate-y-1 shadow-lg"
            >
              <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6`}>
                <feature.icon className={`w-7 h-7 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Technology Stack */}
      <section id="tech" className="relative z-10 py-24 px-6 max-w-7xl mx-auto border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Enterprise-Grade Stack</h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">Built with modern technologies for maximum performance and reliability.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {[
            { icon: Code2, name: "React + Next.js 14" },
            { icon: Database, name: "SQLite + Express" },
            { icon: Network, name: "NitroStack MCP" },
            { icon: Cpu, name: "Python ML Agents" },
            { icon: Layers, name: "Framer Motion" }
          ].map((tech, idx) => (
            <div key={idx} className="flex items-center gap-3 px-6 py-4 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <tech.icon className="w-5 h-5 text-[var(--primary)]" />
              <span className="font-medium">{tech.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-10 text-center border-t border-white/5 text-slate-500">
        <p>© 2026 FactoryOS. The Future of Manufacturing.</p>
      </footer>

      {/* Global CSS overrides for the landing page animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes float {
          0% { transform: translateY(0) translateX(0); opacity: 0.2; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-100px) translateX(20px); opacity: 0.2; }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}} />
    </div>
  );
}
