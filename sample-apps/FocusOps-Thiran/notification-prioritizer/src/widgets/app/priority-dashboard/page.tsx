'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Bell, Home, LayoutDashboard, Sun, Moon,
  Mail, Calendar, MessageSquare, GitBranch, Ticket,
  AlertTriangle, Lightbulb, Bot, RefreshCw, ExternalLink,
  ChevronRight, Inbox, Info, CheckCircle2, Clock,
  AlarmClock, Send, Terminal, BarChart2, PlayCircle, Filter, Check,
  Sparkles, ArrowRight, Plus, Trash2, MessageCircle, Maximize2
} from 'lucide-react';

interface NotificationItem {
  id: string;
  source: 'slack' | 'jira' | 'github' | 'gmail' | 'calendar' | 'pagerduty';
  sender: string; title: string; snippet: string; timestamp: string;
  link: string; accountId: string; accountEmail: string | null;
  rawMetadata?: any;
  tier: 'urgent_now' | 'normal' | 'fyi_only';
  reason: string;
}
interface PrioritizerOutput { prioritized: NotificationItem[]; }
interface ChatMessage { sender: 'user' | 'agent'; text: string; }
interface TraceLog {
  timestamp: string;
  tool: string;
  summary: string;
  duration?: number;
}
interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  messages: ChatMessage[];
}

const SOURCE_META: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  slack:     { icon: <MessageSquare size={13} />, color: '#0891b2', label: 'Slack' },
  jira:      { icon: <Ticket size={13} />,        color: '#0369a1', label: 'Jira' },
  github:    { icon: <GitBranch size={13} />,     color: '#374151', label: 'GitHub' },
  gmail:     { icon: <Mail size={13} />,           color: '#dc2626', label: 'Gmail' },
  calendar:  { icon: <Calendar size={13} />,       color: '#0284c7', label: 'Calendar' },
  pagerduty: { icon: <AlarmClock size={13} />,     color: '#dc2626', label: 'PagerDuty' },
};
const getSource = (s: string) => SOURCE_META[s] ?? { icon: <Bell size={13} />, color: '#0ea5e9', label: s };

const TIER_DARK: Record<string, any> = {
  urgent_now: { label: 'Urgent Now',      bg: 'rgba(239,68,68,0.14)',  border: 'rgba(239,68,68,0.32)',  text: '#fca5a5', icon: <AlertTriangle size={11}/> },
  normal:     { label: 'Normal Priority', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.28)', text: '#fde68a', icon: <Clock size={11}/> },
  fyi_only:   { label: 'FYI Only',        bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.26)',  text: '#86efac', icon: <Info size={11}/> },
};
const TIER_LIGHT: Record<string, any> = {
  urgent_now: { label: 'Urgent Now',      bg: '#fef2f2', border: '#fca5a5', text: '#dc2626', icon: <AlertTriangle size={11}/> },
  normal:     { label: 'Normal Priority', bg: '#fffbeb', border: '#fcd34d', text: '#b45309', icon: <Clock size={11}/> },
  fyi_only:   { label: 'FYI Only',        bg: '#ecfeff', border: '#a5f3fc', text: '#0e7490', icon: <Info size={11}/> },
};
const getTier = (t: string, dark: boolean) => (dark ? TIER_DARK : TIER_LIGHT)[t] ?? (dark ? TIER_DARK : TIER_LIGHT).fyi_only;

export default function InteractiveDashboard() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<PrioritizerOutput>();

  const [isDark, setIsDark] = useState(theme === 'dark');
  useEffect(() => { setIsDark(theme === 'dark'); }, [theme]);

  // Views: landing | workspace_dashboard (Workspace) | dashboard (Focus Agent) | agent_console | insights
  const [view, setView] = useState<'landing' | 'workspace_dashboard' | 'dashboard' | 'agent_console' | 'insights'>('landing');
  const [activeFilter, setActiveFilter] = useState<'all' | 'urgent_now' | 'normal' | 'fyi_only'>('all');
  const [selectedItem, setSelectedItem] = useState<NotificationItem | null>(null);
  const [chatInput, setChatInput] = useState('');
  
  // Current active chat history
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { sender: 'agent', text: 'Hello! I am your FocusOps Priority Agent. Ask me anything about your notifications!' }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  const [liveNotifications, setLiveNotifications] = useState<NotificationItem[]>([]);
  const [backendConnected, setBackendConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);

  // Synced local connections state overriding backend defaults if needed
  const [connectedSources, setConnectedSources] = useState<Record<string, boolean>>({
    gmail: false, slack: false, jira: false, github: false, calendar: false
  });

  // Consent Modal State
  const [consentModal, setConsentModal] = useState<{
    isOpen: boolean;
    sourceKey: string;
    sourceLabel: string;
  } | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);

  const [toolTraces, setToolTraces] = useState<TraceLog[]>([]);

  // Channel filter popover state
  const [filterOpen, setFilterOpen] = useState(false);
  const [channelFilters, setChannelFilters] = useState<Record<string, boolean>>({
    gmail: true, slack: true, jira: true, github: true, calendar: true
  });

  // Chat History sessions management state
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    {
      id: 'sess-1',
      title: 'Show my normal priority notifications',
      timestamp: 'Today · 3 msgs',
      messages: [
        { sender: 'agent', text: 'Hello! I am your FocusOps Priority Agent. Ask me anything about your notifications!' },
        { sender: 'user', text: 'Show my normal priority notifications' },
        { sender: 'agent', text: 'Analyzing normal priority tasks... you have 2 notifications categorized as normal priority from Gmail and Jira.' }
      ]
    },
    {
      id: 'sess-2',
      title: 'Show my normal priority notifications',
      timestamp: 'Today · 6 msgs',
      messages: [
        { sender: 'agent', text: 'Hello! I am your FocusOps Priority Agent. Ask me anything about your notifications!' },
        { sender: 'user', text: 'Show my normal priority notifications' },
        { sender: 'agent', text: 'I found 1 normal priority Jira ticket regarding API token upgrades.' }
      ]
    }
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const slogans = [
    "Your intelligent AI Agent to triage workspace noise.",
    "Let Focus Agent AI prioritize your updates automatically.",
    "Triage the noise and focus on what matters with Focus Agent."
  ];
  const [sloganIdx, setSloganIdx] = useState(0);
  const [displayedSlogan, setDisplayedSlogan] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    let timer: any;
    const fullText = slogans[sloganIdx];
    const typeSpeed = isDeleting ? 25 : 50;
    
    if (!isDeleting && displayedSlogan === fullText) {
      timer = setTimeout(() => setIsDeleting(true), 3000);
    } else if (isDeleting && displayedSlogan === "") {
      setIsDeleting(false);
      setSloganIdx((prev) => (prev + 1) % slogans.length);
    } else {
      timer = setTimeout(() => {
        setDisplayedSlogan(prev => 
          isDeleting ? fullText.substring(0, prev.length - 1) : fullText.substring(0, prev.length + 1)
        );
      }, typeSpeed);
    }
    return () => clearTimeout(timer);
  }, [displayedSlogan, isDeleting, sloganIdx]);

  // Load local storage connections if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('focusops_connections');
      if (saved) {
        setConnectedSources(JSON.parse(saved));
      }
    }
  }, []);

  // Auto-scroll chat to bottom smoothly
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/health');
        if (res.ok) {
          const h = await res.json();
          setBackendConnected(true); setGoogleConnected(h.googleConnected);
          setConnectedSources(prev => {
            if (typeof window !== 'undefined') {
              const savedRaw = localStorage.getItem('focusops_connections');
              if (savedRaw) {
                return JSON.parse(savedRaw);
              }
            }
            return {
              gmail: h.googleConnected,
              calendar: h.googleConnected,
              slack: h.slackConnected,
              jira: h.jiraConnected,
              github: h.githubConnected
            };
          });
        } else setBackendConnected(false);
      } catch { setBackendConnected(false); }
    };
    check();
    const t = setInterval(check, 4000);
    return () => clearInterval(t);
  }, []);

  const fetchLiveNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/notifications');
      if (res.ok) {
        const result = await res.json();
        const prioritized = result.prioritized || [];
        const traces = result.traces || [];
        setLiveNotifications(prioritized);
        if (traces.length > 0) {
          setToolTraces(prev => [...prev, ...traces]);
        }
      }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };
  useEffect(() => { if (backendConnected) fetchLiveNotifications(); }, [backendConnected]);

  const notifications = data?.prioritized?.length ? data.prioritized : liveNotifications;

  // Filter items matching active filters (only connected ones for redesigned view)
  const getFilteredNotifications = (isRedesigned: boolean) => {
    return notifications.filter(n => {
      const matchesTab = activeFilter === 'all' || n.tier === activeFilter;
      const matchesChannel = channelFilters[n.source] !== false;
      
      if (isRedesigned) {
        const isConnected = connectedSources[n.source] === true;
        return matchesTab && matchesChannel && isConnected;
      }
      return matchesTab && matchesChannel;
    });
  };

  const filtered = getFilteredNotifications(true); // Redesigned layout filters connected apps

  // Badge counts
  const activeFiltersList = Object.keys(channelFilters).filter(k => channelFilters[k]);
  const activeFiltersCount = activeFiltersList.length;
  const isFiltering = activeFiltersCount < 5;

  const urgentCount = notifications.filter(n => n.tier === 'urgent_now').length;
  const normalCount = notifications.filter(n => n.tier === 'normal').length;
  const fyiCount    = notifications.filter(n => n.tier === 'fyi_only').length;
  const unreadCount = urgentCount + normalCount;

  // Connected filters for active feeds
  const filteredUrgent = filtered.filter(n => n.tier === 'urgent_now').length;
  const filteredNormal = filtered.filter(n => n.tier === 'normal').length;
  const filteredFyi    = filtered.filter(n => n.tier === 'fyi_only').length;

  const isAnyChannelConnected = Object.values(connectedSources).some(Boolean);

  // Cross-tool correlation match
  const getRelatedItems = (item: NotificationItem) => {
    if (!item) return [];
    const textToAnalyze = `${item.title} ${item.sender}`.toLowerCase();
    const keywords = ['focusops', 'database', 'cpu', 'meeting', 'auth', 'google', 'jira', 'slack', 'foc-'];
    const matchedKeywords = keywords.filter(kw => textToAnalyze.includes(kw));

    if (matchedKeywords.length === 0) {
      const words = textToAnalyze.split(/\s+/).filter(w => w.length > 4 && !['about', 'should', 'welcome', 'priority'].includes(w));
      matchedKeywords.push(...words.slice(0, 2));
    }

    return notifications.filter(n => {
      if (n.id === item.id) return false;
      const targetText = `${n.title} ${n.sender} ${n.snippet}`.toLowerCase();
      return matchedKeywords.some(kw => targetText.includes(kw));
    }).slice(0, 3);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    const updatedHistory = [...chatHistory, { sender: 'user' as const, text: userMsg }];
    setChatHistory([...updatedHistory, { sender: 'agent' as const, text: '…' }]);
    setChatInput('');

    try {
      const res = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, notifications, history: chatHistory.slice(-5) })
      });
      if (res.ok) {
        const r = await res.json();
        if (r?.text) { setChatHistory([...updatedHistory, { sender: 'agent', text: r.text }]); return; }
      }
    } catch { /* fallback */ }

    const t = userMsg.toLowerCase();
    let reply = "im your focus agent i can only help with your notifications and worksapce tasks.";
    if (t.includes('urgent') || t.includes('important')) {
      const u = notifications.filter(n => n.tier === 'urgent_now');
      reply = u.length ? `You have ${u.length} urgent items:\n` + u.map(n => `• [${n.source.toUpperCase()}] ${n.sender} — ${n.title}`).join('\n') : 'No urgent items right now!';
    } else if (t.includes('slack'))  { const s = notifications.filter(n => n.source === 'slack');  reply = `Slack: ${s.length} updates.\n`  + s.map(n => `• ${n.sender}: "${n.snippet}"`).join('\n'); }
    else if (t.includes('github'))   { const g = notifications.filter(n => n.source === 'github'); reply = `GitHub: ${g.length} items.\n`   + g.map(n => `• ${n.title} (${n.reason})`).join('\n'); }
    else if (t.includes('jira'))     { const j = notifications.filter(n => n.source === 'jira');   reply = `Jira: ${j.length} tickets.\n`   + j.map(n => `• ${n.title}`).join('\n'); }
    else if (t.includes('gmail') || t.includes('email')) { const e = notifications.filter(n => n.source === 'gmail'); reply = `Gmail: ${e.length} emails.\n` + e.slice(0, 3).map(n => `• ${n.sender}: "${n.title}"`).join('\n'); }
    setChatHistory([...updatedHistory, { sender: 'agent', text: reply }]);
  };

  const handleQuickQuestion = (text: string) => {
    const updatedHistory = [...chatHistory, { sender: 'user' as const, text }];
    setChatHistory([...updatedHistory, { sender: 'agent' as const, text: '…' }]);
    
    const t = text.toLowerCase();
    let reply = "im your focus agent i can only help with your notifications and worksapce tasks.";
    if (t.includes('urgent') || t.includes('important')) {
      const u = notifications.filter(n => n.tier === 'urgent_now');
      reply = u.length ? `You have ${u.length} urgent items:\n` + u.map(n => `• [${n.source.toUpperCase()}] ${n.sender} — ${n.title}`).join('\n') : 'No urgent items right now!';
    } else if (t.includes('all')) {
      reply = `You have ${notifications.length} total items in your feed.`;
    } else if (t.includes('normal')) {
      const nList = notifications.filter(n => n.tier === 'normal');
      reply = nList.length ? `You have ${nList.length} normal priority items:\n` + nList.map(n => `• [${n.source.toUpperCase()}] ${n.sender} — ${n.title}`).join('\n') : 'No normal priority items.';
    } else if (t.includes('fyi')) {
      const fList = notifications.filter(n => n.tier === 'fyi_only');
      reply = fList.length ? `You have ${fList.length} FYI items:\n` + fList.map(n => `• [${n.source.toUpperCase()}] ${n.sender} — ${n.title}`).join('\n') : 'No FYI items.';
    }

    setTimeout(() => {
      setChatHistory([...updatedHistory, { sender: 'agent', text: reply }]);
    }, 300);
  };

  const simulateNotification = () => {
    const mockNotif: NotificationItem = {
      id: `sim-${Date.now()}`,
      source: 'slack',
      sender: 'Engineering Channel',
      title: 'URGENT: Production Database CPU at 99%',
      snippet: 'The primary database is seeing extreme load and queries are timing out.',
      timestamp: new Date().toISOString(),
      link: 'https://slack.com',
      accountId: 'mock-account',
      accountEmail: 'you@focusops.com',
      tier: 'urgent_now',
      reason: 'Matches critical project alert keywords'
    };
    
    const newTraces: TraceLog[] = [
      { timestamp: new Date().toLocaleTimeString(), tool: 'SimulatedTrigger', summary: 'Mock Slack alert received', duration: 0 },
      { timestamp: new Date().toLocaleTimeString(), tool: 'buildUserContext', summary: 'Context extracted', duration: 12 },
      { timestamp: new Date().toLocaleTimeString(), tool: 'prioritizeNotifications', summary: '1 item triaged & tiered (urgent_now)', duration: 435 }
    ];

    setToolTraces(prev => [...prev, ...newTraces]);
    setLiveNotifications(prev => [mockNotif, ...prev]);
  };

  // Connection handlers with Consent Popups
  const triggerConnect = (key: string, label: string) => {
    setConsentChecked(false);
    setConsentModal({
      isOpen: true,
      sourceKey: key,
      sourceLabel: label
    });
  };

  const handleConsentConfirm = () => {
    if (!consentModal) return;
    if (!consentChecked) {
      alert("Consent not provided and return to front dashboard");
      setConsentModal(null);
      setView('landing');
      return;
    }
    
    const key = consentModal.sourceKey;
    setConnectedSources(prev => {
      const next = { ...prev, [key]: true };
      if (typeof window !== 'undefined') {
        localStorage.setItem('focusops_connections', JSON.stringify(next));
      }
      return next;
    });

    if (key === 'gmail' || key === 'calendar') {
      if (!googleConnected && backendConnected) {
        window.open('http://localhost:3000/oauth/google/login', '_blank');
      }
    }
    setConsentModal(null);
  };

  const handleConsentCancel = () => {
    alert("Consent not provided and return to front dashboard");
    setConsentModal(null);
    setView('landing');
  };

  const triggerDisconnect = (key: string) => {
    setConnectedSources(prev => {
      const next = { ...prev, [key]: false };
      if (typeof window !== 'undefined') {
        localStorage.setItem('focusops_connections', JSON.stringify(next));
      }
      return next;
    });
  };

  // Chat History Session Handlers
  const handleNewChat = () => {
    if (chatHistory.length > 1) {
      const userMsgs = chatHistory.filter(m => m.sender === 'user');
      const title = userMsgs.length ? (userMsgs[0].text.slice(0, 34) + '...') : 'Show my normal priority notifications';
      const newSession: ChatSession = {
        id: `sess-${Date.now()}`,
        title,
        timestamp: `Today · ${chatHistory.length} msgs`,
        messages: chatHistory
      };
      setChatSessions(prev => [newSession, ...prev]);
    }
    setChatHistory([
      { sender: 'agent', text: 'Hello! I am your FocusOps Priority Agent. Ask me anything about your notifications!' }
    ]);
    setActiveSessionId(null);
  };

  const handleLoadSession = (sess: ChatSession) => {
    if (!activeSessionId && chatHistory.length > 1) {
      const userMsgs = chatHistory.filter(m => m.sender === 'user');
      const title = userMsgs.length ? (userMsgs[0].text.slice(0, 34) + '...') : 'Show my normal priority notifications';
      const newSession: ChatSession = {
        id: `sess-${Date.now()}`,
        title,
        timestamp: `Today · ${chatHistory.length} msgs`,
        messages: chatHistory
      };
      setChatSessions(prev => [newSession, ...prev]);
    }
    setChatHistory(sess.messages);
    setActiveSessionId(sess.id);
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setChatHistory([
        { sender: 'agent', text: 'Hello! I am your FocusOps Priority Agent. Ask me anything about your notifications!' }
      ]);
      setActiveSessionId(null);
    }
  };

  // ─── Design tokens ──────────────────────────────────────────────────────────
  const D = {
    bg:          isDark ? '#061014' : '#f0f9ff',
    surface:     isDark ? 'rgba(6,24,34,0.94)' : 'rgba(255,255,255,0.97)',
    border:      isDark ? 'rgba(14,165,233,0.1)' : 'rgba(14,165,233,0.15)',
    text:        isDark ? '#e0f7fa' : '#0c1a1f',
    muted:       isDark ? '#7dd3e8' : '#4b7f8c',
    activeBg:    isDark ? 'rgba(8,145,178,0.18)' : 'rgba(8,145,178,0.09)',
    navBg:       isDark ? '#040f16' : '#ffffff',
    shadow:      isDark ? '0 4px 24px rgba(0,0,0,0.5)' : '0 4px 24px rgba(8,145,178,0.1)',
    heroBg:      isDark ? 'linear-gradient(160deg,#061014 0%,#071e2b 55%,#050f18 100%)' : 'linear-gradient(160deg,#f0f9ff 0%,#e0f2fe 55%,#ecfeff 100%)',
    grad:        'linear-gradient(135deg,#0ea5e9 0%,#06b6d4 60%,#0891b2 100%)',
    gradText:    'linear-gradient(135deg,#0284c7,#0ea5e9,#06b6d4)',
    accent:      '#0891b2',
  };
  const font = "Consolas, Monaco, 'Courier New', monospace";

  // ─── NavBar — fixed height flex item ───────────────────────────────────────
  const NavBar = () => (
    <div style={{
      flexShrink: 0, height: '64px',
      background: D.navBg, borderBottom: `1px solid ${D.border}`,
      padding: '0 32px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', fontFamily: font, zIndex: 10
    }}>
      <button onClick={() => setView('landing')} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <img src="/logo.png" alt="FocusOps Logo" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
        <span style={{ fontSize: '18px', fontWeight: 900, background: D.gradText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.3px' }}>FocusOps</span>
      </button>

      <div style={{ display: 'flex', gap: '2px' }}>
        {([
          ['landing','Home',<Home size={14}/>],
          ['workspace_dashboard','Workspace',<LayoutDashboard size={14}/>],
          ['dashboard','Focus Agent',<Bot size={14}/>],
          ['agent_console','Agent Console',<Terminal size={14}/>],
          ['insights','Insights',<BarChart2 size={14}/>]
        ] as [string,string,React.ReactNode][]).map(([v,lbl,icon]) => (
          <button key={v} onClick={() => setView(v as any)} style={{ display: 'flex', alignItems: 'center', gap: '7px', background: view === v ? D.activeBg : 'transparent', border: 'none', borderRadius: '9px', padding: '7px 15px', color: view === v ? D.accent : D.muted, fontSize: '14px', fontWeight: view === v ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s' }}>
            {icon} {lbl}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => setView('workspace_dashboard')} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: D.muted, display: 'flex' }}>
          <Bell size={20} />
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: 'white', borderRadius: '99px', fontSize: '10px', fontWeight: 800, minWidth: '17px', height: '17px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '2px solid ' + D.bg }}>
              {unreadCount}
            </span>
          )}
        </button>
        <button onClick={() => setIsDark(d => !d)} style={{ background: isDark ? 'rgba(8,145,178,0.12)' : 'rgba(8,145,178,0.07)', border: `1px solid ${isDark ? 'rgba(8,145,178,0.3)' : 'rgba(8,145,178,0.2)'}`, borderRadius: '99px', padding: '6px 13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: D.accent, fontSize: '13px', fontWeight: 600 }}>
          {isDark ? <Sun size={14}/> : <Moon size={14}/>} {isDark ? 'Light' : 'Dark'}
        </button>
      </div>
    </div>
  );

  // ─── Offline banner ──────────────────────────────────────────────────────────
  const OfflineBanner = () => !backendConnected ? (
    <div style={{ flexShrink: 0, background: isDark ? 'rgba(217,119,6,0.12)' : '#fffbeb', borderBottom: `1px solid ${isDark ? 'rgba(217,119,6,0.25)' : '#fde68a'}`, padding: '9px 32px', color: isDark ? '#fbbf24' : '#92400e', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
      <AlertTriangle size={14}/><strong>Backend offline.</strong>&nbsp;Run <code style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.08)', padding: '1px 6px', borderRadius: '4px', margin: '0 4px' }}>node dist/index.js</code> to enable live sync.
    </div>
  ) : null;

  // ─── Consent Modal UI overlay ────────────────────────────────────────────────
  const ConsentModalOverlay = () => {
    if (!consentModal || !consentModal.isOpen) return null;
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, fontFamily: font
      }}>
        <div style={{
          background: D.surface, border: `2px solid ${D.accent}`, borderRadius: '16px',
          padding: '28px', maxWidth: '460px', width: '90%', boxShadow: D.shadow,
          display: 'flex', flexDirection: 'column', gap: '18px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 900, margin: 0, background: D.gradText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Consent Required: Connect {consentModal.sourceLabel}
          </h2>
          <p style={{ fontSize: '14px', lineHeight: 1.6, color: D.text, margin: 0 }}>
            Are you okay to connect to {consentModal.sourceLabel.toLowerCase()} and allow FocusOps to parse alerts to prioritize them?
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
            <input type="checkbox" id="consent-chk" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: D.accent }} />
            <label htmlFor="consent-chk" style={{ fontSize: '13px', cursor: 'pointer', fontWeight: 700 }}>
              Yes, I provide consent to access my data.
            </label>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button onClick={handleConsentCancel} style={{ padding: '10px 20px', border: `1px solid ${D.border}`, borderRadius: '9px', background: 'transparent', color: D.muted, fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}>
              Cancel
            </button>
            <button onClick={handleConsentConfirm} style={{ padding: '10px 20px', border: 'none', borderRadius: '9px', background: D.grad, color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 8px rgba(8,145,178,0.3)' }}>
              Confirm & Proceed
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LANDING PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === 'landing') {
    const CARDS = [
      { key: 'gmail',    label: 'Gmail',    icon: <Mail size={22}/>,          color: '#dc2626' },
      { key: 'calendar', label: 'Calendar', icon: <Calendar size={22}/>,      color: '#0284c7' },
      { key: 'slack',    label: 'Slack',    icon: <MessageSquare size={22}/>, color: '#0891b2' },
      { key: 'jira',     label: 'Jira',     icon: <Ticket size={22}/>,        color: '#0369a1' },
      { key: 'github',   label: 'GitHub',   icon: <GitBranch size={22}/>,     color: '#374151' },
    ];

    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        background: D.heroBg, fontFamily: font, color: D.text, overflow: 'hidden'
      }}>
        <NavBar />
        <OfflineBanner />
        <ConsentModalOverlay />

        {/* ── Scrollable Content Area ── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '64px 36px 80px', maxWidth: '1100px', margin: '0 auto', boxSizing: 'border-box' }}>
            {/* Hero */}
            <div style={{ textAlign: 'center', marginBottom: '64px' }}>
              <motion.h1 initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6, ease: [0.16,1,0.3,1] }}
                style={{ fontSize: 'clamp(36px,5vw,62px)', fontWeight: 900, lineHeight: 1.08, margin: '0 0 20px', letterSpacing: '-2px', background: D.gradText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Triage the Noise.<br/>Focus on what Matters.
              </motion.h1>

              {/* Typewriter animation for the slogan */}
              <div style={{ minHeight: '54px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '28px' }}>
                <p style={{ fontSize: '18px', fontWeight: 600, color: D.muted, fontFamily: font, margin: 0, display: 'flex', alignItems: 'center', gap: '2px', textAlign: 'center', maxWidth: '640px', lineHeight: 1.5 }}>
                  {displayedSlogan}
                  <span style={{ display: 'inline-block', width: '3px', height: '18px', background: D.accent, animation: 'blink 0.8s infinite' }} />
                </p>
              </div>
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes blink {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0; }
                }
              `}} />

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35, duration: 0.5 }}
                style={{ fontSize: '15px', color: D.muted, opacity: 0.85, lineHeight: 1.6, maxWidth: '600px', margin: '0 auto 40px' }}>
                Managing notifications across Slack, Jira, GitHub, Gmail, and Calendar can be overwhelming.
                FocusOps utilizes local context parsing to securely structure your inbox, so you can work uninterrupted.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
                <motion.button whileHover={{ scale: 1.04, y: -3, boxShadow: '0 16px 40px rgba(8,145,178,0.55)' }} whileTap={{ scale: 0.97 }}
                  onClick={() => setView('workspace_dashboard')}
                  style={{ background: D.grad, color: 'white', border: 'none', borderRadius: '13px', padding: '16px 38px', fontSize: '17px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 28px rgba(8,145,178,0.42)', display: 'inline-flex', alignItems: 'center', gap: '10px', transition: 'box-shadow 0.2s' }}>
                  Launch Priority Workspace <ChevronRight size={19}/>
                </motion.button>
              </motion.div>
            </div>

            {/* Integration cards (5-column single-row alignment with brand gradient touch) */}
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.52 }}
              style={{ textAlign: 'center', fontSize: '11px', fontWeight: 800, color: D.muted, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '18px' }}>
              Connected Integrations
            </motion.p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '64px' }}>
              {CARDS.map((card, i) => {
                const active = connectedSources[card.key] === true;
                const cardGradient = isDark 
                  ? `linear-gradient(135deg, ${D.surface} 0%, ${card.color}15 100%)`
                  : `linear-gradient(135deg, ${D.surface} 0%, ${card.color}08 100%)`;
                return (
                  <motion.div key={card.key}
                    initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.56 + i * 0.08, ease: [0.16,1,0.3,1] }}
                    whileHover={{ y: -5, boxShadow: '0 16px 40px rgba(8,145,178,0.18)' }}
                    style={{ background: cardGradient, backdropFilter: 'blur(12px)', border: `1.5px solid ${active ? card.color + '45' : D.border}`, borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: D.shadow, transition: 'border-color 0.2s, box-shadow 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ background: card.color + '16', color: card.color, borderRadius: '11px', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${card.color}22` }}>{card.icon}</div>
                      <span style={{ fontWeight: 800, fontSize: '17px' }}>{card.label}</span>
                    </div>
                    {active ? (
                      <button onClick={() => triggerDisconnect(card.key)}
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', width: '100%', justifyContent: 'center' }}>
                        Disconnect
                      </button>
                    ) : (
                      <button onClick={() => triggerConnect(card.key, card.label)}
                        style={{ background: D.grad, color: 'white', border: 'none', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', width: '100%', justifyContent: 'center' }}>
                        Connect
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Before / After Comparison */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '32px', margin: '64px 0' }}>
              
              {/* Left Column: Noise */}
              <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: '24px', padding: '36px', opacity: 0.7, display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: D.shadow }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: D.text }}>Unsorted Inbox (Raw Noise)</h3>
                    <p style={{ fontSize: '12px', color: D.muted, margin: '4px 0 0' }}>Drowning in continuous notifications</p>
                  </div>
                  <span style={{ fontSize: '12px', background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', padding: '6px 12px', borderRadius: '99px', fontWeight: 700, border: `1px solid ${D.border}` }}>23 alerts</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { source: 'slack', sender: 'Dev-Alerts Bot', title: 'prod-database-backup failed to execute in 300s', snippet: 'Timeout waiting for replication confirmation. Process exited with error code 12.' },
                    { source: 'github', sender: 'GitHub Actions', title: '[PR #402] Build Failed on branch main', snippet: 'Lints failed on pages/api.tsx line 42: max-depth exceeded.' },
                    { source: 'gmail', sender: 'Weekly Newsletter', title: 'Google Cloud Platform Dev Newsletter', snippet: 'Top updates: Serverless v3 improvements, new storage tiers, security bulletins...' },
                    { source: 'jira', sender: 'Product Owner', title: 'FOC-12: Update user onboarding styling configuration', snippet: 'Please update the landing page padding to match the Figma specification...' },
                    { source: 'slack', sender: 'General Channel', title: 'lunch-group: Pizza ordering details for Friday', snippet: 'We are ordering from Dominos. Put your preferences in the Google Sheet link...' }
                  ].map((item, index) => {
                    const src = getSource(item.source);
                    return (
                      <div key={index} style={{ border: `1px solid ${D.border}`, padding: '16px', borderRadius: '12px', background: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: src.color, fontWeight: 'bold' }}>{src.icon} {src.label}</span>
                          <span style={{ fontSize: '11px', color: D.muted }}>{item.sender}</span>
                        </div>
                        <h4 style={{ fontSize: '13px', margin: 0, fontWeight: 700 }}>{item.title}</h4>
                        <p style={{ fontSize: '11px', color: D.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.snippet}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Priortized Triage */}
              <div style={{ background: D.surface, border: `2.5px solid ${D.accent}88`, borderRadius: '24px', padding: '36px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 20px 50px rgba(8,145,178,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 900, margin: 0, background: D.gradText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: '8px' }}><Sparkles size={18}/> FocusOps Triage</h3>
                    <p style={{ fontSize: '12px', color: D.accent, margin: '4px 0 0', fontWeight: 700 }}>AI Agent Prioritized Action Feed</p>
                  </div>
                  <span style={{ fontSize: '12px', background: D.accent + '22', color: D.accent, padding: '6px 12px', borderRadius: '99px', fontWeight: 800, border: `1px solid ${D.accent}33` }}>2 urgent prioritized</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {[
                    { source: 'slack', tier: 'urgent_now', sender: 'Dev-Alerts Bot', title: 'prod-database-backup failed to execute in 300s', reason: 'High critical server error: production database failure detected.' },
                    { source: 'jira', tier: 'urgent_now', sender: 'Security Scanner', title: 'FOC-105: Fix auth token leak (Due today)', reason: 'Security ticket marked high-priority with target due date of today.' },
                    { source: 'github', tier: 'normal', sender: 'GitHub Actions', title: '[PR #402] Build Failed on branch main', reason: 'Normal priority: Main build failure. Immediate action recommended to restore pipeline.' }
                  ].map((item, index) => {
                    const src = getSource(item.source);
                    const tier = getTier(item.tier, isDark);
                    return (
                      <div key={index} style={{ border: `1.5px solid ${tier.border}`, padding: '18px', borderRadius: '14px', background: tier.bg, display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: D.shadow }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: src.color + '16', color: src.color, border: `1px solid ${src.color}28`, padding: '3px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 'bold' }}>{src.icon} {src.label}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: tier.bg, color: tier.text, border: `1px solid ${tier.border}`, padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold' }}>{tier.icon} {tier.label}</span>
                        </div>
                        <h4 style={{ fontSize: '14px', margin: 0, fontWeight: 800, lineHeight: 1.3 }}>{item.title}</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: D.muted, borderTop: `1px solid ${tier.border}`, paddingTop: '8px', marginTop: '2px' }}>
                          <Lightbulb size={11} style={{ flexShrink: 0 }}/>
                          <span><strong>Agent Logic:</strong> {item.reason}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* How it Works - Powered by MCP */}
            <div style={{ textAlign: 'center', marginTop: '64px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '32px' }}>How it Works — Powered by MCP</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                {[
                  { step: '1', title: 'Connect Tools', desc: 'Securely authenticate Gmail, Slack, Jira, GitHub & Calendar via MCP protocols.' },
                  { step: '2', title: 'Fetch Alerts', desc: 'The local MCP server reaches out to individual channel API tools simultaneously.' },
                  { step: '3', title: 'Context Reasoning', desc: 'Context tools extract active project scope and calendar windows for triage logic.' },
                  { step: '4', title: 'Prioritize & Deliver', desc: 'Gemini groups and tags notifications contextually, showing only what requires action.' }
                ].map((s, idx) => (
                  <div key={idx} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: '16px', padding: '24px', textAlign: 'left', position: 'relative', boxShadow: D.shadow }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: D.grad, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '14px', marginBottom: '14px' }}>{s.step}</div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '8px' }}>{s.title}</h3>
                    <p style={{ fontSize: '13px', color: D.muted, lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AGENT CONSOLE
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === 'agent_console') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: D.heroBg, fontFamily: font, color: D.text, overflow: 'hidden' }}>
        <NavBar />
        <OfflineBanner />
        
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', overflow: 'hidden', padding: '24px', boxSizing: 'border-box' }}>
          <div style={{ flex: 1, maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 900, margin: '0 0 5px' }}>Agent Console</h1>
                <p style={{ fontSize: '13px', color: D.muted, margin: 0 }}>Live MCP tool-call trace feed for automation polling</p>
              </div>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={simulateNotification}
                style={{ background: D.grad, color: 'white', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px', boxShadow: '0 4px 14px rgba(8,145,178,0.35)' }}>
                <PlayCircle size={15}/> Simulate Notification
              </motion.button>
            </div>

            <div style={{ flex: 1, background: '#0a0a0a', border: '1px solid #262626', borderRadius: '12px', padding: '16px', overflowY: 'auto', fontFamily: 'monospace', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)' }}>
              {toolTraces.length === 0 ? (
                <div style={{ color: '#525252', textAlign: 'center', padding: '40px 0', fontSize: '14px' }}>
                  <Terminal size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  Waiting for tool calls...<br/>Click "Simulate Notification" to test or wait for polling.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {toolTraces.map((trace, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      style={{ fontSize: '13px', color: '#a3a3a3', display: 'flex', alignItems: 'flex-start', gap: '12px', borderBottom: '1px solid #171717', paddingBottom: '8px' }}>
                      <span style={{ color: '#525252', whiteSpace: 'nowrap' }}>[{trace.timestamp}]</span>
                      <span style={{ color: '#38bdf8', fontWeight: 700, minWidth: '180px' }}>{trace.tool}()</span>
                      <span style={{ color: '#e5e5e5', flex: 1 }}>{trace.summary}</span>
                      {trace.duration !== undefined && <span style={{ color: '#fbbf24' }}>{trace.duration}ms</span>}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INSIGHTS VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === 'insights') {
    const totalCount = notifications.length;
    const slackCount = notifications.filter(n => n.source === 'slack').length;
    const jiraCount = notifications.filter(n => n.source === 'jira').length;
    const gmailCount = notifications.filter(n => n.source === 'gmail').length;
    const calCount = notifications.filter(n => n.source === 'calendar').length;
    const ghCount = notifications.filter(n => n.source === 'github').length;

    const avgTriageTime = "2.4 mins";
    const todayCount = notifications.filter(n => {
      try {
        const date = new Date(n.timestamp);
        return date.toDateString() === new Date().toDateString();
      } catch {
        return true;
      }
    }).length;

    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: D.heroBg, fontFamily: font, color: D.text, overflow: 'hidden' }}>
        <NavBar />
        <OfflineBanner />

        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 900, margin: '0 0 5px' }}>Insights & Analytics</h1>
              <p style={{ fontSize: '14px', color: D.muted, margin: 0 }}>Understand notification trends and prioritize your focus time.</p>
            </div>

            {/* Core Statistics row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              {[
                { title: 'Total Triaged Tasks', value: totalCount, icon: <Inbox size={20}/>, desc: 'Across all integrations' },
                { title: 'Urgent Blocks', value: urgentCount, icon: <AlertTriangle size={20}/>, desc: 'Requires immediate action', color: '#ef4444' },
                { title: 'Time to Triage', value: avgTriageTime, icon: <Zap size={20}/>, desc: 'AI-assisted prioritizer avg' },
                { title: 'Processed Today', value: todayCount, icon: <CheckCircle2 size={20}/>, desc: 'Updates parsed today' }
              ].map((stat, i) => (
                <div key={i} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: '16px', padding: '24px', boxShadow: D.shadow, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: stat.color || D.accent }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: D.muted }}>{stat.title}</span>
                    {stat.icon}
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 900 }}>{stat.value}</div>
                  <span style={{ fontSize: '12px', color: D.muted }}>{stat.desc}</span>
                </div>
              ))}
            </div>

            {/* Breakdown cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: '16px', padding: '24px', boxShadow: D.shadow }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px' }}>Priority Tier Breakdown</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {[
                    { label: 'Urgent Now', count: urgentCount, percentage: totalCount ? (urgentCount/totalCount)*100 : 0, color: '#ef4444' },
                    { label: 'Normal Priority', count: normalCount, percentage: totalCount ? (normalCount/totalCount)*100 : 0, color: '#f59e0b' },
                    { label: 'FYI Only', count: fyiCount, percentage: totalCount ? (fyiCount/totalCount)*100 : 0, color: '#22c55e' }
                  ].map((tier, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                        <span>{tier.label}</span>
                        <span>{tier.count} ({Math.round(tier.percentage)}%)</span>
                      </div>
                      <div style={{ height: '8px', background: isDark ? '#1e293b' : '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ width: `${tier.percentage}%`, height: '100%', background: tier.color, borderRadius: '99px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: '16px', padding: '24px', boxShadow: D.shadow }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '20px' }}>Active Integration Channels</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { label: 'Slack Messages', count: slackCount, color: '#0891b2' },
                    { label: 'Jira Tickets', count: jiraCount, color: '#0369a1' },
                    { label: 'Emails', count: gmailCount, color: '#dc2626' },
                    { label: 'Calendar Events', count: calCount, color: '#0284c7' },
                    { label: 'GitHub Updates', count: ghCount, color: '#374151' }
                  ].map((ch, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', borderBottom: `1px solid ${D.border}`, paddingBottom: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: ch.color }} />
                        {ch.label}
                      </span>
                      <span style={{ fontWeight: 800 }}>{ch.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKSPACE VIEW (THE FULL REDESIGNED FEED + SPLIT DETAILS LAYOUT)
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === 'workspace_dashboard') {
    const tierLabelMap: Record<string, string> = {
      all: 'All Triaged Tasks', urgent_now: 'Urgent Now', normal: 'Normal Priority', fyi_only: 'FYI Only'
    };

    // Filter by activeFilter (tier), channelFilters, AND if the channel is connected
    const workspaceFiltered = notifications.filter(n => {
      const matchesTab = activeFilter === 'all' || n.tier === activeFilter;
      const matchesChannel = channelFilters[n.source] !== false;
      const isConnected = connectedSources[n.source] === true;
      return matchesTab && matchesChannel && isConnected;
    });

    const connectedNotifications = notifications.filter(n => connectedSources[n.source] === true);
    const connUrgentCount = connectedNotifications.filter(n => n.tier === 'urgent_now').length;
    const connNormalCount = connectedNotifications.filter(n => n.tier === 'normal').length;
    const connFyiCount    = connectedNotifications.filter(n => n.tier === 'fyi_only').length;

    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        background: D.heroBg, fontFamily: font, color: D.text, overflow: 'hidden'
      }}>
        <NavBar />
        <OfflineBanner />

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', overflow: 'hidden', padding: '16px 20px', gap: '16px', boxSizing: 'border-box' }}>
          <div style={{ flex: 1, maxWidth: '1440px', display: 'flex', gap: '16px', overflow: 'hidden' }}>
            
            {/* Sidebar Column: Priority Feeds + Connected Channels list */}
            <div style={{ width: '250px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '4px' }}>
              
              {/* PRIORITY FEEDS */}
              <div style={{ background: D.surface, backdropFilter: 'blur(14px)', border: `1px solid ${D.border}`, borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '24px', boxShadow: D.shadow }}>
                <div>
                  <p style={{ fontSize: '10px', fontWeight: 800, color: D.muted, textTransform: 'uppercase', letterSpacing: '1.2px', margin: '0 0 8px' }}>Priority Feeds</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {[
                      { id: 'all',        label: 'All Notifications', count: connectedNotifications.length, icon: <Bell size={13}/>,          color: D.accent },
                      { id: 'urgent_now', label: 'Urgent Now',        count: connUrgentCount,           icon: <AlertTriangle size={13}/>, color: '#ef4444' },
                      { id: 'normal',     label: 'Normal Priority',   count: connNormalCount,           icon: <Clock size={13}/>,         color: '#f59e0b' },
                      { id: 'fyi_only',   label: 'FYI Only',          count: connFyiCount,              icon: <Info size={13}/>,          color: '#22c55e' },
                    ].map(tab => (
                      <button key={tab.id} onClick={() => setActiveFilter(tab.id as any)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: activeFilter === tab.id ? D.activeBg : 'transparent', border: activeFilter === tab.id ? `1px solid ${tab.color}28` : '1px solid transparent', borderRadius: '9px', padding: '9px 10px', color: activeFilter === tab.id ? tab.color : D.muted, fontSize: '13px', fontWeight: activeFilter === tab.id ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>{tab.icon} {tab.label}</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, background: activeFilter === tab.id ? tab.color + '1a' : isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', color: activeFilter === tab.id ? tab.color : D.muted, padding: '2px 7px', borderRadius: '99px' }}>{tab.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* CONNECTED CHANNELS STATUS CARD (Separately below Priority Feeds) */}
              <div style={{ background: D.surface, backdropFilter: 'blur(14px)', border: `1px solid ${D.border}`, borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: D.shadow }}>
                <p style={{ fontSize: '10px', fontWeight: 800, color: D.muted, textTransform: 'uppercase', letterSpacing: '1.2px', margin: '0' }}>CONNECTED CHANNELS</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {[
                    { key: 'gmail',    label: 'Gmail',    icon: <Mail size={13}/>,          color: '#dc2626' },
                    { key: 'slack',    label: 'Slack',    icon: <MessageSquare size={13}/>, color: '#0891b2' },
                    { key: 'jira',     label: 'Jira',     icon: <Ticket size={13}/>,        color: '#0369a1' },
                    { key: 'github',   label: 'GitHub',   icon: <GitBranch size={13}/>,     color: '#374151' },
                    { key: 'calendar', label: 'Calendar', icon: <Calendar size={13}/>,      color: '#0284c7' },
                  ].map(ch => {
                    const isConnected = connectedSources[ch.key] === true;
                    return (
                      <div key={ch.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: D.text }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: ch.color }}>{ch.icon}</span> 
                          <span style={{ fontWeight: isConnected ? 'bold' : 'normal' }}>{ch.label}</span>
                        </span>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isConnected ? '#22c55e' : '#64748b', boxShadow: isConnected ? '0 0 7px rgba(34,197,94,0.7)' : 'none' }} />
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Center Feed Column (Takes up center fully) */}
            <div style={{ flex: 1, minWidth: '400px', display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingRight: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexShrink: 0 }}>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: 900, margin: '0 0 5px', letterSpacing: '-0.5px', background: D.gradText, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Workspace Feed</h1>
                  <p style={{ fontSize: '13px', color: D.muted, margin: 0 }}>Triage list containing {workspaceFiltered.length} active updates</p>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
                  {/* Channel filters popover trigger button */}
                  <button onClick={() => setFilterOpen(o => !o)}
                    style={{ background: isFiltering ? D.accent + '22' : 'transparent', border: `1px solid ${isFiltering ? D.accent : D.border}`, color: isFiltering ? D.accent : D.muted, padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: font }}>
                    <Filter size={13}/> Filter
                    {isFiltering && (
                      <span style={{ fontSize: '9px', background: D.accent, color: 'white', width: '15px', height: '15px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>

                  {filterOpen && (
                    <>
                      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 19 }} onClick={() => setFilterOpen(false)} />
                      <div style={{ position: 'absolute', top: '100%', right: '90px', marginTop: '6px', background: D.surface, border: `1px solid ${D.border}`, borderRadius: '12px', padding: '12px', width: '150px', boxShadow: D.shadow, display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 20 }}>
                        <p style={{ fontSize: '9px', fontWeight: 800, color: D.muted, textTransform: 'uppercase', margin: '0' }}>Select Channels</p>
                        {Object.keys(channelFilters).map((chKey) => {
                          const meta = getSource(chKey);
                          const isChecked = channelFilters[chKey] !== false;
                          return (
                            <label key={chKey} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                              <input type="checkbox" checked={isChecked} onChange={() => setChannelFilters(prev => ({ ...prev, [chKey]: !prev[chKey] }))} style={{ cursor: 'pointer', accentColor: D.accent }} />
                              <span style={{ color: meta.color, display: 'flex' }}>{meta.icon}</span>
                              <span>{meta.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {backendConnected && (
                    <button onClick={fetchLiveNotifications} disabled={isLoading}
                      style={{ background: isLoading ? '#475569' : D.grad, color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: font }}>
                      <RefreshCw size={13}/> Sync
                    </button>
                  )}
                </div>
              </div>

              <div style={{ fontSize: '13px', fontWeight: 700, color: D.muted, marginBottom: '12px' }}>{tierLabelMap[activeFilter]} ({workspaceFiltered.length})</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '24px' }}>
                {workspaceFiltered.length === 0 ? (
                  <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: '16px', padding: '60px 24px', textAlign: 'center', color: D.muted }}>
                    <Inbox size={40} style={{ marginBottom: '12px', opacity: 0.35 }} />
                    <div style={{ fontSize: '17px', fontWeight: 700, marginBottom: '5px' }}>All clear!</div>
                    <div style={{ fontSize: '14px' }}>No notifications in this feed.</div>
                  </div>
                ) : (
                  <AnimatePresence>
                    {workspaceFiltered.map((item, i) => {
                      const src = getSource(item.source);
                      const tier = getTier(item.tier, isDark);
                      const sel = selectedItem?.id === item.id;
                      return (
                        <motion.div key={item.id}
                          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                          transition={{ delay: i * 0.03, ease: [0.16,1,0.3,1] }}
                          onClick={() => setSelectedItem(item)}
                          whileHover={{ y: -2, boxShadow: '0 10px 28px rgba(8,145,178,0.14)' }}
                          style={{ background: D.surface, backdropFilter: 'blur(10px)', border: `1.5px solid ${sel ? D.accent : D.border}`, borderRadius: '14px', padding: '18px 20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: sel ? `0 0 0 3px rgba(8,145,178,0.15)` : D.shadow, transition: 'border-color 0.2s, box-shadow 0.2s' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: src.color + '16', color: src.color, border: `1px solid ${src.color}28`, padding: '4px 10px', borderRadius: '99px', fontSize: '10px', fontWeight: 'bold' }}>{src.icon} {src.label}</span>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: D.muted }}>{item.sender}</span>
                            </div>
                            {item.accountEmail && <span style={{ fontSize: '10px', color: D.muted, opacity: 0.6 }}>{item.accountEmail}</span>}
                          </div>
                          <div>
                            <h3 style={{ fontSize: '15px', margin: '0 0 5px', fontWeight: 'bold', lineHeight: 1.3 }}>{item.title}</h3>
                            <p style={{ fontSize: '13px', color: D.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.snippet}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: tier.bg, color: tier.text, border: `1px solid ${tier.border}`, padding: '4px 10px', borderRadius: '7px', fontSize: '11px', fontWeight: 'bold' }}>{tier.icon} {tier.label}</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: D.muted, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', padding: '4px 10px', borderRadius: '7px', border: `1px solid ${D.border}` }}><Lightbulb size={10}/> {item.reason}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </div>

            {/* Right Column (Details on Top + AI Chat on Bottom) */}
            <div style={{ width: '350px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '4px' }}>
              
              {/* Notification Details (Explanation Card) stacked above AI Agent */}
              <div style={{ background: D.surface, backdropFilter: 'blur(14px)', border: `1px solid ${D.border}`, borderRadius: '16px', padding: '18px', boxShadow: D.shadow, flexShrink: 0 }}>
                <p style={{ fontSize: '10px', fontWeight: 800, color: D.muted, textTransform: 'uppercase', letterSpacing: '1.2px', margin: '0 0 12px' }}>Notification Explanations</p>
                {selectedItem ? (
                  <motion.div key={selectedItem.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(() => { const s = getSource(selectedItem.source); return (
                      <div style={{ background: s.color + '12', border: `1px solid ${s.color}22`, borderRadius: '9px', padding: '10px 12px', color: s.color, fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>{s.icon} Extracted from {s.label.toUpperCase()}</div>
                    );})()}
                    {[['Sender', selectedItem.sender],['Subject', selectedItem.title]].map(([lbl,val]) => (
                      <div key={lbl}><div style={{ fontSize: '10px', color: D.muted, marginBottom: '2px', fontWeight: 700 }}>{lbl}</div><div style={{ fontSize: '14px', fontWeight: 700 }}>{val}</div></div>
                    ))}
                    <div>
                      <div style={{ fontSize: '10px', color: D.muted, marginBottom: '4px', fontWeight: 700 }}>Snippet Preview</div>
                      <div style={{ fontSize: '12px', color: D.muted, lineHeight: 1.5, background: isDark ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.03)', padding: '10px', borderRadius: '8px', border: `1px solid ${D.border}` }}>{selectedItem.snippet}</div>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: D.accent, display: 'flex', alignItems: 'center', gap: '5px' }}><Lightbulb size={12}/> {selectedItem.reason}</div>
                    
                    {/* Related Context */}
                    {(() => {
                      const related = getRelatedItems(selectedItem);
                      if (related.length === 0) return null;
                      return (
                        <div style={{ borderTop: `1px solid ${D.border}`, paddingTop: '12px', marginTop: '4px' }}>
                          <div style={{ fontSize: '10px', color: D.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>Related Context</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {related.map(rel => {
                              const relSrc = getSource(rel.source);
                              return (
                                <div key={rel.id} onClick={() => setSelectedItem(rel)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', border: `1px solid ${D.border}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', cursor: 'pointer', transition: 'all 0.15s' }}>
                                  <span style={{ color: relSrc.color }}>{relSrc.icon}</span>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rel.title}</div>
                                    <div style={{ fontSize: '9px', color: D.muted }}>{rel.sender}</div>
                                  </div>
                                  <ArrowRight size={10} style={{ color: D.muted }}/>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => window.open(selectedItem.link, '_blank')}
                      style={{ background: D.grad, color: 'white', border: 'none', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(8,145,178,0.32)' }}>
                      <ExternalLink size={13}/> View Original Source
                    </motion.button>
                  </motion.div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '24px 0', color: D.muted }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${D.border}` }}><Inbox size={22}/></div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>Select a notification</div>
                      <div style={{ fontSize: '12px', lineHeight: 1.5 }}>Click any item in the feed<br/>to see its details here</div>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Agent Chat (on the bottom of right panel) */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: D.surface, backdropFilter: 'blur(14px)', border: `1px solid ${D.border}`, borderRadius: '16px', padding: '18px', boxShadow: D.shadow, minHeight: '320px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '10px', borderBottom: `1px solid ${D.border}`, flexShrink: 0 }}>
                  <div style={{ background: D.grad, borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={14} color="white"/></div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800 }}>Focus Agent</div>
                    <div style={{ fontSize: '11px', color: D.muted }}>AI priorities copilot</div>
                  </div>
                  {/* Redirect button to Focus Agent tab using custom expanding icon */}
                  <button onClick={() => setView('dashboard')}
                    title="Open Focus Agent"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent',
                      border: `1.5px solid ${D.border}`, borderRadius: '6px', width: '28px', height: '28px',
                      color: D.accent, cursor: 'pointer', marginLeft: 'auto', transition: 'all 0.15s'
                    }}>
                    <Maximize2 size={13}/>
                  </button>
                </div>

                <div ref={chatBoxRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '9px', padding: '12px 2px', minHeight: 0 }}>
                  {chatHistory.map((msg, i) => (
                    <div key={i} style={{
                      alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      background: msg.sender === 'user' ? D.grad : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                      color: msg.sender === 'user' ? 'white' : D.text, padding: '10px 14px',
                      borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      maxWidth: '85%', fontSize: '13px', lineHeight: 1.5,
                      border: msg.sender === 'agent' ? `1px solid ${D.border}` : 'none'
                    }}>
                      {msg.text}
                    </div>
                  ))}
                  <div ref={chatEndRef}/>
                </div>

                <div style={{ display: 'flex', gap: '7px', flexShrink: 0, paddingTop: '10px', borderTop: `1px solid ${D.border}` }}>
                  <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
                    placeholder="Ask agent..."
                    style={{ flex: 1, background: isDark ? 'rgba(0,0,0,0.3)' : 'white', border: `1.5px solid ${D.border}`, borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: D.text, outline: 'none', fontFamily: font }}
                  />
                  <button onClick={handleSendMessage} style={{ background: D.grad, color: 'white', border: 'none', borderRadius: '8px', padding: '0 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 'bold' }}>
                    <Send size={13}/>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FOCUS AGENT VIEW (CHAT-CENTRIC AGENT CONSOLE WITH CHAT HISTORY TIMELINE)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: D.heroBg, fontFamily: font, color: D.text, overflow: 'hidden'
    }}>
      <NavBar />
      <OfflineBanner />
      <ConsentModalOverlay />

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', overflow: 'hidden', padding: '16px 20px', gap: '16px', boxSizing: 'border-box' }}>
        <div style={{ flex: 1, maxWidth: '1440px', display: 'flex', gap: '16px', overflow: 'hidden' }}>
          
          {/* ── LEFT COLUMN (Channels Connect/Disconnect + Status Stats Cards) ── */}
          <div style={{ width: '250px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '4px' }}>
            
            {/* CHANNELS CARD */}
            <div style={{ background: D.surface, backdropFilter: 'blur(14px)', border: `1px solid ${D.border}`, borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: D.shadow }}>
              <p style={{ fontSize: '10px', fontWeight: 800, color: D.muted, textTransform: 'uppercase', letterSpacing: '1.2px', margin: '0' }}>CHANNELS</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { key: 'gmail',    label: 'Gmail',    icon: <Mail size={13}/>,          color: '#dc2626' },
                  { key: 'slack',    label: 'Slack',    icon: <MessageSquare size={13}/>, color: '#0891b2' },
                  { key: 'jira',     label: 'Jira',     icon: <Ticket size={13}/>,        color: '#0369a1' },
                  { key: 'github',   label: 'GitHub',   icon: <GitBranch size={13}/>,     color: '#374151' },
                  { key: 'calendar', label: 'Calendar', icon: <Calendar size={13}/>,      color: '#0284c7' },
                ].map(ch => {
                  const isConnected = connectedSources[ch.key] === true;
                  return (
                    <div key={ch.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: D.text }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: ch.color }}>{ch.icon}</span> 
                          <span style={{ fontWeight: isConnected ? 'bold' : 'normal' }}>{ch.label}</span>
                        </span>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isConnected ? '#22c55e' : '#64748b', boxShadow: isConnected ? '0 0 7px rgba(34,197,94,0.7)' : 'none' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        {isConnected ? (
                          <button onClick={() => triggerDisconnect(ch.key)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', cursor: 'pointer', padding: '2px 0', textDecoration: 'underline' }}>
                            Disconnect
                          </button>
                        ) : (
                          <button onClick={() => triggerConnect(ch.key, ch.label)} style={{ background: D.grad, border: 'none', borderRadius: '4px', color: 'white', fontSize: '11px', cursor: 'pointer', padding: '2px 8px', fontWeight: 'bold' }}>
                            Connect
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STATUS CARD */}
            <div style={{ background: D.surface, backdropFilter: 'blur(14px)', border: `1px solid ${D.border}`, borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: D.shadow }}>
              <p style={{ fontSize: '10px', fontWeight: 800, color: D.muted, textTransform: 'uppercase', letterSpacing: '1.2px', margin: '0' }}>STATUS</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Backend</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: backendConnected ? '#22c55e' : '#ef4444' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: backendConnected ? '#22c55e' : '#ef4444' }} />
                    {backendConnected ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${D.border}`, paddingTop: '8px' }}>
                  <span>Total</span>
                  <span style={{ fontWeight: 'bold' }}>{notifications.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Urgent</span>
                  <span style={{ fontWeight: 'bold', color: '#ef4444' }}>{urgentCount}</span>
                </div>
              </div>
            </div>

          </div>

          {/* ── CENTER COLUMN (Main Wide Agent Interface) ── */}
          <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', background: D.surface, border: `1px solid ${D.border}`, borderRadius: '16px', padding: '18px', boxShadow: D.shadow, overflow: 'hidden' }}>
            
            {/* Agent Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', borderBottom: `1px solid ${D.border}`, flexShrink: 0 }}>
              <div style={{ background: D.grad, borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(8,145,178,0.4)' }}>
                <Bot size={18} color="white"/>
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 900 }}>FocusOps Agent</div>
                <div style={{ fontSize: '11px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                  Online · context-aware prioritizer
                </div>
              </div>
            </div>

            {/* Chat message timeline */}
            <div ref={chatBoxRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 2px', minHeight: 0 }}>
              {chatHistory.map((msg, i) => (
                <div key={i} style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  background: msg.sender === 'user' ? D.grad : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                  color: msg.sender === 'user' ? 'white' : D.text, padding: '12px 16px',
                  borderRadius: msg.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  maxWidth: '80%', fontSize: '13px', lineHeight: 1.55,
                  border: msg.sender === 'agent' ? `1px solid ${D.border}` : 'none',
                  boxShadow: msg.sender === 'user' ? '0 3px 12px rgba(8,145,178,0.2)' : 'none',
                  whiteSpace: 'pre-wrap'
                }}>
                  {msg.text}
                </div>
              ))}
              <div ref={chatEndRef}/>
            </div>

            {/* Chat Input controls */}
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0, paddingTop: '12px', borderTop: `1px solid ${D.border}`, flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
                  placeholder="Ask the prioritizer agent..."
                  style={{ flex: 1, background: isDark ? 'rgba(0,0,0,0.3)' : 'white', border: `1.5px solid ${D.border}`, borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: D.text, outline: 'none', fontFamily: font }}
                />
                <button onClick={handleSendMessage} style={{ background: D.grad, color: 'white', border: 'none', borderRadius: '8px', padding: '0 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 'bold', boxShadow: '0 2px 8px rgba(8,145,178,0.3)' }}>
                  <Send size={14}/> Send
                </button>
              </div>

              {/* Bottom tag buttons showing notification stats dynamically */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                <button onClick={() => handleQuickQuestion('What is urgent now?')}
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: font, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <AlertTriangle size={11}/> Urgent Now {filteredUrgent}
                </button>
                <button onClick={() => handleQuickQuestion('Show normal priority notifications')}
                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#fde68a', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: font, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={11}/> Normal {filteredNormal}
                </button>
                <button onClick={() => handleQuickQuestion('Show FYI notifications')}
                  style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.22)', color: '#86efac', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: font, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Info size={11}/> FYI Only {filteredFyi}
                </button>
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN (Chat Session History Control) ── */}
          <div style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', background: D.surface, border: `1px solid ${D.border}`, borderRadius: '16px', padding: '18px', boxShadow: D.shadow }}>
            
            {/* Header with New Session button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: `1px solid ${D.border}`, flexShrink: 0 }}>
              <span style={{ fontSize: '12px', fontWeight: 900, color: D.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageCircle size={14}/> CHAT HISTORY
              </span>
              <button onClick={handleNewChat}
                style={{
                  background: 'transparent', border: `1px solid ${D.border}`, borderRadius: '6px',
                  color: D.accent, padding: '4px 10px', fontSize: '11px', cursor: 'pointer',
                  fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px'
                }}>
                <Plus size={11}/> New
              </button>
            </div>

            {/* List of active/archived sessions */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px' }}>
              {chatSessions.length === 0 ? (
                <div style={{ color: '#525252', fontSize: '12px', textAlign: 'center', padding: '30px 0' }}>
                  No active session history.
                </div>
              ) : (
                chatSessions.map((sess) => {
                  const isActive = activeSessionId === sess.id;
                  return (
                    <div key={sess.id} onClick={() => handleLoadSession(sess)}
                      style={{
                        padding: '10px', borderRadius: '8px', border: `1px solid ${isActive ? D.accent : D.border}`,
                        background: isActive ? D.activeBg : 'transparent', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', gap: '4px', transition: 'all 0.15s',
                        position: 'relative'
                      }}>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: isActive ? D.accent : D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '20px' }}>
                        {sess.title}
                      </div>
                      <div style={{ fontSize: '9px', color: D.muted }}>
                        {sess.timestamp}
                      </div>
                      <button onClick={(e) => handleDeleteSession(sess.id, e)}
                        style={{
                          position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', color: '#ef4444', opacity: 0.6,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; }}>
                        <Trash2 size={11}/>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

          </div>{/* End Right Column */}

        </div>
      </div>
    </div>
  );
}
