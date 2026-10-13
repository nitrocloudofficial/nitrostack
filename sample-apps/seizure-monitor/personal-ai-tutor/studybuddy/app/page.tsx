"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  BookOpen, Brain, Zap, Target, Microscope, Globe, Star,
  ChevronRight, Play, Upload, MessageCircle, BarChart3,
  CheckCircle, ArrowRight, Sparkles, Users, Award, TrendingUp,
  Menu, X, GraduationCap
} from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Smart Notes",
    desc: "Extract key concepts, formulas, and definitions from any document automatically.",
    color: "from-blue-500 to-indigo-600",
    bg: "bg-blue-50",
    badge: "badge-blue",
  },
  {
    icon: Brain,
    title: "AI Tutor Chat",
    desc: "Ask questions in natural language and get step-by-step expert explanations.",
    color: "from-purple-500 to-violet-600",
    bg: "bg-purple-50",
    badge: "badge-purple",
  },
  {
    icon: Zap,
    title: "Auto Quiz Generator",
    desc: "Generate MCQs, JEE-style numerical, and short-answer questions instantly.",
    color: "from-yellow-500 to-orange-500",
    bg: "bg-yellow-50",
    badge: "badge-yellow",
  },
  {
    icon: Target,
    title: "Personalized Revision",
    desc: "AI creates daily & weekly study plans based on your performance analytics.",
    color: "from-green-500 to-teal-600",
    bg: "bg-green-50",
    badge: "badge-green",
  },
  {
    icon: Microscope,
    title: "Research Assistant",
    desc: "Summarize research papers, extract citations, methods, and conclusions.",
    color: "from-cyan-500 to-blue-500",
    bg: "bg-cyan-50",
    badge: "badge-cyan",
  },
  {
    icon: Globe,
    title: "Bilingual Learning",
    desc: "Explain concepts in English, Hindi, or Hinglish — your choice, always.",
    color: "from-pink-500 to-rose-500",
    bg: "bg-pink-50",
    badge: "badge-red",
  },
];

const stats = [
  { label: "Active Students", value: "50,000+", icon: Users },
  { label: "Questions Solved", value: "2.5M+", icon: CheckCircle },
  { label: "Faster Revision", value: "60%", icon: TrendingUp },
  { label: "Exam Patterns", value: "15+", icon: Award },
];

const testimonials = [
  {
    name: "Priya Sharma",
    role: "JEE Aspirant, Class 12",
    content: "StudyBuddy AI ne meri chemistry ki preparation ekdum badal di. Le Chatelier principle ab crystal clear hai!",
    avatar: "PS",
    rating: 5,
  },
  {
    name: "Rahul Verma",
    role: "MBBS Student, AIIMS Delhi",
    content: "The research assistant helped me summarize 20+ papers in minutes. My literature review was done in one afternoon!",
    avatar: "RV",
    rating: 5,
  },
  {
    name: "Ananya Singh",
    role: "B.Tech CSE, IIT Bombay",
    content: "Quiz generator is insane! Generated 50 questions from my notes and helped me ace my Data Structures exam.",
    avatar: "AS",
    rating: 5,
  },
];

const steps = [
  { step: "01", title: "Upload Your Notes", desc: "PDF, PPT, DOCX, or even handwritten photos", icon: Upload },
  { step: "02", title: "AI Processes Content", desc: "Extracts concepts, creates embeddings, indexes knowledge", icon: Brain },
  { step: "03", title: "Chat & Learn", desc: "Ask questions, generate quizzes, get revision plans", icon: MessageCircle },
  { step: "04", title: "Track Progress", desc: "Analytics show weak topics and improvement over time", icon: BarChart3 },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [typedText, setTypedText] = useState("");
  const fullText = "Your Personal AI Tutor for Every Subject";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < fullText.length) {
        setTypedText(fullText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 50);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? "glass shadow-lg" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-slate-900">StudyBuddy <span className="gradient-text">AI</span></span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-600 hover:text-blue-600 transition-colors font-medium">Features</a>
              <a href="#how-it-works" className="text-slate-600 hover:text-blue-600 transition-colors font-medium">How It Works</a>
              <a href="#testimonials" className="text-slate-600 hover:text-blue-600 transition-colors font-medium">Reviews</a>
              <Link href="/auth/signin" className="text-slate-600 hover:text-blue-600 transition-colors font-medium">Sign In</Link>
              <Link href="/auth/signup" className="gradient-primary text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
                Get Started <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="md:hidden glass px-4 pb-4">
            <div className="flex flex-col gap-3 pt-2">
              <a href="#features" className="text-slate-700 font-medium py-2">Features</a>
              <a href="#how-it-works" className="text-slate-700 font-medium py-2">How It Works</a>
              <Link href="/auth/signin" className="text-slate-700 font-medium py-2">Sign In</Link>
              <Link href="/auth/signup" className="gradient-primary text-white px-4 py-2 rounded-lg font-semibold text-center">Get Started</Link>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="gradient-hero min-h-screen flex items-center pt-16 relative overflow-hidden">
        {/* Background particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full opacity-10"
              style={{
                width: `${150 + i * 80}px`, height: `${150 + i * 80}px`,
                background: `radial-gradient(circle, ${['#2563EB','#4F46E5','#06B6D4','#7C3AED','#2563EB','#4F46E5'][i]}, transparent)`,
                top: `${[10, 60, 20, 70, 40, 80][i]}%`,
                left: `${[5, 70, 40, 15, 85, 55][i]}%`,
                animation: `float ${4 + i}s ease-in-out infinite`,
                animationDelay: `${i * 0.5}s`,
              }}
            />
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
              <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full text-sm font-medium mb-6 border border-white/20">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Powered by GPT-4o & LangChain RAG
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                {typedText}
                <span className="typing-cursor" />
              </h1>
              <p className="text-lg text-blue-100 mb-8 leading-relaxed">
                Upload notes, ask doubts, generate quizzes, and build a personalized revision plan with AI.
                Supports <span className="text-cyan-400 font-semibold">English, Hindi & Hinglish</span>.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/auth/signup" className="gradient-primary bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 glow-blue">
                  Get Started Free <ArrowRight className="w-5 h-5" />
                </Link>
                <Link href="/dashboard" className="bg-white/10 border border-white/30 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/20 transition-all flex items-center gap-2 backdrop-blur-sm">
                  <Play className="w-5 h-5 text-cyan-400" /> Watch Demo
                </Link>
              </div>
              <div className="mt-10 flex items-center gap-6">
                <div className="flex -space-x-3">
                  {["PS","RV","AS","MK","PL"].map((av, i) => (
                    <div key={i} className="w-10 h-10 rounded-full gradient-primary border-2 border-white flex items-center justify-center text-white text-xs font-bold">{av}</div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">{[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}</div>
                  <p className="text-blue-200 text-sm">50,000+ students trust StudyBuddy AI</p>
                </div>
              </div>
            </motion.div>

            {/* Right — Dashboard Mockup */}
            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="float">
              <div className="glass rounded-2xl p-4 shadow-2xl border border-white/20">
                {/* Mock browser bar */}
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <div className="flex-1 mx-3 bg-white/10 rounded-md px-3 py-1 text-white/60 text-xs">studybuddy.ai/dashboard</div>
                </div>
                {/* Mock dashboard content */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                    <div className="text-cyan-400 text-xs font-medium mb-1">Study Streak 🔥</div>
                    <div className="text-white text-2xl font-bold">12 Days</div>
                    <div className="text-white/60 text-xs mt-1">Keep it up!</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                    <div className="text-purple-400 text-xs font-medium mb-1">Quiz Score 📊</div>
                    <div className="text-white text-2xl font-bold">87%</div>
                    <div className="text-white/60 text-xs mt-1">+5% this week</div>
                  </div>
                </div>
                {/* Mock chat */}
                <div className="bg-white/5 rounded-xl p-3 mb-3 border border-white/10">
                  <div className="text-white/40 text-xs mb-2">AI Tutor Chat</div>
                  <div className="flex gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center text-white text-xs">S</div>
                    <div className="bg-white/10 rounded-lg px-3 py-1.5 text-white text-xs">Le Chatelier principle explain karo Hinglish me</div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full gradient-primary flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">AI</div>
                    <div className="bg-blue-500/20 rounded-lg px-3 py-1.5 text-blue-100 text-xs">Agar equilibrium me koi change aata hai, toh system us change ko oppose karta hai! ⚗️</div>
                  </div>
                </div>
                {/* Mock quiz cards */}
                <div className="grid grid-cols-3 gap-2">
                  {["MCQ", "JEE", "NEET"].map((type, i) => (
                    <div key={i} className="bg-white/10 rounded-lg p-2 text-center border border-white/10">
                      <div className="text-cyan-400 text-xs font-bold">{type}</div>
                      <div className="text-white/60 text-xs">{[12,8,15][i]} Qs</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="text-center">
                <stat.icon className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-slate-400 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="badge-blue text-sm font-semibold px-3 py-1 rounded-full inline-block mb-4">✨ Features</span>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Everything You Need to <span className="gradient-text">Ace Your Exams</span></h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">From smart notes to AI-powered quizzes, StudyBuddy AI covers every aspect of personalized learning.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className="bg-white rounded-2xl p-6 border border-slate-100 card-hover group cursor-pointer">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-600 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="badge-purple text-sm font-semibold px-3 py-1 rounded-full inline-block mb-4">🚀 How It Works</span>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Start Learning in <span className="gradient-text">4 Simple Steps</span></h2>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }} viewport={{ once: true }} className="relative text-center">
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <s.icon className="w-8 h-8 text-white" />
                </div>
                <div className="absolute top-4 right-0 text-6xl font-black text-slate-100 select-none hidden lg:block">{s.step}</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-slate-600 text-sm">{s.desc}</p>
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-blue-200 to-purple-200 -translate-x-8" style={{ width: "calc(100% - 2rem)" }} />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="badge-green text-sm font-semibold px-3 py-1 rounded-full inline-block mb-4">⭐ Reviews</span>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Loved by <span className="gradient-text">50,000+ Students</span></h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm card-hover">
                <div className="flex items-center gap-1 mb-4">{[...Array(t.rating)].map((_, j) => <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}</div>
                <p className="text-slate-700 mb-6 leading-relaxed">"{t.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-sm">{t.avatar}</div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">{t.name}</div>
                    <div className="text-slate-500 text-xs">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 gradient-hero">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
            <div className="text-5xl mb-6">🎓</div>
            <h2 className="text-4xl font-bold text-white mb-4">Ready to Transform Your Learning?</h2>
            <p className="text-blue-200 text-lg mb-8">Join 50,000+ students who are already learning smarter with StudyBuddy AI</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/auth/signup" className="bg-white text-blue-600 px-10 py-4 rounded-xl font-bold text-lg hover:shadow-xl hover:scale-105 transition-all">
                Start Free Today
              </Link>
              <Link href="/dashboard" className="border border-white/30 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-all">
                View Demo Dashboard
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center"><GraduationCap className="w-5 h-5 text-white" /></div>
                <span className="font-bold text-white text-lg">StudyBuddy AI</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Your personal AI tutor for school, college, and competitive exam preparation.</p>
            </div>
            {[
              { title: "Product", links: ["Features", "Quiz Generator", "AI Tutor", "Analytics"] },
              { title: "Exams", links: ["JEE Main/Advanced", "NEET", "CBSE", "University"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="text-white font-semibold mb-4">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link, j) => <li key={j}><a href="#" className="text-slate-400 hover:text-blue-400 transition-colors text-sm">{link}</a></li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm">© 2025 StudyBuddy AI. Built for NITROSTACK Hackathon.</p>
            <div className="flex gap-4 text-slate-500 text-sm">
              <a href="#" className="hover:text-blue-400 transition-colors">Privacy</a>
              <a href="#" className="hover:text-blue-400 transition-colors">Terms</a>
              <a href="#" className="hover:text-blue-400 transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
