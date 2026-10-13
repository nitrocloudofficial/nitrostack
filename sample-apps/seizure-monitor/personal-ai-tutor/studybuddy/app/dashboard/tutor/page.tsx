"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Mic, MicOff, Volume2, VolumeX, BookOpen, ChevronDown,
  Lightbulb, RefreshCw, Copy, ThumbsUp, ThumbsDown, Sparkles,
  FileText, Globe, Zap, Brain, GraduationCap, MessageCircle
} from "lucide-react";

type Message = {
  id: number;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
  sources?: string[];
};

const SAMPLE_DOCS = [
  { id: 1, name: "Ch-7 Equilibrium.pdf", pages: 24, active: true },
  { id: 2, name: "Kinematics Notes.pdf", pages: 18, active: false },
  { id: 3, name: "Organic Chemistry.pptx", pages: 45, active: false },
];

const SUGGESTED_QUESTIONS = [
  "Explain dynamic equilibrium in simple terms",
  "Le Chatelier principle in Hinglish",
  "What is the difference between Kc and Kp?",
  "Give me 5 JEE questions on Equilibrium",
  "Summarize the key formulas in this chapter",
  "What are common mistakes students make in this topic?",
];

const DIFFICULTY_MODES = ["Beginner", "Intermediate", "Exam Mode", "Research Mode"];
const LANGUAGES = ["🇬🇧 English", "🇮🇳 Hindi", "✨ Hinglish"];

const DEMO_RESPONSES: Record<string, string> = {
  default: `**Great question!** Based on your uploaded notes from **Chapter 7 – Chemical Equilibrium**, here's a clear explanation:

## Dynamic Equilibrium

Dynamic equilibrium is a state in a **reversible reaction** where:
- The **rate of forward reaction = rate of reverse reaction**
- Concentrations of reactants and products **remain constant** (not zero)
- The reaction is still happening — just at equal rates in both directions

### 📝 Key Points from Your Notes:

1. **It's not static** — molecules are continuously reacting
2. **Macroscopic properties** (color, concentration, pressure) appear unchanged
3. Only achieved in a **closed system**

### ⚗️ Example:
$$N_2(g) + 3H_2(g) ⇌ 2NH_3(g)$$

At equilibrium, N₂ and H₂ are still reacting to form NH₃, while NH₃ is simultaneously decomposing — but at the same rate.

### 🎯 For JEE:
Remember that **dynamic equilibrium ≠ equal concentrations**. The concentrations are constant, but not necessarily equal.

---
*Shall I generate practice questions on this topic?* ✨`,

  hinglish: `**Bilkul samajh aata hai!** 😄 Le Chatelier Principle ko simple Hinglish mein samjhao:

## Le Chatelier ka Rule 🧪

**Ek line mein:** Agar equilibrium mein disturb karo, toh system uss disturbance ko oppose karta hai!

### 🔥 Sochlo aise:

Imagine karo ek see-saw (jhula) hai — perfectly balanced hai. Agar ek side push karo, toh dusri side aati hai balance restore karne ke liye. **Exactly same hai equilibrium mein!**

### 3 Main Cases:

**1. Concentration change karo:**
- Reactant badhao → reaction forward jayegi (more product banega)
- Product badhao → reaction backward jayegi

**2. Pressure change karo (gases ke liye):**
- Pressure badhao → kam moles wali side favored hoti hai
- Example: N₂ + 3H₂ ⇌ 2NH₃ → pressure badhane se NH₃ banega (4 moles → 2 moles)

**3. Temperature change karo:**
- Exothermic reaction: temperature badhao → backward reaction hogi
- Endothermic reaction: temperature badhao → forward reaction hogi

### 💡 JEE Tip:
**Catalyst se equilibrium shift nahi hota** — sirf equilibrium reach karne ki speed badh jaati hai!

---
*Kuch aur puchna hai? Practice questions chahiye?* 🎯`,
};

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-2">
      {[0, 1, 2].map(i => (
        <div key={i} className={`w-2 h-2 rounded-full bg-blue-400 loading-dot`} />
      ))}
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple markdown-like rendering
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('## ')) return <h3 key={i} className="font-bold text-lg text-slate-900 mt-3 mb-1">{line.slice(3)}</h3>;
      if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-slate-800 mt-2 mb-1">{line.slice(4)}</h4>;
      if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold text-slate-900">{line.slice(2,-2)}</p>;
      if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 text-slate-700 text-sm">{line.slice(2)}</li>;
      if (line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.')) return <li key={i} className="ml-4 text-slate-700 text-sm list-decimal">{line.slice(2).trim()}</li>;
      if (line.startsWith('---')) return <hr key={i} className="border-slate-200 my-2" />;
      if (line.trim() === '') return <br key={i} />;
      // Bold text within lines
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={i} className="text-slate-700 text-sm leading-relaxed">
          {parts.map((part, j) => part.startsWith('**') ? <strong key={j} className="font-semibold text-slate-900">{part.slice(2,-2)}</strong> : part)}
        </p>
      );
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 mt-1">
          <Brain className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div className={isUser ? "chat-bubble-user px-4 py-3" : "chat-bubble-ai px-4 py-3"}>
          {isUser ? (
            <p className="text-white text-sm">{msg.content}</p>
          ) : (
            <div className="space-y-0.5">{renderContent(msg.content)}</div>
          )}
        </div>
        {!isUser && (
          <div className="flex items-center gap-2 px-1">
            <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors">
              <Copy className="w-3 h-3" />{copied ? "Copied!" : "Copy"}
            </button>
            <button className="text-slate-400 hover:text-green-500 transition-colors"><ThumbsUp className="w-3 h-3" /></button>
            <button className="text-slate-400 hover:text-red-500 transition-colors"><ThumbsDown className="w-3 h-3" /></button>
            <button className="text-slate-400 hover:text-blue-500 transition-colors"><Volume2 className="w-3 h-3" /></button>
          </div>
        )}
        <span className="text-xs text-slate-400 px-1">{msg.timestamp.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
          <span className="text-blue-700 font-bold text-xs">PS</span>
        </div>
      )}
    </motion.div>
  );
}

export default function AITutorPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: "ai", content: "Namaste! 🎓 I'm **StudyBuddy AI**, your personal tutor. I've loaded your **Chapter 7 – Equilibrium** notes.\n\nAsk me anything about Chemical Equilibrium — in English, Hindi, or Hinglish!\n\n*Try: \"Le Chatelier principle explain karo Hinglish mein\"*", timestamp: new Date(), sources: ["Ch-7 Equilibrium.pdf"] },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState(0);
  const [difficulty, setDifficulty] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [activeDoc, setActiveDoc] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput("");
    const userMsg: Message = { id: Date.now(), role: "user", content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));

    const isHinglish = msg.toLowerCase().includes("hinglish") || msg.toLowerCase().includes("hindi") || msg.toLowerCase().includes("karo") || msg.toLowerCase().includes("samjhao");
    const responseContent = isHinglish ? DEMO_RESPONSES.hinglish : DEMO_RESPONSES.default;

    const aiMsg: Message = {
      id: Date.now() + 1, role: "ai", content: responseContent, timestamp: new Date(),
      sources: ["Ch-7 Equilibrium.pdf - Pages 12-15"],
    };
    setLoading(false);
    setMessages(prev => [...prev, aiMsg]);
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* Left sidebar — docs */}
      <div className="hidden xl:flex flex-col w-60 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex-1">
          <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" /> Your Documents</h3>
          <div className="space-y-2">
            {SAMPLE_DOCS.map((doc, i) => (
              <button key={i} onClick={() => setActiveDoc(i)}
                className={`w-full text-left p-3 rounded-xl text-xs transition-all ${activeDoc === i ? "bg-blue-50 border border-blue-200 text-blue-700" : "bg-slate-50 hover:bg-slate-100 text-slate-600"}`}>
                <div className="font-semibold truncate">{doc.name}</div>
                <div className="text-slate-400 mt-0.5">{doc.pages} pages</div>
              </button>
            ))}
          </div>
          <button className="mt-3 w-full border-2 border-dashed border-slate-200 rounded-xl py-3 text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-all text-xs font-medium">
            + Upload Document
          </button>
        </div>
        {/* History */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h3 className="font-bold text-slate-900 text-sm mb-3">Recent Chats</h3>
          {["Equilibrium Basics", "Newton's Laws", "Organic Chemistry"].map((chat, i) => (
            <button key={i} className="w-full text-left py-2 px-2 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2">
              <MessageCircle className="w-3 h-3 text-slate-400" />{chat}
            </button>
          ))}
        </div>
      </div>

      {/* Main chat */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Chat header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm">StudyBuddy AI Tutor</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-slate-500 text-xs">Online · Reading Chapter 7</span></div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              {LANGUAGES.map((lang, i) => (
                <button key={i} onClick={() => setLanguage(i)}
                  className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-all ${language === i ? "bg-white shadow text-slate-900" : "text-slate-500"}`}>
                  {lang}
                </button>
              ))}
            </div>
            {/* Difficulty */}
            <select value={difficulty} onChange={e => setDifficulty(Number(e.target.value))}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white">
              {DIFFICULTY_MODES.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
          {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 mt-1"><Brain className="w-4 h-4 text-white" /></div>
              <div className="chat-bubble-ai px-4 py-3"><TypingDots /></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested questions */}
        <div className="px-4 py-2 border-t border-slate-100 flex gap-2 overflow-x-auto">
          {SUGGESTED_QUESTIONS.slice(0, 3).map((q, i) => (
            <button key={i} onClick={() => sendMessage(q)}
              className="flex-shrink-0 text-xs bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-slate-100">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={language === 1 ? "कुछ भी पूछें..." : language === 2 ? "Kuch bhi pucho..." : "Ask anything about your notes..."}
                className="w-full resize-none border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                rows={1} style={{ minHeight: "48px", maxHeight: "120px" }}
              />
            </div>
            <button onClick={() => setIsRecording(!isRecording)}
              className={`p-3 rounded-xl transition-all ${isRecording ? "bg-red-500 text-white animate-pulse" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
              className="p-3 gradient-primary text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-50">
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-slate-400 text-xs mt-2">AI uses your uploaded notes as primary source · <span className="text-blue-500">Powered by GPT-4o + RAG</span></p>
        </div>
      </div>

      {/* Right sidebar — context */}
      <div className="hidden xl:flex flex-col w-60 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-yellow-500" /> Sources Used</h3>
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
            <div className="font-semibold text-blue-800 text-xs">Ch-7 Equilibrium.pdf</div>
            <div className="text-blue-600 text-xs mt-0.5">Pages 12-15 · Section 7.3</div>
          </div>
          <p className="text-slate-400 text-xs mt-2">AI is answering from your uploaded notes</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex-1">
          <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-500" /> Suggested Questions</h3>
          <div className="space-y-2">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button key={i} onClick={() => sendMessage(q)}
                className="w-full text-left text-xs text-slate-600 py-2 px-3 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition-all border border-transparent hover:border-blue-100">
                {q}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-4 text-white">
          <Zap className="w-6 h-6 text-yellow-300 mb-2" />
          <div className="font-bold text-sm mb-1">Quick Actions</div>
          <div className="space-y-2">
            {["Generate Quiz", "Create Flashcards", "Make Summary"].map((action, i) => (
              <button key={i} className="w-full text-left text-xs bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2 transition-colors">{action}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


