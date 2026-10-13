/**
 * FORAY — real logins, three surfaces.
 *
 * The student surface is a CHAT (typed or spoken), but it is still not a
 * chatbot in the pitch sense: every student turn is analysed IN PLACE —
 * misconception named from the taxonomy (R-01), correction only when the
 * Grounding Verifier can cite the class's own material (R-02), questions
 * counted per concept (R-12) — and both sides of every exchange land in an
 * append-only log (R-11). The chips under the messages are the product;
 * the conversation is how they're captured.
 *
 * Faculty sees the roster (scenarios + counts) and the questioned-topic
 * counts. Faculty NEVER sees the words: opening a transcript as faculty is
 * refused at the permission boundary and written to the access log — the
 * same boundary as beat 6.
 */

import { Fragment, useEffect, useRef, useState } from 'react';
import { initFx } from './fx';

interface Concept {
  id: string; name: string; unit: string;
  prereqs: string[]; x: number; y: number;
}
interface AccessLogRow {
  actor_role: string; attempted: string; decision: string;
  rule: string; req_id: string; ts: string;
}
interface HeatCell { week: number; concept_id: string; n: number }
interface Heatmap { cohort_size: number; k: number; cells: HeatCell[] }

interface User {
  id: string; email: string; name: string; role: 'student' | 'faculty';
  student_id?: string | null; class_id?: string | null;
  scenario?: string | null; scenario_note?: string | null;
}
interface ClassRoom {
  id: string; name: string; code: string; unit: string; source: string;
  course: string;
}
interface Ctx {
  user: User;
  class: ClassRoom | null;          // the subject this session is scoped to
  classes?: ClassRoom[];            // everything the student is enrolled in
  faculty: { name: string; email: string } | null;
}

const WEEKS = [1, 2, 3, 4, 5, 6, 7, 8];
const TOKEN_KEY = 'foray_token';

function authHeaders(): Record<string, string> {
  const t = localStorage.getItem(TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function useJson<T>(url: string, dep: unknown = null): T | null {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let live = true;
    fetch(url, { headers: authHeaders() })
      .then((r) => {
        // A 401 means the stored token has expired or been wiped.
        // Clear it and reload so the user sees the login screen rather
        // than every panel freezing on "Loading…" indefinitely.
        if (r.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          window.location.reload();
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((d) => live && setData(d))
      .catch(() => live && setData(null));
    return () => { live = false; };
  }, [url, dep]);
  return data;
}

/** Small grey requirement stamp in the panel corner. Judges ask for these. */
function Req({ id }: { id: string }) {
  return <span className="req">{id}</span>;
}

/**
 * What the student sees under a reply.
 *
 * The API returns real provenance — `gemini:gemini-3.5-flash-lite`,
 * `offline`, `offline-after-failure (TimeoutError)`. That string is worth
 * keeping: it is stored on every record and it is how you debug a bad
 * answer later. But the student is talking to Foray, not to a vendor's
 * model, so the vendor never appears on screen.
 *
 * Degraded runs still read as degraded — "foray · offline" — because a
 * silent fallback mid-demo is worse than an honest one.
 */
function sourceLabel(src: string): string {
  return src.startsWith('offline') || src === 'no-candidates'
    ? 'foray · offline'
    : 'foray';
}

// ═══════════════════════════════════════════════════════════════
//  BACKGROUND — a living agent network. Nodes drift, near ones
//  link, the whole field leans gently toward the cursor.
//
//  Hand-rolled canvas, ~70 nodes, one rAF loop — no library, no
//  WebGL, nothing that can fail on a demo machine. Honours
//  prefers-reduced-motion (draws one static frame) and pauses
//  when the tab is hidden.
// ═══════════════════════════════════════════════════════════════

function BgNet() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    const N = 70;
    const LINK = 170;
    let w = 0; let h = 0; let raf = 0;
    const mouse = { x: 0.5, y: 0.5 };
    const pts = Array.from({ length: N }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00045,
      vy: (Math.random() - 0.5) * 0.00045,
      r: 0.8 + Math.random() * 1.4,
    }));

    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      c.width = w * DPR; c.height = h * DPR;
      c.style.width = `${w}px`; c.style.height = `${h}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX / w; mouse.y = e.clientY / h;
    };

    const frame = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        if (!still) {
          p.x += p.vx + (mouse.x - 0.5) * 0.00018;
          p.y += p.vy + (mouse.y - 0.5) * 0.00018;
          if (p.x < 0 || p.x > 1) { p.vx *= -1; p.x = Math.min(1, Math.max(0, p.x)); }
          if (p.y < 0 || p.y > 1) { p.vy *= -1; p.y = Math.min(1, Math.max(0, p.y)); }
        }
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = (pts[i].x - pts[j].x) * w;
          const dy = (pts[i].y - pts[j].y) * h;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            ctx.strokeStyle = `rgba(255,255,255,${(0.11 * (1 - d2 / (LINK * LINK))).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(pts[i].x * w, pts[i].y * h);
            ctx.lineTo(pts[j].x * w, pts[j].y * h);
            ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, 7);
        ctx.fill();
      }
      if (!still) raf = requestAnimationFrame(frame);
    };

    resize(); frame();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove);
    const vis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) frame();
    };
    document.addEventListener('visibilitychange', vis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('visibilitychange', vis);
    };
  }, []);
  return <canvas ref={ref} className="bgnet" aria-hidden />;
}

/** Dot-matrix live clock — the Nothing-OS readout in the navbar. */
function Ticker() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="ticker">
      {now.toLocaleTimeString('en-GB')} · 13.08°N 80.27°E
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
//  LOGIN — the role dropdown is gone. Accounts are real rows.
// ═══════════════════════════════════════════════════════════════

const DEMO_ACCOUNTS = [
  { email: 'faculty@foray.edu', who: 'Prof. Meenakshi Raman · all six classes' },
  { email: 'divya@foray.edu', who: 'Divya · all six, home: Networks' },
  { email: 'pranav@foray.edu', who: 'Pranav · all six, home: Distributed Systems' },
  { email: 'sahana@foray.edu', who: 'Sahana · all six, home: Cyber Security' },
];

function Login({ onLogin }: { onLogin: (ctx: Ctx) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true); setErr('');
    try {
      const r = await fetch('/ui/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!r.ok) { setErr('Wrong email or password.'); return; }
      const d = await r.json();
      localStorage.setItem(TOKEN_KEY, d.token);
      // Pass the WHOLE context through. Hand-picking fields here is what
      // dropped `classes` and hid the subject switcher.
      onLogin({ user: d.user, class: d.class, classes: d.classes,
                faculty: d.faculty });
    } catch {
      setErr('API unreachable — is uvicorn running on :8000?');
    } finally { setBusy(false); }
  }

  return (
    <div className="login-hero">
      {/* Glassmorphic blobs. Sign-in is the ONLY screen with no data on
          it, so it is the only place ambient colour cannot compete with
          the semantic colour the dashboards depend on. */}
      <div className="blobs" aria-hidden>
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
      </div>

      <div className="hero-copy">
        <p className="hero-eyebrow">FORAY // MULTI-AGENT OS · V1.0</p>
        <h1 className="hero-title">
          A SCHOOL<br />OF <span className="hero-hollow">AGENTS</span>
        </h1>
        <p className="hero-sub">
          Students narrate. Faculty gain sight.<br />
          Confusion becomes evidence.
        </p>
        <div className="hero-stats">
          <span><b>06</b> subjects</span>
          <span><b>06</b> agents</span>
          <span><b>K=5</b> anonymity</span>
          <span><b>6W→24H</b> detection</span>
        </div>
      </div>

      <section className="panel login">
      <header>
        <h2>Sign in</h2>
        <p className="sub">
          One teacher, eight students, six subjects each. Switch subject in
          the header and the graph, taxonomy, chat and roadmap all follow.
        </p>
      </header>
      <form onSubmit={submit}>
        <input
          type="email" placeholder="email" value={email} autoComplete="username"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password" placeholder="password" value={password}
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="row">
          <button className="primary" disabled={busy || !email || !password}>
            {busy ? 'signing in…' : 'Sign in'}
          </button>
          {err && <span className="err">{err}</span>}
        </div>
      </form>
      <div className="demo-accounts">
        <p className="sub">Demo accounts (password <code>foray123</code>):</p>
        {DEMO_ACCOUNTS.map((a) => (
          <button key={a.email} className="acct"
            onClick={() => { setEmail(a.email); setPassword('foray123'); }}>
            <span className="mono">{a.email}</span>
            <span className="dim"> — {a.who}</span>
          </button>
        ))}
        <p className="sub dim">…and: aarav, karthik (Networks) · meera
          (Software Engg) · tamilselvan (IoT) · ananya (Compilers)
          @foray.edu</p>
      </div>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  STUDENT — the chat capture. Typed or spoken; analysed in place.
// ═══════════════════════════════════════════════════════════════

interface ChatAnalysis {
  is_question: boolean;
  topics: { id: string; name: string }[];
  misconceptions: { id: string; name: string; concept_id: string }[];
  evidence_span: string;
  confidence: number;
  diagnosis_source: string;
  correction: {
    grounded: boolean; status: string; text: string;
    material_ids: string[]; page?: number; citation?: string;
    retrieval_question?: string;
  } | null;
}
interface ChatMsg {
  sender: 'student' | 'agent';
  text: string;
  analysis?: ChatAnalysis | null;
  source?: string;
}

function AnalysisChips({ a }: { a: ChatAnalysis }) {
  const k = a.correction;
  return (
    <div className="chips">
      {a.misconceptions.map((m) => (
        <span key={m.id} className="chip named" title={m.name}>
          {m.id} named — {m.name}
        </span>
      ))}
      {a.evidence_span && (
        <span className="chip quote">“{a.evidence_span}” — your words</span>
      )}
      {k && k.grounded && (
        <span className="chip cited">
          correction cited: {k.citation ?? `page ${k.page}`}
        </span>
      )}
      {k && !k.grounded && (
        <span className="chip escalated">
          ESCALATED to faculty — nothing asserted without a citation
        </span>
      )}
      {a.is_question && (
        <span className="chip question">
          question recorded{a.topics.length
            ? `: ${a.topics.map((t) => t.name).join(', ')}` : ''}
        </span>
      )}
    </div>
  );
}

function ChatPanel({ classId }: { classId?: string | null }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [speak, setSpeak] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const SR = (window as any).SpeechRecognition
    || (window as any).webkitSpeechRecognition;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  // A different subject is a different conversation. Carrying the session
  // over would file Compiler Design turns under the Networks transcript.
  useEffect(() => { setMsgs([]); setSessionId(null); }, [classId]);

  function toggleMic() {
    if (listening) { recRef.current?.stop(); return; }
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      let t = '';
      for (const res of e.results) t += res[0].transcript;
      setText(t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  async function send() {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true); setText('');
    setMsgs((m) => [...m, { sender: 'student', text: body }]);
    try {
      const r = await fetch('/ui/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ text: body, session_id: sessionId,
                               class_id: classId ?? null }),
      });
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      setSessionId(d.session_id);
      setMsgs((m) => {
        const copy = [...m];
        // attach the analysis to the student turn it describes
        for (let i = copy.length - 1; i >= 0; i--) {
          if (copy[i].sender === 'student') { copy[i] = { ...copy[i], analysis: d.analysis }; break; }
        }
        return [...copy, { sender: 'agent', text: d.reply, source: d.reply_source }];
      });
      if (speak && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(d.reply);
        u.lang = 'en-IN';
        window.speechSynthesis.speak(u);
      }
    } catch {
      setMsgs((m) => [...m, {
        sender: 'agent',
        text: 'The API did not answer — is uvicorn running on :8000?',
      }]);
    } finally { setBusy(false); }
  }

  return (
    <section className="panel">
      <header>
        <h2>Talk it through</h2>
        <p className="sub">
          Say what you think you learned — type it or speak it. Any language.
          Never graded; there is no score field in the record. Both sides of
          this conversation are logged, append-only.
        </p>
        <Req id="R-11" />
      </header>

      <div className="chat">
        {msgs.length === 0 && (
          <p className="empty">
            Start anywhere. “today we did the handshake…” works. So does
            “why does the port stay 80 for every client?”
          </p>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.sender}`}>
            <div className="bubble">
              {m.text}
              {m.source && (
                <span className="src dim"> · {sourceLabel(m.source)}</span>
              )}
            </div>
            {m.analysis && <AnalysisChips a={m.analysis} />}
          </div>
        ))}
        {busy && <div className="msg agent"><div className="bubble dim">reading…</div></div>}
        <div ref={endRef} />
      </div>

      <div className="row">
        {SR ? (
          <button
            className={`mic ${listening ? 'live' : ''}`}
            onClick={toggleMic}
            title={listening ? 'stop' : 'speak instead of typing'}
          >
            {listening ? '◼ stop' : '● speak'}
          </button>
        ) : (
          <span className="dim" style={{ fontSize: 12, whiteSpace: 'nowrap', padding: '0 4px' }}
            title="Voice input requires Chrome or Edge">
            🎤 Chrome/Edge only
          </span>
        )}
        <input
          className="chat-input"
          value={text}
          placeholder={listening ? 'listening…' : 'in your own words…'}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button className="primary" onClick={send} disabled={busy || text.trim().length < 2}>
          Send
        </button>
        <label className="speak-toggle">
          <input type="checkbox" checked={speak} onChange={(e) => setSpeak(e.target.checked)} />
          read replies aloud
        </label>
      </div>
    </section>
  );
}

// ── the student's own log — R-11 works for the student too ──

interface Session {
  id: string; started_at: string; ended_at: string | null;
  misconception_ids: string[]; question_concept_ids: string[];
  messages: { sender: string; text: string; ts: string }[];
}

function MyLog() {
  const [tick, setTick] = useState(0);
  const data = useJson<{ sessions: Session[] }>('/ui/chat/history', tick);
  const [open, setOpen] = useState<string | null>(null);
  const sessions = data?.sessions ?? [];

  return (
    <section className="panel">
      <header>
        <h2>My interaction log</h2>
        <p className="sub">
          Every conversation, kept whole for review — yours to read any time.
          Your teacher sees counts, never these words.
          {' '}<button className="linkish" onClick={() => setTick(t => t + 1)}>refresh</button>
        </p>
        <Req id="R-11" />
      </header>
      {sessions.length === 0 ? (
        <p className="empty">
          {data === null
            ? 'Loading…'
            : 'No sessions yet — your conversations will appear here after your first message.'}
        </p>
      ) : (
        sessions.map((s) => (
          <div key={s.id} className="session">
            <button className="session-head" onClick={() => setOpen(open === s.id ? null : s.id)}>
              <span className="mono">{s.id}</span>
              <span className="dim"> · {new Date(s.started_at).toLocaleString()}</span>
              <span className="dim"> · {s.messages.length} messages</span>
              {s.misconception_ids.length > 0 && (
                <span className="chip named sm">{s.misconception_ids.join(', ')}</span>
              )}
            </button>
            {open === s.id && (
              <div className="transcript">
                {s.messages.map((m, i) => (
                  <p key={i} className={`tline ${m.sender}`}>
                    <span className="lbl">{m.sender}</span> {m.text}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
//  STUDENT — knowledge constellation. Hand-positioned SVG.
// ═══════════════════════════════════════════════════════════════

interface MasteryRow { concept_id: string; level: number; }

function masteryFill(level: number | undefined): string {
  if (level === undefined) return '#22304a';   // no data — default dark
  const l = Math.max(0, Math.min(1, level));
  // Interpolate: dark navy (no mastery) → accent blue (full mastery)
  const lightness = Math.round(18 + l * 30);
  const saturation = Math.round(20 + l * 50);
  return `hsl(220, ${saturation}%, ${lightness}%)`;
}

function StudentView({ course, unitName }: {
  course: string; unitName: string; studentId?: string | null;
}) {
  const concepts = useJson<Concept[]>(`/ui/concepts?course=${course}`);
  const mastery = useJson<MasteryRow[]>('/ui/mastery');
  if (!concepts) return <Loading what="concepts" />;
  const by = Object.fromEntries(concepts.map((c) => [c.id, c]));
  const masteryMap = Object.fromEntries(
    (mastery ?? []).map((m) => [m.concept_id, m.level])
  );

  return (
    <section className="panel">
      <header>
        <h2>Knowledge constellation</h2>
        <p className="sub">
          Your subject's concepts. Nodes brighten with demonstrated mastery.
          Edges are prerequisites.
        </p>
        <Req id="R-09" />
      </header>
      <svg viewBox="0 0 920 540" className="constellation">
        {concepts.flatMap((c) =>
          c.prereqs.filter((p) => by[p]).map((p) => (
            <line
              key={`${p}-${c.id}`}
              x1={by[p].x} y1={by[p].y} x2={c.x} y2={c.y}
              className="edge"
            />
          )),
        )}
        {concepts.map((c) => (
          <g key={c.id} className={`node unit-${c.unit}`}>
            <circle cx={c.x} cy={c.y} r={20}
              style={{ fill: masteryFill(masteryMap[c.id]) }} />
            <text x={c.x} y={c.y + 4} className="nid">{c.id.replace(/^[A-Z]+_/, '')}</text>
            <text x={c.x} y={c.y + 38} className="nname">{c.name}</text>
          </g>
        ))}
      </svg>
      <p className="sub">
        Blue = this unit ({unitName}). Grey = prerequisite unit — where root
        causes usually live. Node brightness = demonstrated mastery level.
      </p>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
//  BEAT 5 — COMPASS, per logged-in student, built on demand.
// ═══════════════════════════════════════════════════════════════

interface CompassItem {
  gap_concept_id: string; gap_concept_name: string; unit: string;
  level: number; evidence_reflection_ids: string[]; evidence_text: string;
  why: string; action: string; priority: number; source: string;
}

function Compass({ classId }: { classId?: string | null }) {
  const [data, setData] = useState<{ items: CompassItem[] } | null>(null);
  const [busy, setBusy] = useState(false);

  // Switching subject must clear the roadmap. Leaving it would show a
  // student their Computer Networks gaps under the Compiler Design header.
  useEffect(() => { setData(null); }, [classId]);

  async function build() {
    setBusy(true);
    try {
      // Auth token carries the student_id; class_id says WHICH SUBJECT.
      // A student takes six — one roadmap each.
      const q = classId ? `?class_id=${encodeURIComponent(classId)}` : '';
      const r = await fetch(`/ui/compass${q}`, { headers: authHeaders() });
      if (!r.ok) {
        setData({ items: [] });
        return;
      }
      setData(await r.json());
    } finally { setBusy(false); }
  }

  return (
    <section className="panel">
      <header>
        <h2>Compass</h2>
        <p className="sub">
          Built from what you have demonstrated, not what you said you were
          interested in. Every item cites the reflection that proved the gap.
        </p>
        <Req id="R-09" />
      </header>

      {!data ? (
        <>
          <button className="primary" onClick={build} disabled={busy}>
            {busy ? 'assembling from your evidence…' : 'Build my roadmap'}
          </button>
          {busy && (
            <p className="sub" style={{ marginTop: 8 }}>
              Building from your reflections… this takes ~30 seconds on a free-tier key.
            </p>
          )}
        </>
      ) : !data.items.length ? (
        <p className="empty">
          No gaps with evidence behind them. An item without a reflection to
          cite is not shown — that is the rule, not a bug.
        </p>
      ) : (
        data.items.map((it) => (
          <div key={it.gap_concept_id} className="compass-item">
            <div className="ci-head">
              <span className="pri">{it.priority}</span>
              <strong>{it.gap_concept_id} {it.gap_concept_name}</strong>
              <span className="unit-badge">unit {it.unit}</span>
              <span className="mastery">mastery {it.level}</span>
            </div>
            <p className="why">{it.why}</p>
            <p className="action"><span className="lbl">next</span> {it.action}</p>
            <p className="evidence-cite">
              <span className="lbl">because you wrote</span>{' '}
              <span className="mono dim">
                {it.evidence_reflection_ids.join(', ')}
              </span>
              <span className="quote">“{it.evidence_text}”</span>
            </p>
          </div>
        ))
      )}
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
//  FACULTY — roster with case scenarios. Counts, never words.
// ═══════════════════════════════════════════════════════════════

interface RosterStudent {
  user_id: string; name: string; email: string; student_id: string;
  scenario: string | null; scenario_note: string | null;
  counts: {
    reflections: number; chat_sessions: number; chat_messages: number;
    questions_asked: number; misconceptions_named: number;
  };
  last_active: string | null;
  recent_sessions: { id: string; started_at: string }[];
  class: { id: string; code: string; name: string; course: string };
}

function RosterPanel() {
  const data = useJson<{ classes: ClassRoom[]; students: RosterStudent[] }>('/ui/roster');

  if (!data) return <Loading what="roster" />;
  return (
    <section className="panel">
      <header>
        <h2>Students — {data.classes?.length ?? 0} classes, one roster</h2>
        <p className="sub">
          Eight students across six subjects, eight different
          weeks-in-progress. What you see is named misconceptions, counts
          and scenarios — the words themselves stay with the student.
        </p>
        <Req id="R-03" />
      </header>
      <div className="roster">
        {data.students.map((s) => (
          <div key={s.user_id} className="card">
            <div className="card-head">
              <strong>{s.name}</strong>
              <span className="mono dim">{s.student_id}</span>
            </div>
            {s.class && (
              <span className="chip subject" title={s.class.name}>
                {s.class.code} · {s.class.name.replace(/ — Semester V.*/, '')}
              </span>
            )}
            {s.scenario && <span className="chip scenario">{s.scenario}</span>}
            {s.scenario_note && <p className="note">{s.scenario_note}</p>}
            <div className="counts">
              <span title="reflections this term">{s.counts.reflections} reflections</span>
              <span title="questions recorded">{s.counts.questions_asked} questions</span>
              <span title="distinct misconceptions named">{s.counts.misconceptions_named} named</span>
              <span title="chat sessions">{s.counts.chat_sessions} sessions</span>
            </div>
            <p className="note dim" style={{ marginTop: 6, fontSize: 11 }}>
              🔒 Transcripts private to student (R-11)
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── most-questioned topics — counted, never generated (R-12) ──

interface TopicRow {
  concept_id: string; concept_name: string;
  questions: number; students: number; last_asked: string | null;
}

interface TopicGroup {
  class: { id: string; code: string; name: string };
  topics: TopicRow[];
}

function TopicsPanel() {
  const data = useJson<{ k: number; groups: TopicGroup[] }>('/ui/topics');
  if (!data) return null;
  const groups = (data.groups ?? []).filter((g) => g.topics.length > 0);
  return (
    <section className="panel">
      <header>
        <h2>Most questioned topics — per class</h2>
        <p className="sub">
          Every question a student asks in chat is recorded against a
          concept and counted — this is what each class keeps asking about,
          not what a model thinks it struggles with. Topics below k=
          {data.k} students are not surfaced.
        </p>
        <Req id="R-12" />
      </header>
      {!groups.length ? (
        <p className="empty">No questioned topics above k yet.</p>
      ) : (
        groups.map((g) => {
          const max = Math.max(1, ...g.topics.map((t) => t.questions));
          return (
            <div key={g.class.id} className="topic-group">
              <h3 className="tg-head">
                <span className="mono dim">{g.class.code}</span> {g.class.name}
              </h3>
              <div className="topics">
                {g.topics.map((t) => (
                  <div key={t.concept_id} className="topic-row">
                    <span className="tname">
                      <span className="cid">{t.concept_id}</span> {t.concept_name}
                    </span>
                    <span className="tbar-wrap">
                      <span className="tbar" style={{ width: `${(t.questions / max) * 100}%` }} />
                    </span>
                    <span className="tcount mono">
                      {t.questions} q · {t.students} students
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
      <p className="sub dim">
        In Networks, note how C03 — the root cause behind the week-6 spike —
        has been questioned since week 2. The questions saw it before the
        heatmap did.
      </p>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
//  FACULTY — misconception map + drill-down + beat 4 (unchanged)
// ═══════════════════════════════════════════════════════════════

function heat(n: number): string {
  if (n === 0) return 'var(--cell-0)';
  if (n < 6) return 'var(--cell-1)';
  if (n < 12) return 'var(--cell-2)';
  if (n < 20) return 'var(--cell-3)';
  return 'var(--cell-4)';
}

const COURSE_LABELS: Record<string, string> = {
  CN: 'CS3591 Computer Networks',
  CD: 'CS3351 Compiler Design',
  DS: 'CS3502 Distributed Systems',
  FCS: 'CY3351 Foundations of Cyber Security',
  IO: 'EC3501 Internet of Things',
  SE: 'CS3401 Software Engineering',
};

function FacultyView() {
  const [course, setCourse] = useState('CN');
  const concepts = useJson<Concept[]>(`/ui/concepts?course=${course}`, course);
  const map = useJson<Heatmap>(`/ui/heatmap?course=${course}`, course);
  const [sel, setSel] = useState<HeatCell | null>(null);
  const [logTick] = useState(0);

  if (!concepts) return <Loading what="concepts" />;
  const cells = map?.cells ?? [];
  const at = (c: string, w: number) =>
    cells.find((x) => x.concept_id === c && x.week === w)?.n ?? 0;

  return (
    <>
      <RosterPanel />
      <TopicsPanel />
      <section className="panel">
        <header>
          <h2>Misconception map</h2>
          <p className="sub">
            The seeded longitudinal cohort. Nothing below k={map?.k ?? 5} students
            is ever surfaced.
          </p>
          <Req id="R-04" />
        </header>

        {/* Course selector — lets faculty browse all six classes */}
        <div className="row" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
          {Object.entries(COURSE_LABELS).map(([code, label]) => (
            <button
              key={code}
              onClick={() => { setCourse(code); setSel(null); }}
              style={{
                background: course === code ? 'var(--accent)' : 'var(--panel)',
                color: course === code ? '#fff' : 'var(--fg)',
                border: `1px solid ${course === code ? 'var(--accent)' : 'var(--line)'}`,
                borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
                fontSize: 12, fontFamily: 'ui-monospace, monospace',
              }}
              title={label}
            >
              {code}
            </button>
          ))}
          <span className="dim" style={{ fontSize: 12, alignSelf: 'center', marginLeft: 4 }}>
            {COURSE_LABELS[course]}
          </span>
        </div>

        <div className="heat" style={{ gridTemplateColumns: `170px repeat(${WEEKS.length}, 1fr)` }}>
          <div className="hcell head" />
          {WEEKS.map((w) => (
            <div key={w} className="hcell head">W{w}</div>
          ))}
          {concepts.map((c) => (
            <Fragment key={c.id}>
              <div className="hcell label" title={c.name}>
                <span className="cid">{c.id}</span> {c.name}
              </div>
              {WEEKS.map((w) => {
                const n = at(c.id, w);
                return (
                  <button
                    key={`${c.id}-${w}`}
                    className="hcell cell"
                    style={{ background: heat(n) }}
                    onClick={() => n > 0 && setSel({ concept_id: c.id, week: w, n })}
                    title={n ? `${n} students` : 'nothing surfaced'}
                  >
                    {n || ''}
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>

        {cells.length === 0 && (
          <p className="empty">
            No clusters yet for {COURSE_LABELS[course]} — run the seed generator.
            The grid is live; it is waiting on data, not fake.
          </p>
        )}

        {sel && <ClusterDetail cell={sel} />}

        <AccessLogPanel tick={logTick} />
      </section>
    </>
  );
}

interface ClusterRow {
  id: string; misconception_id: string; misconception_name: string;
  student_count: number; cohort_size: number;
  root_cause?: Concept; root_cause_mastery?: number | null;
  root_cause_reasoning?: string; crosses_unit?: boolean;
}

function ClusterDetail({ cell }: { cell: HeatCell }) {
  const rows = useJson<ClusterRow[]>(
    `/ui/cluster?week=${cell.week}&concept_id=${cell.concept_id}`,
  );
  if (!rows?.length) {
    return (
      <div className="detail">
        <p className="sub">
          Nothing surfaced for {cell.concept_id}, week {cell.week} — below
          k, or not yet clustered.
        </p>
      </div>
    );
  }
  return (
    <div className="detail">
      {rows.map((r) => (
        <div key={r.id} className="cluster">
          <div className="cluster-head">
            <span className="mid">{r.misconception_id}</span>
            <strong>{r.misconception_name}</strong>
          </div>
          <p className="count">
            <strong>{r.student_count}</strong> of {r.cohort_size} students ·
            week {cell.week}
          </p>
          {r.root_cause && (
            <div className="trace">
              <span className="arrow">root cause →</span>{' '}
              <strong>{r.root_cause.id} {r.root_cause.name}</strong>
              <span className="unit-badge">
                unit {r.root_cause.unit}
                {r.crosses_unit ? ' · earlier unit' : ''}
              </span>
              {r.root_cause_mastery != null && (
                <span className="mastery">
                  cohort mastery {r.root_cause_mastery}
                </span>
              )}
              {r.root_cause_reasoning && (
                <p className="reasoning">{r.root_cause_reasoning}</p>
              )}
            </div>
          )}
          {r.root_cause && <Intervention clusterId={r.id} />}
          <Req id="R-07" />
        </div>
      ))}
    </div>
  );
}

interface InterventionResp {
  id: string; kind: string; content: string;
  delivered_week: number; source?: string;
}
interface Efficacy {
  before_count: number; after_count: number;
  checked_week: number; cleared: boolean; cohort_size: number;
}

function Intervention({ clusterId }: { clusterId: string }) {
  const [iv, setIv] = useState<InterventionResp | null>(null);
  const [eff, setEff] = useState<Efficacy | null>(null);
  const [busy, setBusy] = useState<'' | 'deliver' | 'verify'>('');

  async function deliver() {
    setBusy('deliver');
    try {
      setIv(await fetch(`/ui/deliver?cluster_id=${clusterId}`,
        { method: 'POST', headers: authHeaders() }).then((r) => r.json()));
      setEff(null);
    } finally { setBusy(''); }
  }

  async function verify() {
    if (!iv) return;
    setBusy('verify');
    try {
      setEff(await fetch(`/ui/verify?intervention_id=${iv.id}`,
        { method: 'POST', headers: authHeaders() }).then((r) => r.json()));
    } finally { setBusy(''); }
  }

  return (
    <div className="interv">
      {!iv ? (
        <button className="primary" onClick={deliver} disabled={busy !== ''}>
          {busy === 'deliver' ? 'designing…' : 'Design 10-minute intervention'}
        </button>
      ) : (
        <>
          <div className="iv-head">
            <span className="mid">{iv.id}</span>
            <strong>{iv.kind.replace('_', ' ')}</strong>
            <span className="mastery">10 minutes · week {iv.delivered_week}</span>
          </div>
          <pre className="iv-body">{iv.content}</pre>

          {!eff ? (
            <button className="primary" onClick={verify} disabled={busy !== ''}>
              {busy === 'verify'
                ? 'counting…'
                : `Delivered — verify at week ${iv.delivered_week + 1}`}
            </button>
          ) : (
            <div className={`efficacy ${eff.cleared ? 'cleared' : 'not-cleared'}`}>
              <div className="big">
                <span className="before">{eff.before_count}</span>
                <span className="to">→</span>
                <span className="after">{eff.after_count}</span>
              </div>
              <p className="sub">
                students holding this misconception, week{' '}
                {eff.checked_week - 1} → week {eff.checked_week} · cohort{' '}
                {eff.cohort_size}
              </p>
              <p className="verdict">
                {eff.cleared ? 'CLEARED' : 'NOT CLEARED'}
                <span className="dim">
                  {' '}· counted, not generated · R-08
                </span>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  BEAT 6 — the access log panel.
// ═══════════════════════════════════════════════════════════════

function AccessLogPanel({ tick = 0 }: { tick?: number }) {
  const [auto, setAuto] = useState(0);
  const rows = useJson<AccessLogRow[]>('/ui/access-log?limit=8', `${tick}-${auto}`);
  useEffect(() => {
    const t = setInterval(() => setAuto((x) => x + 1), 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="panel inner">
      <header>
        <h3>Access log</h3>
        <p className="sub">
          Every denial the Warden issues, written at the MCP layer — and
          every faculty attempt on a transcript. Not a policy document.
        </p>
        <Req id="R-03" />
      </header>
      {!rows?.length ? (
        <p className="empty">
          No access attempts yet. Try opening a student's transcript above.
        </p>
      ) : (
        <table className="log">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={r.decision === 'DENIED' ? 'denied' : ''}>
                <td className="badge">{r.decision}</td>
                <td className="mono">{r.actor_role}</td>
                <td className="mono">{r.attempted}</td>
                <td className="rule">{r.rule}</td>
                <td className="mono dim">{r.req_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Tiny OS-style status line in the footer. /health is unauthenticated, so
// this renders pre-login too. The LED goes dark when the spine is down —
// which is also the fastest possible "is uvicorn running" check on stage.
function SysLine() {
  const h = useJson<{ ok: boolean; llm: string; k: number }>('/health');
  return (
    <div className="sysline">
      <span className={`led ${h?.ok ? '' : 'off'}`} />
      {h?.ok
        ? `SYS OK · AGENTS ${h.llm === 'offline' ? 'OFFLINE' : 'LIVE'} · K=${h.k} · V1.0`
        : 'SYS OFFLINE · API :8000 UNREACHABLE'}
    </div>
  );
}

function Loading({ what }: { what: string }) {
  return (
    <section className="panel">
      <p className="empty">
        Loading {what}… if this persists, the Python API is not running:
        <code> uvicorn api.main:app --port 8000</code>
      </p>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════

export default function App() {
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) { setChecked(true); return; }
    fetch('/ui/me', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setCtx({ user: d.user, class: d.class, classes: d.classes,
                        faculty: d.faculty });
        else localStorage.removeItem(TOKEN_KEY);
      })
      .catch(() => undefined)
      .finally(() => setChecked(true));
  }, []);

  async function logout() {
    try {
      await fetch('/ui/logout', { method: 'POST', headers: authHeaders() });
    } catch { /* token removal is what matters */ }
    localStorage.removeItem(TOKEN_KEY);
    setCtx(null);
  }

  // scroll choreography — one init, self-rebuilding, cleaned on unmount
  useEffect(() => initFx(), []);

  return (
    <div className="app">
      <div className="scroll-progress" aria-hidden />
      <BgNet />
      <nav>
        <span className="brand">Foray</span>
        <span className="tag">
          <Ticker />
          {ctx?.class && !(ctx.user.role === 'student' && (ctx.classes?.length ?? 0) > 1)
            && <> · {ctx.class.code} {ctx.class.name}</>}
        </span>

        {/* Subject switcher. A student takes six; picking one re-scopes the
            whole surface — chat, taxonomy, grounding, constellation and
            Compass all follow. */}
        {ctx && ctx.user.role === 'student' && (ctx.classes?.length ?? 0) > 1 && (
          <select
            className="subject-switch"
            value={ctx.class?.id ?? ''}
            onChange={async (e) => {
              const r = await fetch(
                `/ui/me?class_id=${encodeURIComponent(e.target.value)}`,
                { headers: authHeaders() },
              );
              if (r.ok) setCtx(await r.json());
            }}
          >
            {(ctx.classes ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.code} · {c.name}</option>
            ))}
          </select>
        )}
        {ctx && (
          <>
            <span className="who">
              {ctx.user.name}
              <span className="dim"> · {ctx.user.role}</span>
              {ctx.user.role === 'student' && ctx.faculty && (
                <span className="dim"> · taught by {ctx.faculty.name}</span>
              )}
            </span>
            <button className="linkish" onClick={logout}>sign out</button>
          </>
        )}
      </nav>

      {!checked ? (
        <div className="boot">
          <div>
            <span className="blob boot-blob" aria-hidden />
            <div className="boot-mark">FORAY</div>
            <div className="boot-sub">A SCHOOL OF AGENTS // BOOT</div>
          </div>
        </div>
      ) : !ctx ? (
        <Login onLogin={setCtx} />
      ) : ctx.user.role === 'faculty' ? (
        <FacultyView />
      ) : (
        <>
          <ChatPanel classId={ctx.class?.id} />
          <MyLog />
          <StudentView
            course={ctx.class?.course ?? 'CN'}
            unitName={ctx.class?.unit ?? 'Transport Layer'}
            studentId={ctx.user.student_id}
          />
          {ctx.user.student_id && <Compass classId={ctx.class?.id} />}
        </>
      )}
      <footer>
        {ctx?.class
          ? `${ctx.class.code} ${ctx.class.name} · ${ctx.class.unit} — from ${ctx.class.source}. Corrections cite the printed page, slide or note.`
          : 'Six classes, one teacher, eight students — content from the sem V and sem VI class archives. Corrections cite the printed page, slide or note.'}
        <SysLine />
      </footer>
    </div>
  );
}
