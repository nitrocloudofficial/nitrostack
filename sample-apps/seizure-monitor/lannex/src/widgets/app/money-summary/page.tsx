'use client';

import { useRef, useState, useEffect } from 'react';
import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';

/* ─── Types ─────────────────────────────────────────────────── */

interface QuickAction { label: string; action: string; }
interface MoneySummaryData {
  balance: number;
  owed: number;
  investmentGrowth: number;
  quickActions: QuickAction[];
  portfolio?: any;
  debts?: any[];
  recentTransactions?: any[];
  incomeVsOutgoing?: any;
}

// Redact utility
function redactSensitiveInfo(text: string): string {
  if (!text) return text;
  let redacted = text;
  redacted = redacted.replace(/\b(?:\d[ -]*?){13,19}\b/g, '[REDACTED_ACCOUNT]');
  redacted = redacted.replace(/\b(?:\+\d{1,3}[ -]?)?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}\b/g, '[REDACTED_PHONE]');
  redacted = redacted.replace(/\b(?:OTP|code|pin)\s*[:\-]?\s*\d{4,8}\b/gi, '[REDACTED_OTP]');
  return redacted;
}

type Page = 'dashboard' | 'log_expense' | 'split_bill' | 'view_investments';

interface WidgetState {
  [key: string]: any;
  themeOverride: 'light' | 'dark' | null;
  torchOn: boolean;
  cameraOpen: boolean;
  cameraError: string | null;
  page: Page;
  // Log Expense
  expAmount: string;
  expMerchant: string;
  expCategory: string;
  expSubmitted: boolean;
  expUploading?: boolean;
  // Split Bill
  splitTotal: string;
  splitTax: string;
  splitTip: string;
  splitPeople: string;
  splitResult: Record<string, { subtotal: number; tax: number; tip: number; total: number; wa?: string }> | null;
  // Outstanding debts processing
  debtProcessingId: string | null;
  // Notification scheduling
  schedulingNotificationFor: { person: string; amount: number } | null;
  notificationTime: string;
  notificationSuccess: boolean;
}

const DEFAULT_STATE: WidgetState = {
  themeOverride: null,
  torchOn: false,
  cameraOpen: false,
  cameraError: null,
  page: 'dashboard',
  expAmount: '',
  expMerchant: '',
  expCategory: 'groceries',
  expSubmitted: false,
  splitTotal: '',
  splitTax: '',
  splitTip: '',
  splitPeople: '',
  splitResult: null,
  debtProcessingId: null,
  schedulingNotificationFor: null,
  notificationTime: '',
  notificationSuccess: false,
};

/* ─── Helpers ────────────────────────────────────────────────── */

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

const NOISE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E")`;

const CATEGORIES = ['groceries', 'coffee', 'transport', 'entertainment', 'shopping', 'dining', 'utilities', 'other'];

const Sparkline = ({ color }: { color: string }) => (
  <svg width="50" height="18" viewBox="0 0 80 24" fill="none">
    <path d="M2 20L15 12L25 15L40 6L55 10L68 4L78 8" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ─── Action Icons ───────────────────────────────────────────── */

const icons: Record<string, JSX.Element> = {
  log_expense: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  ),
  split_bill: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  ),
  view_investments: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
    </svg>
  ),
};

const BackArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

/* ─── Component ──────────────────────────────────────────────── */

export default function MoneySummary() {
  const hostTheme = useTheme();
  // We use sendFollowUpMessage to trigger a widget refresh if requestUpdate isn't exposed
  const { getToolOutput, callTool, sendFollowUpMessage } = useWidgetSDK();
  const [state, setState] = useWidgetState<WidgetState>(() => DEFAULT_STATE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load and schedule pending notifications from local storage
    try {
      const saved = localStorage.getItem('lannex_notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        const now = Date.now();
        const active = parsed.filter((n: any) => new Date(n.time).getTime() > now);
        
        active.forEach((n: any) => {
          const delay = new Date(n.time).getTime() - now;
          setTimeout(() => {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(n.title, { body: n.body });
            }
          }, delay);
        });
        
        localStorage.setItem('lannex_notifications', JSON.stringify(active));
      }
    } catch (e) {}
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const data = getToolOutput<MoneySummaryData>();
  const s = state ?? DEFAULT_STATE;
  const isDark = s.themeOverride ? s.themeOverride === 'dark' : hostTheme === 'dark';

  /* ── palette ── */
  const accent = '#4F46E5';
  const bg     = isDark ? '#050505' : '#F3F4F6';
  const cardBg = isDark ? '#111111' : '#FFFFFF';
  const fg     = isDark ? '#FAFAFA' : '#111827';
  const subtle = isDark ? '#1A1A1A' : '#F9FAFB';
  const border = isDark ? '#262626' : '#E5E7EB';
  const muted  = isDark ? '#8A8A8A' : '#737373';
  const up     = isDark ? '#10B981' : '#059669';
  const down   = isDark ? '#EF4444' : '#DC2626';

  const fontDisplay = '"Outfit", system-ui, -apple-system, sans-serif';
  const fontSans    = '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif';

  /* ── Camera logic ── */
  const openCamera = async () => {
    setState({ ...s, cameraOpen: true, cameraError: null, torchOn: false });
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setState({ ...s, cameraOpen: true, cameraError: 'Camera access denied. Please enable camera permissions in your browser or device settings and try again.' });
      }
    }, 100);
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setState({ ...s, cameraOpen: false, cameraError: null, torchOn: false });
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      const caps = track.getCapabilities() as any;
      if (caps.torch) {
        const next = !s.torchOn;
        try { await track.applyConstraints({ advanced: [{ torch: next } as any] }); setState({ ...s, torchOn: next }); } catch {}
      }
    }
  };

  /* ── Debt actions ── */
  const doMarkPaid = async (debtId: string) => {
    set({ debtProcessingId: debtId });
    try {
      await callTool('debts_mark_debt_paid', { id: debtId });
      // Send a silent follow-up message to force the model to fetch fresh state, or just let the user know
      // In Nitrostack widgets, state syncs when the model replies, so we might need to send a message
      sendFollowUpMessage(`I just marked the debt ${debtId} as paid. Please acknowledge.`);
    } catch (e) {
      alert('Failed to mark debt as paid');
    } finally {
      set({ debtProcessingId: null });
    }
  };

  const confirmScheduleNotification = () => {
    if (!s.schedulingNotificationFor || !s.notificationTime) return;
    const { person, amount } = s.schedulingNotificationFor;
    const title = 'Lannex Reminder';
    const body = `Time to request ₹${amount} from ${person}!`;
    const delay = new Date(s.notificationTime).getTime() - Date.now();

    if (delay < 0) {
      alert('Please select a time in the future');
      return;
    }

    if (!('Notification' in window)) {
      alert('This browser does not support mobile/desktop notifications');
      set({ schedulingNotificationFor: null });
      return;
    }

    const scheduleWithDelay = () => {
      setTimeout(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, { body });
        }
      }, delay);
      
      // Save to local storage
      try {
        const saved = JSON.parse(localStorage.getItem('lannex_notifications') || '[]');
        saved.push({ title, body, time: s.notificationTime });
        localStorage.setItem('lannex_notifications', JSON.stringify(saved));
      } catch (e) {}

      set({ schedulingNotificationFor: null, notificationSuccess: true });
      setTimeout(() => set({ notificationSuccess: false }), 3000);
    };

    if (Notification.permission === 'granted') {
      scheduleWithDelay();
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          scheduleWithDelay();
        } else {
          set({ schedulingNotificationFor: null });
        }
      });
    } else {
      alert('Notification permissions are denied. Please enable them in your settings.');
      set({ schedulingNotificationFor: null });
    }
  };

  /* ── Split Bill logic ── */
  const doSplitBill = async () => {
    const total = parseFloat(s.splitTotal);
    const tax = parseFloat(s.splitTax) || 0;
    const tip = parseFloat(s.splitTip) || 0;
    const names = redactSensitiveInfo(s.splitPeople).split(',').map(n => n.trim()).filter(Boolean);
    if (!total || names.length === 0) return;

    try {
      const res = await callTool('splitter_split_bill', {
        bill_amount: total,
        tax_amount: tax,
        tip_amount: tip,
        friends: names
      });
      if (res && typeof res === 'object') {
        const result: Record<string, any> = {};
        for (const name of names) {
          result[name] = { total: (res as any)[name] || total / names.length, subtotal: 0, tax: 0, tip: 0, wa: '' };
        }
        setState({ ...s, splitResult: result });
      }
    } catch (e) {
      alert('Split bill tool executed');
    }
  };

  /* ── Log Expense logic ── */
  const doLogExpense = async () => {
    if (!s.expAmount || !s.expMerchant) return;
    setState({ ...s, expSubmitted: true });
    
    await callTool('expenses_log_transaction', {
      amount: parseFloat(s.expAmount),
      merchant: redactSensitiveInfo(s.expMerchant),
      category: s.expCategory,
      timestamp: new Date().toISOString(),
      type: 'expense'
    });
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    set({ expUploading: true, cameraOpen: false });

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      try {
        // Use fetch() directly — bypasses callTool/AI agent to avoid tool name hallucination
        const res = await fetch('http://localhost:3000/webhook/receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_name: file.name, file_content: base64 })
        });
        const data = await res.json();

        if (data.success) {
          // Send follow-up message to trigger Claude analysis with explicit file path
          sendFollowUpMessage(
            `Receipt uploaded successfully!\n\n` +
            `Please analyze this receipt:\n` +
            `1. Call expenses_scan_receipt_vision with file_path: "${data.filePath}"\n` +
            `2. Extract the merchant name, total amount, category, and date from the image\n` +
            `3. Call expenses_log_transaction to save the expense\n` +
            `4. Show me a summary\n\n` +
            `File path: ${data.filePath}`
          );

          // Navigate back to dashboard (Claude will show results in chat)
          set({ page: 'dashboard', expUploading: false });
        } else {
          alert('Upload failed: ' + (data.error || 'Unknown error'));
          set({ expUploading: false });
        }
      } catch (err) {
        alert('Failed to reach upload server. Make sure npm run dev is running on port 3000.');
        set({ expUploading: false });
      }
    };
    reader.readAsDataURL(file);
  };

  const set = (patch: Partial<WidgetState>) => setState({ ...s, ...patch });
  const goBack = () => set({ page: 'dashboard', splitResult: null, expSubmitted: false });

  /* ── shared styles ── */
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', fontSize: '13px',
    background: subtle, border: `1px solid ${border}`, borderRadius: '8px',
    color: fg, fontFamily: fontSans, outline: 'none',
    transition: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease'
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em',
    textTransform: 'uppercase', color: muted, marginBottom: '6px', display: 'block',
  };
  const primaryBtnStyle: React.CSSProperties = {
    width: '100%', padding: '12px', background: fg, border: 'none',
    borderRadius: '10px', color: bg, cursor: 'pointer', fontSize: '12px', fontWeight: 700,
    letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: fontSans,
    transition: 'background-color 0.3s ease, color 0.3s ease, opacity 0.2s ease',
  };
  const accentBtnStyle: React.CSSProperties = {
    ...primaryBtnStyle,
    background: accent, color: '#FFF',
  };
  const containerTransition = { transition: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease' };

  if (!data || !mounted) {
    return <div style={{ background: cardBg, color: muted, padding: '24px', textAlign: 'center', fontFamily: fontSans, fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Loading</div>;
  }

  const balance = data?.balance ?? 0;
  const owed = data?.owed ?? 0;
  const growth = data?.investmentGrowth ?? 0;
  
  // Exclude removed actions (remind_friend is gone)
  const quickActions = (data?.quickActions ?? []).filter(qa => qa.action === 'log_expense' || qa.action === 'split_bill' || qa.action === 'view_investments' || qa.action === 'invest_spare_cash');
  
  let growthColor = muted;
  let growthSign = '';
  if (growth > 0) { growthColor = up; growthSign = '+'; }
  else if (growth < 0) { growthColor = down; }
  const growthLabel = `${growthSign}${growth.toFixed(2)}%`;

  const debts = data.debts || [];
  const oweMe = debts.filter((d: any) => d.type === 'owe_me' && d.status === 'pending');
  const iOwe = debts.filter((d: any) => d.type === 'i_owe' && d.status === 'pending');

  /* ──────────────── Page: Log Expense ──────────────── */
  const renderLogExpense = () => (
    <div style={{ padding: '0 24px 24px' }}>
      <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: fontDisplay, color: fg, marginBottom: '4px', ...containerTransition }}>Log Expense</div>
      <div style={{ fontSize: '12px', color: muted, marginBottom: '20px', ...containerTransition }}>Add a new transaction to your records</div>

      {s.expSubmitted ? (
        <div style={{ textAlign: 'center', padding: '24px', background: `${up}15`, borderRadius: '12px', border: `1px solid ${up}`, ...containerTransition }}>
          <div style={{ fontSize: '28px', marginBottom: '8px', ...containerTransition }}>✓</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: up, marginBottom: '4px', ...containerTransition }}>Expense Logged!</div>
          <div style={{ fontSize: '12px', color: muted, ...containerTransition }}>{s.expMerchant} · {fmt(parseFloat(s.expAmount))} · {s.expCategory}</div>
          <button onClick={() => set({ expSubmitted: false, expAmount: '', expMerchant: '', expCategory: 'groceries' })} style={{ ...accentBtnStyle, marginTop: '16px' }}>Log Another</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Amount (₹)</label>
            <input style={inputStyle} type="number" placeholder="0.00" value={s.expAmount} onChange={e => set({ expAmount: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Merchant / Description</label>
            <input style={inputStyle} type="text" placeholder="Starbucks, Rent..." value={s.expMerchant} onChange={e => set({ expMerchant: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select style={{ ...inputStyle, appearance: 'none' as any }} value={s.expCategory} onChange={e => set({ expCategory: e.target.value })}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div style={{ borderTop: `1px solid ${border}`, paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px', ...containerTransition }}>
            <button onClick={doLogExpense} style={primaryBtnStyle}>Add Expense</button>
            <input type="file" accept="image/*,application/pdf" capture="environment" ref={receiptInputRef} style={{ display: 'none' }} onChange={handleReceiptUpload} />
            <button onClick={() => receiptInputRef.current?.click()} disabled={s.expUploading} style={{ ...primaryBtnStyle, background: subtle, border: `1px solid ${border}`, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              {s.expUploading ? 'Uploading...' : 'Upload Receipt Manually'}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  /* ──────────────── Page: Split Bill ──────────────── */
  const renderSplitBill = () => (
    <div style={{ padding: '0 24px 24px' }}>
      <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: fontDisplay, color: fg, marginBottom: '4px', ...containerTransition }}>Split Bill</div>
      <div style={{ fontSize: '12px', color: muted, marginBottom: '20px', ...containerTransition }}>Divide a bill equally and view shares</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={labelStyle}>Total Bill (₹)</label>
          <input style={inputStyle} type="number" placeholder="100.00" value={s.splitTotal} onChange={e => set({ splitTotal: e.target.value })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={labelStyle}>Tax (₹)</label>
            <input style={inputStyle} type="number" placeholder="0.00" value={s.splitTax} onChange={e => set({ splitTax: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Tip (₹)</label>
            <input style={inputStyle} type="number" placeholder="0.00" value={s.splitTip} onChange={e => set({ splitTip: e.target.value })} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>People (comma-separated)</label>
          <input style={inputStyle} type="text" placeholder="Alex, Maya, Jordan" value={s.splitPeople} onChange={e => set({ splitPeople: e.target.value, splitResult: null })} />
        </div>
        <button onClick={doSplitBill} style={primaryBtnStyle}>Calculate Split</button>
      </div>

      {s.splitResult && (
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px', ...containerTransition }}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: muted, marginBottom: '4px', ...containerTransition }}>Results</div>
          {Object.entries(s.splitResult).map(([name, share]: [string, any]) => (
            <div key={name} style={{ padding: '14px', background: subtle, borderRadius: '10px', border: `1px solid ${border}`, ...containerTransition }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: fg, ...containerTransition }}>{name}</span>
                <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: fontDisplay, color: fg, ...containerTransition }}>{fmt(share.total)}</span>
              </div>
              <div style={{ fontSize: '11px', color: muted, marginBottom: '10px', ...containerTransition }}>
                Subtotal {fmt(share.subtotal)} · Tax {fmt(share.tax)} · Tip {fmt(share.tip)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ──────────────── Page: Investments ──────────────── */
  const renderInvestments = () => {
    const p = data?.portfolio;
    if (!p) return <div style={{ padding: '24px', color: fg, ...containerTransition }}>Loading portfolio...</div>;

    return (
      <div style={{ padding: '0 24px 24px' }}>
        <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: fontDisplay, color: fg, marginBottom: '4px', ...containerTransition }}>Professional Portfolio</div>
        <div style={{ fontSize: '12px', color: muted, marginBottom: '20px', ...containerTransition }}>Your diversified asset tracking</div>
        
        {/* Total Value Card */}
        <div style={{ padding: '16px', background: subtle, borderRadius: '12px', border: `1px solid ${border}`, marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px', ...containerTransition }}>
           <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: muted, ...containerTransition }}>Total Value</div>
           <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: fontDisplay, color: fg, ...containerTransition }}>{fmt(p.totalValue)}</div>
           <div style={{ fontSize: '12px', color: p.dailyChange >= 0 ? up : down, fontWeight: 600, ...containerTransition }}>
             {p.dailyChange >= 0 ? '+' : ''}{fmt(p.dailyChange)} ({p.dailyChangePct.toFixed(2)}%) Today
           </div>
        </div>

        {/* Holdings */}
        <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: fontDisplay, color: fg, marginBottom: '10px', ...containerTransition }}>Your Holdings</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {p.assets.map((asset: any) => {
            const val = asset.shares * asset.currentPrice;
            const returns = val - (asset.shares * asset.avgPrice);
            return (
              <div key={asset.ticker} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: subtle, borderRadius: '10px', border: `1px solid ${border}`, ...containerTransition }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: fg, ...containerTransition }}>{asset.ticker}</div>
                  <div style={{ fontSize: '11px', color: muted, ...containerTransition }}>{asset.shares} shares • {asset.type}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: fg, ...containerTransition }}>{fmt(val)}</div>
                  <div style={{ fontSize: '11px', color: returns >= 0 ? up : down, ...containerTransition }}>{returns >= 0 ? '+' : ''}{fmt(returns)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ──────────────── Navigation helpers ──────────────── */
  const pageNavMap: Record<string, Page> = {
    log_expense: 'log_expense',
    split_bill: 'split_bill',
    view_investments: 'view_investments',
    invest_spare_cash: 'view_investments',
  };

  /* ──────────────── Dashboard page ──────────────── */
  const renderDashboard = () => {
    const io = data?.incomeVsOutgoing;
    
    // Calculate ratio for progress bar
    let outPct = 0;
    let inPct = 0;
    if (io) {
      const max = Math.max(io.totalOutgoing, io.totalIncoming, 1);
      outPct = (io.totalOutgoing / max) * 100;
      inPct = (io.totalIncoming / max) * 100;
    }

    return (
      <>
        {/* Balance */}
        <div style={{ padding: '12px 24px 24px 24px', position: 'relative', zIndex: 2 }}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: muted, marginBottom: '8px', ...containerTransition }}>Total Balance</div>
          <div style={{ fontSize: '42px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums', fontFamily: fontDisplay, color: fg, ...containerTransition }}>
            {fmt(balance)}
          </div>
        </div>
        
        {/* Inflow / Outflow Graphs */}
        {io && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 24px 24px', position: 'relative', zIndex: 2 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: fg, ...containerTransition }}>Outgoing</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: fg, ...containerTransition }}>{fmt(io.totalOutgoing)}</span>
              </div>
              <div style={{ height: '6px', background: subtle, borderRadius: '4px', overflow: 'hidden', ...containerTransition }}>
                <div style={{ width: `${outPct}%`, height: '100%', background: down, borderRadius: '4px', transition: 'width 0.5s ease' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: fg, ...containerTransition }}>Incoming</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: fg, ...containerTransition }}>{fmt(io.totalIncoming)}</span>
              </div>
              <div style={{ height: '6px', background: subtle, borderRadius: '4px', overflow: 'hidden', ...containerTransition }}>
                <div style={{ width: `${inPct}%`, height: '100%', background: up, borderRadius: '4px', transition: 'width 0.5s ease' }} />
              </div>
            </div>
          </div>
        )}

        {/* Quick actions grid (OG) */}
        <div style={{ padding: '0 24px 24px 24px', position: 'relative', zIndex: 2 }}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: muted, marginBottom: '12px', ...containerTransition }}>Quick Actions</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {quickActions.map((qa) => {
              const targetPage = pageNavMap[qa.action] || null;
              if (!targetPage) return null; // Filtered out
              return (
                <button
                  key={qa.action}
                  id={`lannex-action-${qa.action}`}
                  onClick={() => targetPage && set({ page: targetPage })}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px', width: '100%', padding: '14px', background: subtle, border: `1px solid ${border}`, borderRadius: '12px', color: fg, cursor: 'pointer', textAlign: 'left', fontFamily: fontSans, ...containerTransition }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: bg, color: fg, border: `1px solid ${border}`, ...containerTransition }}>
                    {icons[qa.action] || icons['view_investments']}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: fg, ...containerTransition }}>{qa.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Scan receipt button */}
        <div style={{ padding: '0 24px 24px', position: 'relative', zIndex: 2 }}>
          <button id="lannex-scan-receipt-btn" onClick={openCamera} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '14px', background: fg, border: 'none', borderRadius: '12px', color: bg, cursor: 'pointer', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: fontSans, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', ...containerTransition }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            Scan Receipt
          </button>
        </div>

        {/* Debts Table */}
        <div style={{ padding: '0 24px 24px', position: 'relative', zIndex: 2 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: fontDisplay, color: fg, marginBottom: '16px', ...containerTransition }}>Debt Tracker</div>
          
          {/* Who Owes Me */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: muted, marginBottom: '12px', ...containerTransition }}>People Who Owe You</div>
            {oweMe.length === 0 ? <div style={{ fontSize: '12px', color: muted, ...containerTransition }}>No one owes you money!</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {oweMe.map((d: any) => (
                  <div key={d.id} style={{ padding: '12px', background: subtle, borderRadius: '10px', border: `1px solid ${border}`, ...containerTransition }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: fg, ...containerTransition }}>{d.person}</div>
                        <div style={{ fontSize: '10px', color: muted, ...containerTransition }}>Since {new Date(d.dateIncurred).toLocaleDateString()}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: fg, ...containerTransition }}>{fmt(d.amount)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: `1px solid ${border}`, ...containerTransition }}>
                      <button onClick={() => doMarkPaid(d.id)} disabled={s.debtProcessingId === d.id} style={{ flex: 1, padding: '8px', background: up, color: '#FFF', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s' }}>
                        {s.debtProcessingId === d.id ? '...' : 'Mark as Paid'}
                      </button>
                      <button onClick={() => set({ schedulingNotificationFor: { person: d.person, amount: d.amount }, notificationTime: '' })} style={{ flex: 1, padding: '8px', background: bg, color: fg, border: `1px solid ${border}`, borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', ...containerTransition }}>
                        Notify Me
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Who I Owe */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: muted, marginBottom: '12px', ...containerTransition }}>People You Owe</div>
            {iOwe.length === 0 ? <div style={{ fontSize: '12px', color: muted, ...containerTransition }}>You don't owe anyone!</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {iOwe.map((d: any) => (
                  <div key={d.id} style={{ padding: '12px', background: subtle, borderRadius: '10px', border: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...containerTransition }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: fg, ...containerTransition }}>{d.person}</div>
                      <div style={{ fontSize: '10px', color: muted, ...containerTransition }}>Since {new Date(d.dateIncurred).toLocaleDateString()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: down, ...containerTransition }}>{fmt(d.amount)}</div>
                      <button onClick={() => doMarkPaid(d.id)} disabled={s.debtProcessingId === d.id} style={{ background: 'none', border: 'none', color: accent, fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0, marginTop: '4px', ...containerTransition }}>
                        {s.debtProcessingId === d.id ? 'Processing...' : 'Settle'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  /* ──────────────── Root render ──────────────── */
  return (
    <div style={{ background: bg, padding: '8px', fontFamily: fontSans, width: '100%', maxWidth: '400px', boxSizing: 'border-box', ...containerTransition }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap');
        * { box-sizing: border-box; }
        input:focus, select:focus { outline: 2px solid ${accent}; }
        a:hover { opacity: 0.85; }
        @keyframes slideUp {
          from { transform: translate(-50%, 20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}} />

      <div style={{ background: cardBg, color: fg, borderRadius: '16px', boxShadow: isDark ? '0 12px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.06)', border: `1px solid ${border}`, position: 'relative', overflow: 'hidden', width: '100%', ...containerTransition }}>
        {/* Noise */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: NOISE, pointerEvents: 'none', mixBlendMode: isDark ? 'overlay' : 'multiply' }} />

        {/* Hidden file inputs */}
        <input type="file" ref={galleryRef} accept="image/*" multiple style={{ display: 'none' }} onChange={handleReceiptUpload} />
        <input type="file" ref={pdfRef} accept="application/pdf" multiple style={{ display: 'none' }} onChange={handleReceiptUpload} />

        {/* Camera overlay */}
        {s.cameraOpen && (
          <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 20, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {!s.cameraError ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', inset: '20%', border: `1.5px solid ${accent}`, pointerEvents: 'none' }} />
                </>
              ) : (
                <div style={{ padding: '32px', textAlign: 'center', color: '#FFF' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                  <p style={{ fontSize: '13px', lineHeight: 1.7, fontWeight: 500, color: '#CCC' }}>{s.cameraError}</p>
                </div>
              )}
            </div>
            <div style={{ padding: '16px', background: '#111', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid #222' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button onClick={() => galleryRef.current?.click()} style={{ flex: 1, background: '#222', color: '#FFF', border: 'none', padding: '12px', cursor: 'pointer', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: fontSans, borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  Gallery
                </button>
                <button onClick={() => pdfRef.current?.click()} style={{ flex: 1, background: '#222', color: '#FFF', border: 'none', padding: '12px', cursor: 'pointer', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: fontSans, borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  PDF
                </button>
                {!s.cameraError && (
                  <button onClick={toggleTorch} style={{ flex: 1, background: s.torchOn ? accent : '#222', color: '#FFF', border: 'none', padding: '12px', cursor: 'pointer', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: fontSans, borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'background 0.2s' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    Torch
                  </button>
                )}
              </div>
              <button onClick={closeCamera} style={{ width: '100%', background: '#FFF', color: '#000', border: 'none', padding: '12px', cursor: 'pointer', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: fontSans, borderRadius: '8px', fontWeight: 700 }}>
                Close Scanner
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0 24px', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {s.page !== 'dashboard' && (
              <button onClick={goBack} style={{ background: 'none', border: 'none', color: fg, cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', ...containerTransition }}>
                <BackArrow />
              </button>
            )}
            <svg width="16" height="16" viewBox="0 0 24 24" fill={accent}><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9 12l2 2 4-4" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: fontDisplay, color: fg, ...containerTransition }}>Lannex</span>
          </div>
          <button onClick={() => set({ themeOverride: isDark ? 'light' : 'dark' })} style={{ background: subtle, border: `1px solid ${border}`, borderRadius: '50px', cursor: 'pointer', padding: '4px 10px', fontSize: '10px', color: fg, letterSpacing: '0.05em', fontFamily: fontSans, display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, ...containerTransition }}>
            {isDark ? '☾ Dark' : '☀ Light'}
          </button>
        </div>

        {/* Page content */}
        <div style={{ paddingTop: '20px', position: 'relative', zIndex: 2 }}>
          {s.page === 'dashboard'        && renderDashboard()}
          {s.page === 'log_expense'      && renderLogExpense()}
          {s.page === 'split_bill'       && renderSplitBill()}
          {s.page === 'view_investments' && renderInvestments()}
        </div>
      </div>

      {/* Scheduling Modal (Rendered outside overflow:hidden container to prevent clipping date pickers) */}
      {s.schedulingNotificationFor && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: cardBg, padding: '24px', borderRadius: '24px', border: `1px solid ${border}`, width: '100%', maxWidth: '340px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', ...containerTransition }}>
            <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: fontDisplay, color: fg, marginBottom: '8px', textAlign: 'center' }}>Set Reminder</div>
            <div style={{ fontSize: '13px', color: muted, marginBottom: '24px', textAlign: 'center', lineHeight: 1.5 }}>
              When should we remind you to collect <strong>{fmt(s.schedulingNotificationFor.amount)}</strong> from <strong>{s.schedulingNotificationFor.person}</strong>?
            </div>
            <div style={{ marginBottom: '24px', background: subtle, padding: '16px', borderRadius: '16px', border: `1px solid ${border}` }}>
              <label style={{ ...labelStyle, marginBottom: '10px' }}>Select Date & Time</label>
              <input 
                type="datetime-local" 
                style={{ ...inputStyle, padding: '14px', fontSize: '16px', borderRadius: '10px', background: bg, fontWeight: 600, fontFamily: fontSans, appearance: 'none', WebkitAppearance: 'none', width: '100%', boxSizing: 'border-box' }} 
                value={s.notificationTime} 
                onChange={e => set({ notificationTime: e.target.value })} 
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => set({ schedulingNotificationFor: null })} style={{ flex: 1, padding: '14px', background: 'transparent', color: muted, border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 700, fontFamily: fontSans, cursor: 'pointer', transition: 'background 0.2s' }}>Cancel</button>
              <button onClick={confirmScheduleNotification} style={{ flex: 1, padding: '14px', background: fg, color: bg, border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 700, fontFamily: fontSans, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', transition: 'transform 0.1s' }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {s.notificationSuccess && (
        <div style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', background: up, color: '#FFF', padding: '12px 24px', borderRadius: '50px', fontSize: '12px', fontWeight: 700, fontFamily: fontSans, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 40, whiteSpace: 'nowrap', animation: 'slideUp 0.3s ease out' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Reminder Scheduled!
        </div>
      )}
    </div>
  );
}
