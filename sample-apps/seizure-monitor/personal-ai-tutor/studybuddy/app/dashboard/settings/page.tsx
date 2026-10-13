"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { User, Bell, Brain, Shield, Globe, Palette, ChevronRight, Save, Moon, Sun } from "lucide-react";

type SettingsSection = "profile" | "notifications" | "ai" | "privacy" | "appearance";

const sections: { key: SettingsSection; label: string; icon: any }[] = [
  { key: "profile", label: "Profile", icon: User },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "ai", label: "AI Preferences", icon: Brain },
  { key: "privacy", label: "Privacy & Security", icon: Shield },
  { key: "appearance", label: "Appearance", icon: Palette },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-slate-200"}`}>
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${checked ? "left-6" : "left-1"}`} />
    </button>
  );
}

export default function SettingsPage() {
  const [active, setActive] = useState<SettingsSection>("profile");
  const [notifs, setNotifs] = useState({ studyReminders: true, quizResults: true, weeklyReport: true, tips: false });
  const [aiPrefs, setAiPrefs] = useState({ language: "English", difficulty: "Intermediate", voiceEnabled: true, streamingEnabled: true });
  const [darkMode, setDarkMode] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-slate-500 text-sm">Manage your account and preferences</p>
      </div>
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {sections.map(s => (
              <button key={s.key} onClick={() => setActive(s.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${active === s.key ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600" : "text-slate-600 hover:bg-slate-50"}`}>
                <s.icon className="w-4 h-4" />
                {s.label}
                {active === s.key && <ChevronRight className="w-3 h-3 ml-auto" />}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <motion.div key={active} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
            {active === "profile" && (
              <>
                <h3 className="font-bold text-slate-900 text-lg">Profile Information</h3>
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                  <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-white font-bold text-xl">PS</div>
                  <div>
                    <div className="font-bold text-slate-900">Priya Sharma</div>
                    <div className="text-slate-500 text-sm">Class 12 · JEE Aspirant</div>
                    <button className="text-blue-600 text-sm font-medium mt-1 hover:underline">Change avatar</button>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {[{ label: "Full Name", val: "Priya Sharma" }, { label: "Email", val: "priya.sharma@example.com" }, { label: "Phone", val: "+91 98765 43210" }, { label: "Class / Year", val: "Class 12 (2025-26)" }].map((f, i) => (
                    <div key={i}>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
                      <input defaultValue={f.val} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Target Exam</label>
                  <select className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-sm">
                    <option>JEE Main + Advanced 2026</option>
                    <option>NEET 2026</option>
                    <option>CBSE Board 2026</option>
                  </select>
                </div>
              </>
            )}

            {active === "notifications" && (
              <>
                <h3 className="font-bold text-slate-900 text-lg">Notification Preferences</h3>
                <div className="space-y-4">
                  {[
                    { key: "studyReminders", label: "Study Reminders", desc: "Daily notifications to stick to your study plan" },
                    { key: "quizResults", label: "Quiz Results", desc: "Instant alerts when quiz analysis is ready" },
                    { key: "weeklyReport", label: "Weekly Progress Report", desc: "Summary of your week delivered every Sunday" },
                    { key: "tips", label: "AI Study Tips", desc: "Personalized tips based on your performance" },
                  ].map(n => (
                    <div key={n.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">{n.label}</div>
                        <div className="text-slate-500 text-xs mt-0.5">{n.desc}</div>
                      </div>
                      <Toggle checked={notifs[n.key as keyof typeof notifs]} onChange={v => setNotifs(p => ({ ...p, [n.key]: v }))} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {active === "ai" && (
              <>
                <h3 className="font-bold text-slate-900 text-lg">AI Tutor Preferences</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-2">Default Response Language</label>
                    <div className="grid grid-cols-3 gap-3">
                      {["English", "Hindi", "Hinglish"].map(lang => (
                        <button key={lang} onClick={() => setAiPrefs(p => ({ ...p, language: lang }))}
                          className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${aiPrefs.language === lang ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}>
                          {lang === "English" ? "🇬🇧" : lang === "Hindi" ? "🇮🇳" : "✨"} {lang}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-2">Default Difficulty Mode</label>
                    <select value={aiPrefs.difficulty} onChange={e => setAiPrefs(p => ({ ...p, difficulty: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-sm">
                      <option>Beginner</option><option>Intermediate</option><option>Exam Mode</option><option>Research Mode</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div><div className="font-semibold text-slate-800 text-sm">Voice Input/Output</div><div className="text-slate-500 text-xs">Use microphone & text-to-speech</div></div>
                    <Toggle checked={aiPrefs.voiceEnabled} onChange={v => setAiPrefs(p => ({ ...p, voiceEnabled: v }))} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div><div className="font-semibold text-slate-800 text-sm">Streaming Responses</div><div className="text-slate-500 text-xs">Show AI response word by word</div></div>
                    <Toggle checked={aiPrefs.streamingEnabled} onChange={v => setAiPrefs(p => ({ ...p, streamingEnabled: v }))} />
                  </div>
                </div>
              </>
            )}

            {active === "appearance" && (
              <>
                <h3 className="font-bold text-slate-900 text-lg">Appearance</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[{ label: "Light", icon: Sun, val: false }, { label: "Dark", icon: Moon, val: true }].map(theme => (
                    <button key={theme.label} onClick={() => setDarkMode(theme.val)}
                      className={`flex items-center gap-3 p-5 rounded-2xl border-2 transition-all ${darkMode === theme.val ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-300"}`}>
                      <theme.icon className={`w-6 h-6 ${darkMode === theme.val ? "text-blue-600" : "text-slate-500"}`} />
                      <div className="text-left">
                        <div className={`font-bold text-sm ${darkMode === theme.val ? "text-blue-700" : "text-slate-700"}`}>{theme.label} Mode</div>
                        <div className="text-xs text-slate-400">{theme.val ? "Easy on eyes at night" : "Best for daylight"}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {active === "privacy" && (
              <>
                <h3 className="font-bold text-slate-900 text-lg">Privacy & Security</h3>
                <div className="space-y-3">
                  {[{ label: "Change Password", desc: "Update your account password" }, { label: "Two-Factor Authentication", desc: "Add an extra layer of security" }, { label: "Connected Accounts", desc: "Manage Google, GitHub OAuth connections" }, { label: "Download My Data", desc: "Export all your notes and progress data" }, { label: "Delete Account", desc: "Permanently remove your account and data", danger: true }].map((item, i) => (
                    <div key={i} className={`flex items-center justify-between p-4 rounded-xl border ${item.danger ? "border-red-100 bg-red-50 hover:border-red-300" : "border-slate-100 bg-slate-50 hover:border-blue-200"} transition-colors cursor-pointer group`}>
                      <div>
                        <div className={`font-semibold text-sm ${item.danger ? "text-red-600" : "text-slate-800"}`}>{item.label}</div>
                        <div className="text-slate-500 text-xs mt-0.5">{item.desc}</div>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${item.danger ? "text-red-400" : "text-slate-400"} group-hover:translate-x-1 transition-transform`} />
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button onClick={handleSave} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${saved ? "bg-green-500 text-white" : "gradient-primary text-white hover:opacity-90"}`}>
                <Save className="w-4 h-4" /> {saved ? "Saved!" : "Save Changes"}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
