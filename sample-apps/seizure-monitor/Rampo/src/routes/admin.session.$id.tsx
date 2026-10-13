import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  mockSessions, getEventsForSession, getRiskBreakdown, mockNudges,
  getRiskLevel, getRiskColor,
} from "@/lib/mock-data";
import type { SessionEvent } from "@/lib/mock-data";
import {
  ArrowLeft, User, Monitor, MapPin, Clock, Zap, Send,
  Eye, MousePointerClick, AlertTriangle, RotateCcw, FileX,
  Globe, ChevronRight, MessageSquare, ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/admin/session/$id")({
  head: () => ({
    meta: [
      { title: "Session Details — Rampo" },
    ],
  }),
  component: SessionDetail,
});

function getEventIcon(type: SessionEvent["type"]) {
  switch (type) {
    case "page_view": return <Globe size={14} className="text-blue-400" />;
    case "click": return <MousePointerClick size={14} className="text-gray-400" />;
    case "form_submit": return <Send size={14} className="text-emerald-400" />;
    case "form_error": return <FileX size={14} className="text-red-400" />;
    case "rage_click": return <AlertTriangle size={14} className="text-red-500" />;
    case "navigation_loop": return <RotateCcw size={14} className="text-amber-400" />;
    case "api_error": return <AlertTriangle size={14} className="text-red-400" />;
    case "nudge_shown": return <Zap size={14} className="text-violet-400" />;
    case "nudge_engaged": return <ShieldCheck size={14} className="text-emerald-400" />;
    default: return <Eye size={14} className="text-gray-400" />;
  }
}

function getEventBg(severity: SessionEvent["severity"]) {
  switch (severity) {
    case "critical": return "border-red-500/20 bg-red-500/5";
    case "warning": return "border-amber-500/20 bg-amber-500/5";
    default: return "border-white/[0.03] bg-transparent";
  }
}

function SessionDetail() {
  const { id } = Route.useParams();
  const session = mockSessions.find((s) => s.id === id);
  const [nudgeText, setNudgeText] = useState("");
  const [nudgeSent, setNudgeSent] = useState(false);
  const [agentNotes, setAgentNotes] = useState("");

  if (!session) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96 text-gray-500">
          Session not found.
          <Link to="/admin" className="ml-2 text-blue-400 underline">Back to monitoring</Link>
        </div>
      </AdminLayout>
    );
  }

  const events = getEventsForSession(id);
  const breakdown = getRiskBreakdown(session);
  const sessionNudges = mockNudges.filter((n) => n.sessionId === id);
  const level = getRiskLevel(session.riskScore);

  const handleNudge = () => {
    if (!nudgeText.trim()) return;
    try {
      const bc = new BroadcastChannel("nitrostack-nudge");
      bc.postMessage({
        type: "nudge",
        sessionId: id,
        message: nudgeText,
        timestamp: new Date().toISOString(),
      });
      bc.close();
    } catch { /* BroadcastChannel not supported */ }
    setNudgeSent(true);
    setTimeout(() => setNudgeSent(false), 3000);
  };

  const breakdownItems = [
    { label: "Rage Clicks", value: breakdown.rageClicks.count, score: breakdown.rageClicks.score, max: 30, color: "#ef4444" },
    { label: "Failed Forms", value: breakdown.failedForms.count, score: breakdown.failedForms.score, max: 25, color: "#f97316" },
    { label: "Nav Loops", value: breakdown.navLoops.count, score: breakdown.navLoops.score, max: 20, color: "#eab308" },
    { label: "Time Factor", value: `${Math.round(breakdown.timeOnPage.seconds / 60)}m`, score: breakdown.timeOnPage.score, max: 15, color: "#8b5cf6" },
    { label: "Back & Forth", value: breakdown.backAndForth.count, score: breakdown.backAndForth.score, max: 10, color: "#06b6d4" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Back nav */}
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          <ArrowLeft size={14} /> Back to Live Monitoring
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center">
              <User size={22} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">{session.customerName}</h1>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                <span>CIF: {session.cif}</span>
                <span className="flex items-center gap-1"><Monitor size={11} /> {session.device}</span>
                <span className="flex items-center gap-1"><MapPin size={11} /> {session.location}</span>
                <span className="flex items-center gap-1"><Clock size={11} /> {session.duration}m</span>
              </div>
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
            session.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
            session.status === "escalated" ? "bg-red-500/10 text-red-400 border-red-500/20" :
            "bg-gray-500/10 text-gray-400 border-gray-500/20"
          }`}>
            {session.status.toUpperCase()}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Risk Score + Breakdown - Left */}
          <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">AI Risk Assessment</h3>
            {/* Circular gauge */}
            <div className="flex justify-center mb-5">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    stroke={getRiskColor(session.riskScore)}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(session.riskScore / 100) * 314} 314`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold" style={{ color: getRiskColor(session.riskScore) }}>
                    {session.riskScore}
                  </span>
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">{level}</span>
                </div>
              </div>
            </div>
            {/* Breakdown bars */}
            <div className="space-y-3">
              {breakdownItems.map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-gray-400">{item.label}</span>
                    <span className="text-gray-500">{item.value} → <span className="font-bold" style={{ color: item.color }}>+{item.score}</span></span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(item.score / item.max) * 100}%`, background: item.color }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] text-[11px] text-gray-500">
              <span className="text-gray-400 font-medium">AI Reasoning: </span>
              Customer has experienced {breakdown.failedForms.count} failed form submissions on the transfer page, triggering {breakdown.rageClicks.count} rage click events. Combined with {breakdown.navLoops.count} navigation loops between transfer and help pages, the frustration pattern strongly indicates imminent escalation.
            </div>
          </div>

          {/* Activity Timeline - Center */}
          <div className="col-span-2 bg-[#111827] rounded-xl border border-white/5 p-5 max-h-[600px] overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Session Activity Timeline</h3>
            <div className="relative">
              <div className="absolute left-[19px] top-0 bottom-0 w-px bg-white/5" />
              <div className="space-y-1">
                {events.map((ev) => {
                  const time = new Date(ev.timestamp);
                  const timeStr = time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
                  return (
                    <div key={ev.id} className={`flex items-start gap-3 p-2.5 rounded-lg border transition-colors ${getEventBg(ev.severity)}`}>
                      <div className="w-10 h-10 rounded-lg bg-[#0a0e1a] border border-white/5 flex items-center justify-center shrink-0 relative z-10">
                        {getEventIcon(ev.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-300">{ev.detail}</span>
                          {ev.severity === "critical" && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-bold uppercase">Critical</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-600">
                          <span>{timeStr}</span>
                          <ChevronRight size={8} />
                          <span>{ev.page}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Manual Nudge + Agent Notes */}
        <div className="grid grid-cols-2 gap-4">
          {/* Trigger Nudge */}
          <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Zap size={14} className="text-violet-400" /> Trigger Manual Nudge
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Send a contextual help message to this customer's screen in real-time.
            </p>
            {/* Quick nudge templates */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {[
                "The beneficiary name must match bank records exactly.",
                "Your daily IMPS limit is ₹2,00,000. Try NEFT for higher amounts.",
                "Need help? Our support team can assist with this transfer.",
              ].map((t) => (
                <button
                  key={t}
                  onClick={() => setNudgeText(t)}
                  className="text-[10px] px-2 py-1 rounded-md bg-white/5 text-gray-400 hover:bg-violet-500/10 hover:text-violet-300 border border-white/5 transition-colors"
                >
                  {t.slice(0, 40)}...
                </button>
              ))}
            </div>
            <textarea
              value={nudgeText}
              onChange={(e) => setNudgeText(e.target.value)}
              placeholder="Type a contextual help message..."
              className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder:text-gray-600 resize-none h-20 focus:outline-none focus:border-violet-500/40 transition-colors"
            />
            <button
              onClick={handleNudge}
              disabled={!nudgeText.trim()}
              className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:from-violet-500 hover:to-blue-500 shadow-lg shadow-violet-500/20"
            >
              <MessageSquare size={14} />
              {nudgeSent ? "✓ Nudge Sent!" : "Send Nudge to Customer"}
            </button>
            {nudgeSent && (
              <p className="text-xs text-emerald-400 mt-2 text-center animate-pulse">
                Nudge delivered to customer's browser via BroadcastChannel
              </p>
            )}
          </div>

          {/* Previous Nudges + Agent Notes */}
          <div className="space-y-4">
            {sessionNudges.length > 0 && (
              <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Previous Nudges</h3>
                <div className="space-y-2">
                  {sessionNudges.map((n) => (
                    <div key={n.id} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.03] text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${n.engaged ? "bg-emerald-500/10 text-emerald-400" : "bg-gray-500/10 text-gray-400"}`}>
                          {n.engaged ? "Engaged" : "Dismissed"}
                        </span>
                        <span className="text-gray-600">{new Date(n.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p className="text-gray-400">"{n.message}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Agent Notes</h3>
              <textarea
                value={agentNotes}
                onChange={(e) => setAgentNotes(e.target.value)}
                placeholder="Add notes about this session..."
                className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder:text-gray-600 resize-none h-24 focus:outline-none focus:border-blue-500/40"
              />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
