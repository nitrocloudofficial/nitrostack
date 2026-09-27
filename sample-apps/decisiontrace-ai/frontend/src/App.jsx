import { useState, useEffect, useRef } from "react";
import { McpClient } from "./mcpClient";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parsePersonName(raw) {
  const m = raw.match(/^(.+?)\s*\((.+?)\)$/);
  return m ? { name: m[1].trim(), role: m[2].trim() } : { name: raw.trim(), role: "Stakeholder" };
}
function getConfidence(ev) {
  const n = Array.isArray(ev) ? ev.length : 0;
  return n >= 5 ? 95 : n >= 3 ? 88 : n >= 1 ? 75 : 50;
}
function inferEvidenceType(name) {
  const n = name.toLowerCase();
  if (n.includes("report") || n.includes("assessment")) return "Report";
  if (n.includes("plan") || n.includes("roadmap")) return "Plan";
  if (n.includes("analysis") || n.includes("review")) return "Analysis";
  if (n.includes("email") || n.includes("memo")) return "Communication";
  if (n.includes("spreadsheet") || n.includes("inventory")) return "Spreadsheet";
  return "Document";
}
function generateExecutiveSummary(d) {
  const names = (d.people || []).map(p => parsePersonName(p).name);
  const nameStr = names.length > 1 ? names.slice(0, -1).join(", ") + " and " + names[names.length - 1] : names[0] || "the team";
  const lastEvent = d.timeline?.length > 0 ? d.timeline[d.timeline.length - 1].event : null;
  const reasonShort = d.reason ? d.reason.split(".")[0] : "";
  return `${d.title} was finalized on ${d.date} by the ${d.department} department. ${reasonShort}. ${nameStr} led the evaluation, culminating in the formal decision: "${d.decision}"${lastEvent ? ` — confirmed by "${lastEvent}"` : ""}.`;
}
function getTimelineIcon(ev) {
  const e = (ev || "").toLowerCase();
  if (e.includes("start") || e.includes("launch")) return "🚀";
  if (e.includes("review") || e.includes("assess")) return "🔍";
  if (e.includes("fail") || e.includes("reject") || e.includes("cancel")) return "❌";
  if (e.includes("approv") || e.includes("sign") || e.includes("complet")) return "✅";
  if (e.includes("delay") || e.includes("extend")) return "⏳";
  if (e.includes("migrat") || e.includes("deploy")) return "⚡";
  return "📌";
}

// ─── Replay constants ─────────────────────────────────────────────────────────
const SEARCH_MSGS = [
  "Searching Enterprise Records...",
  "Searching Meeting Notes...",
  "Searching Finance Reviews...",
  "Searching Security Assessments...",
  "Searching Supporting Documents...",
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function DecisionSummaryCard({ d }) {
  return (
    <div className="edr-summary-card">
      <div className="edr-summary-header">
        <div className="edr-dept-badge">{d.department}</div>
        <div className="edr-date-badge">📅 {d.date}</div>
      </div>
      <h2 className="edr-title">{d.title}</h2>
      <div className="edr-field">
        <span className="edr-field-label">Final Decision</span>
        <p className="edr-field-value edr-decision-text">{d.decision}</p>
      </div>
      <div className="edr-field">
        <span className="edr-field-label">Reason</span>
        <p className="edr-field-value">{d.reason}</p>
      </div>
    </div>
  );
}

function Timeline({ timeline, visibleCount }) {
  if (!timeline?.length) return null;
  const items = visibleCount !== undefined ? timeline.slice(0, visibleCount) : timeline;
  return (
    <div className="edr-section">
      <h3 className="edr-section-title"><span className="edr-section-icon">⏱</span> Decision Timeline</h3>
      <div className="edr-timeline">
        {items.map((item, i) => (
          <div className={`edr-timeline-item ${visibleCount !== undefined && i === items.length - 1 ? "edr-timeline-active" : ""}`}
            key={i} style={{ animationDelay: visibleCount !== undefined ? "0s" : `${i * 0.1}s` }}>
            <div className="edr-timeline-connector">
              <div className="edr-timeline-dot">{getTimelineIcon(item.event)}</div>
              {i < items.length - 1 && <div className="edr-timeline-line" />}
            </div>
            <div className="edr-timeline-card">
              <div className="edr-timeline-date">{item.date}</div>
              <div className="edr-timeline-event">{item.event}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stakeholders({ people, department, visibleCount }) {
  if (!people?.length) return null;
  const items = visibleCount !== undefined ? people.slice(0, visibleCount) : people;
  return (
    <div className="edr-section">
      <h3 className="edr-section-title"><span className="edr-section-icon">👥</span> Stakeholders</h3>
      <div className="edr-cards-grid">
        {items.map((raw, i) => {
          const { name, role } = parsePersonName(raw);
          const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
          return (
            <div className="edr-person-card edr-reveal" key={i}>
              <div className="edr-avatar">{initials}</div>
              <div className="edr-person-info">
                <div className="edr-person-name">{name}</div>
                <div className="edr-person-role">{role}</div>
                <div className="edr-person-dept">{department}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Evidence({ evidence, date, visibleCount }) {
  if (!evidence?.length) return null;
  const items = visibleCount !== undefined ? evidence.slice(0, visibleCount) : evidence;
  return (
    <div className="edr-section">
      <h3 className="edr-section-title"><span className="edr-section-icon">📂</span> Supporting Evidence</h3>
      <div className="edr-cards-grid">
        {items.map((item, i) => (
          <div className="edr-evidence-card edr-reveal" key={i}>
            <div className="edr-evidence-icon">📄</div>
            <div className="edr-evidence-info">
              <div className="edr-evidence-name">{item}</div>
              <div className="edr-evidence-meta">
                <span className="edr-evidence-type">{inferEvidenceType(item)}</span>
                <span className="edr-evidence-date">{date}</span>
                <span className="edr-evidence-status">✓ Verified</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfidenceScore({ evidence, animatedValue }) {
  const target = getConfidence(evidence);
  const score = animatedValue !== undefined ? animatedValue : target;
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 90 ? "#10b981" : score >= 80 ? "#2563eb" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="edr-section edr-confidence-section">
      <h3 className="edr-section-title"><span className="edr-section-icon">📊</span> Confidence Score</h3>
      <div className="edr-confidence-card">
        <div className="edr-circle-wrap">
          <svg width="130" height="130" viewBox="0 0 130 130">
            <circle cx="65" cy="65" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
            <circle cx="65" cy="65" r={radius} fill="none" stroke={color} strokeWidth="10"
              strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
              transform="rotate(-90 65 65)" style={{ transition: "stroke-dashoffset 0.05s linear, stroke 0.3s" }} />
          </svg>
          <div className="edr-circle-label">
            <span className="edr-circle-pct" style={{ color }}>{Math.round(score)}%</span>
            <span className="edr-circle-sub">Confidence</span>
          </div>
        </div>
        <div className="edr-confidence-meta">
          <div className="edr-confidence-row"><span>Evidence Items</span><strong>{Array.isArray(evidence) ? evidence.length : 0}</strong></div>
          <div className="edr-confidence-row"><span>Score Level</span><strong style={{ color }}>{score >= 90 ? "High" : score >= 80 ? "Good" : score >= 60 ? "Moderate" : "Low"}</strong></div>
          <div className="edr-confidence-row"><span>Audit Ready</span><strong style={{ color: "#10b981" }}>Yes</strong></div>
        </div>
      </div>
    </div>
  );
}

function ExecutiveSummary({ decision, visible }) {
  return (
    <div className={`edr-section edr-exec-fade ${visible ? "edr-exec-visible" : ""}`}>
      <h3 className="edr-section-title"><span className="edr-section-icon">📝</span> Executive Summary</h3>
      <div className="edr-exec-card">
        <div className="edr-exec-quote">"</div>
        <p className="edr-exec-text">{generateExecutiveSummary(decision)}</p>
        <div className="edr-exec-footer">
          <span>Auto-generated from decision record</span>
          <span className="edr-exec-id">ID: {decision.id}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Replay Scanning Overlay ──────────────────────────────────────────────────
function ReplayScanner({ searchPhase }) {
  return (
    <div className="replay-scanner">
      <div className="replay-scanner-icon">🔎</div>
      <div className="replay-scanner-messages">
        {SEARCH_MSGS.map((msg, i) => (
          <div key={i} className={`replay-scan-line ${i < searchPhase ? "done" : i === searchPhase ? "active" : "pending"}`}>
            <span className="replay-scan-dot" />
            <span>{msg}</span>
            {i < searchPhase && <span className="replay-scan-check">✓</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Replay Controls ──────────────────────────────────────────────────────────
function ReplayControls({ status, onPause, onResume, onRestart }) {
  return (
    <div className="replay-controls">
      {status === "playing" && (
        <button className="replay-btn replay-btn-pause" onClick={onPause}>⏸ Pause</button>
      )}
      {status === "paused" && (
        <button className="replay-btn replay-btn-resume" onClick={onResume}>▶ Resume</button>
      )}
      {status === "complete" && (
        <button className="replay-btn replay-btn-restart" onClick={onRestart}>↺ Replay Again</button>
      )}
      {(status === "playing" || status === "paused") && (
        <span className="replay-status-text">
          {status === "paused" ? "⏸ Paused" : "▶ Replaying Decision Journey..."}
        </span>
      )}
    </div>
  );
}

// ─── Enterprise Decision Report ───────────────────────────────────────────────
function EnterpriseDecisionReport({ decisions, onClear, replayState, replayData, onStartReplay, onPause, onResume, onRestart }) {
  return (
    <section className="edr-wrapper">
      <div className="edr-report-header">
        <div>
          <h2 className="edr-report-title">Enterprise Decision Report</h2>
          <p className="edr-report-sub">{decisions.length} record{decisions.length !== 1 ? "s" : ""} found</p>
        </div>
        <button className="clear-btn" onClick={onClear}>✕ Clear</button>
      </div>

      {decisions.map((d, idx) => {
        const isReplaying = replayState !== "idle" && idx === 0;
        const rd = isReplaying ? replayData : null;
        const targetConf = getConfidence(d.evidence);

        return (
          <div className="edr-record" key={d.id || idx}>
            {decisions.length > 1 && (
              <div className="edr-record-index">Record {idx + 1} of {decisions.length}</div>
            )}

            <DecisionSummaryCard d={d} />

            {/* Replay Button — shown only when idle */}
            {idx === 0 && replayState === "idle" && (
              <button className="replay-start-btn" onClick={() => onStartReplay(d)}>
                <span className="replay-start-icon">▶</span> Replay Decision Journey
              </button>
            )}

            {/* Replay Controls */}
            {idx === 0 && replayState !== "idle" && (
              <ReplayControls status={replayState} onPause={onPause} onResume={onResume} onRestart={() => onRestart(d)} />
            )}

            {/* Scanning Step */}
            {isReplaying && rd.step === 0 && (
              <ReplayScanner searchPhase={rd.searchPhase} />
            )}

            {/* Steps 1-5: progressive reveal */}
            {(!isReplaying || rd.step >= 1) && (
              <div className="edr-two-col">
                <Timeline timeline={d.timeline} visibleCount={isReplaying && rd.step === 1 ? rd.timelineCount : undefined} />
                {(!isReplaying || rd.step >= 4) && (
                  <ConfidenceScore evidence={d.evidence} animatedValue={isReplaying ? rd.confVal : undefined} />
                )}
              </div>
            )}

            {(!isReplaying || rd.step >= 2) && (
              <Stakeholders people={d.people} department={d.department}
                visibleCount={isReplaying && rd.step === 2 ? rd.stakeholderCount : undefined} />
            )}

            {(!isReplaying || rd.step >= 3) && (
              <Evidence evidence={d.evidence} date={d.date}
                visibleCount={isReplaying && rd.step === 3 ? rd.evidenceCount : undefined} />
            )}

            {(!isReplaying || rd.step >= 5) && (
              <ExecutiveSummary decision={d} visible={!isReplaying || rd.summaryVisible} />
            )}
          </div>
        );
      })}
    </section>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const [client, setClient] = useState(null);
  const [status, setStatus] = useState("connecting");
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Replay state
  const [replayState, setReplayState] = useState("idle"); // idle | playing | paused | complete
  const [replayData, setReplayData] = useState({ step: -1, searchPhase: 0, timelineCount: 0, stakeholderCount: 0, evidenceCount: 0, confVal: 0, summaryVisible: false });
  const pausedRef = useRef(false);
  const stopRef = useRef(false);
  const activeDecisionRef = useRef(null);

  // MCP connect
  useEffect(() => {
    const serverUrl = window.location.hostname === "localhost"
      ? "http://localhost:3000"
      : window.location.origin;
    const mcp = new McpClient(serverUrl);
    setStatus("connecting");
    mcp.onConnect = () => { setStatus("connected"); setError(null); };
    mcp.onDisconnect = () => setStatus("disconnected");
    mcp.connect().then(() => setClient(mcp)).catch(() => {
      setStatus("error");
      setError("Failed to connect to DecisionTrace MCP Server.");
    });
    return () => mcp.disconnect();
  }, []);

  // Pauseable delay
  const delay = (ms) => new Promise((resolve, reject) => {
    const interval = 60;
    let elapsed = 0;
    const tick = setInterval(() => {
      if (stopRef.current) { clearInterval(tick); reject(new Error("stopped")); return; }
      if (!pausedRef.current) elapsed += interval;
      if (elapsed >= ms) { clearInterval(tick); resolve(); }
    }, interval);
  });

  const startReplay = async (decision) => {
    stopRef.current = false;
    pausedRef.current = false;
    activeDecisionRef.current = decision;
    setReplayState("playing");

    const reset = { step: 0, searchPhase: 0, timelineCount: 0, stakeholderCount: 0, evidenceCount: 0, confVal: 0, summaryVisible: false };
    setReplayData(reset);

    try {
      // ── Step 0: Scanning messages ──
      for (let i = 0; i <= SEARCH_MSGS.length; i++) {
        await delay(600);
        setReplayData(p => ({ ...p, searchPhase: i }));
      }
      await delay(400);

      // ── Step 1: Timeline ──
      setReplayData(p => ({ ...p, step: 1, timelineCount: 0 }));
      for (let i = 1; i <= (decision.timeline?.length || 0); i++) {
        await delay(900);
        setReplayData(p => ({ ...p, timelineCount: i }));
      }
      await delay(400);

      // ── Step 2: Stakeholders ──
      setReplayData(p => ({ ...p, step: 2, stakeholderCount: 0 }));
      for (let i = 1; i <= (decision.people?.length || 0); i++) {
        await delay(500);
        setReplayData(p => ({ ...p, stakeholderCount: i }));
      }
      await delay(400);

      // ── Step 3: Evidence ──
      setReplayData(p => ({ ...p, step: 3, evidenceCount: 0 }));
      for (let i = 1; i <= (decision.evidence?.length || 0); i++) {
        await delay(500);
        setReplayData(p => ({ ...p, evidenceCount: i }));
      }
      await delay(400);

      // ── Step 4: Confidence animation ──
      setReplayData(p => ({ ...p, step: 4, confVal: 0 }));
      const target = getConfidence(decision.evidence);
      const steps = 40;
      for (let i = 1; i <= steps; i++) {
        await delay(30);
        setReplayData(p => ({ ...p, confVal: Math.round((target / steps) * i) }));
      }
      await delay(500);

      // ── Step 5: Executive Summary ──
      setReplayData(p => ({ ...p, step: 5, summaryVisible: false }));
      await delay(300);
      setReplayData(p => ({ ...p, summaryVisible: true }));
      await delay(300);

      setReplayState("complete");
    } catch (e) {
      // stopped — do nothing, state already reset
    }
  };

  const handlePause = () => { pausedRef.current = true; setReplayState("paused"); };
  const handleResume = () => { pausedRef.current = false; setReplayState("playing"); };
  const handleRestart = (d) => { stopRef.current = true; setTimeout(() => startReplay(d || activeDecisionRef.current), 100); };
  const handleStopReplay = () => { stopRef.current = true; pausedRef.current = false; setReplayState("idle"); };

  const executeSearch = async (q) => {
    const aq = q.trim();
    if (!aq) return;
    stopRef.current = true; // stop any running replay
    setReplayState("idle");
    setLoading(true); setError(null); setSearchedQuery(aq);
    try {
      if (!client) throw new Error("MCP Client is not connected.");
      const response = await client.callTool("discoverDecision", { query: aq });
      if (response?.content?.[0]) {
        try { setSearchResult(JSON.parse(response.content[0].text)); }
        catch { setSearchResult(response.content[0].text); }
      } else setSearchResult([]);
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
      setSearchResult(null);
    } finally { setLoading(false); }
  };

  const handleSearch = async (e) => { if (e) e.preventDefault(); await executeSearch(query); };
  const handleExampleClick = async (t) => { setQuery(t); await executeSearch(t); };
  const handleClear = () => {
    stopRef.current = true;
    setReplayState("idle");
    setQuery(""); setSearchedQuery(""); setSearchResult(null); setError(null);
  };

  const getStatusText = () => ({ connected: "Server Connected", connecting: "Connecting...", disconnected: "Server Disconnected", error: "Connection Error" }[status] || "Unknown");

  const LogoSvg = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><circle cx="18" cy="6" r="3" />
      <path d="M9 6h6" /><path d="M6 9v9h9" /><path d="M12 6v12" />
    </svg>
  );

  const decisions = Array.isArray(searchResult) ? searchResult : searchResult ? [searchResult] : [];

  return (
    <div className="app-wrapper">
      <header>
        <div className="nav-container">
          <a href="#" className="logo-section" onClick={(e) => { e.preventDefault(); handleClear(); }}>
            <LogoSvg className="logo-icon" /><span>DecisionTrace AI</span>
          </a>
          <div className="status-badge" title={error || getStatusText()}>
            <span className={`status-indicator ${status}`} /><span>{getStatusText()}</span>
          </div>
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-logo-large"><LogoSvg /></div>
          <h1 className="hero-title">DecisionTrace AI</h1>
          <p className="hero-subtitle">Instantly search and trace enterprise business decisions through the Model Context Protocol.</p>
        </section>

        <form onSubmit={handleSearch}>
          <div className="search-container">
            <div className="search-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input type="text" id="mcp-search-input" className="search-input" value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search decisions by keyword (e.g. 'Vendor X', 'AWS migration', 'CRM')..."
              disabled={loading} autoComplete="off" />
            <button type="submit" className="search-button" disabled={loading || !query.trim()}>
              {loading ? <>Searching...</> : <><span>Search</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg></>}
            </button>
          </div>
        </form>

        <section className="prompts-container">
          <span className="prompts-label">Try asking:</span>
          <div className="prompts-list">
            {["Why was Vendor X rejected?", "Why was Feature Phoenix cancelled?", "Why did we migrate to AWS?"].map(t => (
              <button key={t} type="button" className="prompt-btn" onClick={() => handleExampleClick(t)}>{t}</button>
            ))}
          </div>
        </section>

        {error && (
          <div className="error-container">
            <span className="error-icon">⚠️</span>
            <div className="error-details"><h4 className="error-title">Execution Failure</h4><p>{error}</p></div>
          </div>
        )}

        {loading && (
          <div className="loading-wrapper">
            <div className="spinner" />
            <span className="loading-text">Calling discoverDecision("{searchedQuery}")...</span>
          </div>
        )}

        {!loading && searchResult !== null && (
          decisions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <h3>No records match your query</h3>
              <p>Try searching for words like "Vendor", "AWS", "Phoenix", "Apollo", or "CRM".</p>
            </div>
          ) : (
            <EnterpriseDecisionReport
              decisions={decisions} onClear={handleClear}
              replayState={replayState} replayData={replayData}
              onStartReplay={startReplay} onPause={handlePause}
              onResume={handleResume} onRestart={handleRestart}
            />
          )
        )}
      </main>

      <footer>
        <p>DecisionTrace AI • Powered by Model Context Protocol (MCP) • Local Enterprise Data</p>
      </footer>
    </div>
  );
}

export default App;
