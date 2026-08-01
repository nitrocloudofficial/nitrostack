'use client';

import {
  Factory,
  Recycle,
  Brain,
  Search,
  GitMerge,
  Truck,
  TrendingUp,
  ShieldCheck,
  MapPin,
  Phone,
  ArrowRight,
  Plug,
  Terminal,
  Workflow,
  Zap,
  Globe,
  Gauge,
  ChevronRight,
  IndianRupee,
  Quote,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { SpotlightCard } from '@/components/SpotlightCard';
import { CountUp } from '@/components/CountUp';
import { FadeIn } from '@/components/FadeIn';
import { CodeBlock } from '@/components/CodeBlock';

const Iridescence = dynamic(() => import('@/components/Iridescence'), { ssr: false });

const MCP_URL = 'https://relink-6a64ea0e-aravindco-amrita-university-coimbatore.app.nitrocloud.ai';

export default function Home() {
  return (
    <main>
      <Nav />
      <Hero />
      <Problem />
      <Agents />
      <McpGuide />
      <UseCases />
      <PricingQuotes />
      <Footer />
    </main>
  );
}

/* ── Nav ── */
function Nav() {
  return (
    <div className="nav-wrapper">
      <nav className="nav">
        <div className="nav-inner">
          <a href="#" className="logo">
            Relink
          </a>
          <div className="nav-links">
            <a href="#problem">Problem</a>
            <a href="#agents">Agents</a>
            <a href="#mcp">MCP Guide</a>
            <a href="#usecases">Use Cases</a>
            <a href="#pricing">Pricing</a>
          </div>
          <a
            href={`${MCP_URL}`}
            target="_blank"
            rel="noreferrer"
            className="nav-action"
          >
            <Plug size={14} /> Connect MCP
          </a>
        </div>
      </nav>
    </div>
  );
}

/* ── Hero ── */
function Hero() {
  return (
    <section style={{ position: 'relative', paddingTop: 140, paddingBottom: 80, overflow: 'hidden' }}>
      {/* Iridescence Canvas Background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          opacity: 0.85,
        }}
      >
        <Iridescence
          color={[0.35, 0.55, 0.95]}
          mouseReact={true}
          amplitude={0.15}
          speed={1.2}
        />
      </div>

      {/* Radial overlay gradient for seamless text legibility without masking the animation */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background: 'radial-gradient(circle at center, rgba(248, 249, 252, 0.45) 0%, rgba(248, 249, 252, 0.78) 85%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="section"
        style={{
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          paddingTop: 0,
          paddingBottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FadeIn>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 18px',
              borderRadius: 100,
              background: 'rgba(5, 150, 105, 0.12)',
              border: '1px solid rgba(5, 150, 105, 0.3)',
              color: 'var(--emerald)',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.04em',
              marginBottom: 16,
              boxShadow: '0 2px 10px rgba(5, 150, 105, 0.08)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Quote size={14} style={{ fill: 'currentColor', opacity: 0.8 }} /> &ldquo;waste to revenue&rdquo;
          </div>
        </FadeIn>

        <FadeIn delay={0.05}>
          <span className="badge">
            <span className="badge-dot" /> LIVE MCP SERVER &mdash; MANUFACTURING & INDUSTRY 4.0
          </span>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h1
            style={{
              fontSize: 'clamp(38px, 6vw, 76px)',
              fontWeight: 900,
              lineHeight: 1.1,
              marginTop: 24,
              letterSpacing: '-0.04em',
              maxWidth: 900,
              marginLeft: 'auto',
              marginRight: 'auto',
              textAlign: 'center',
            }}
          >
            One factory&apos;s waste.
            <br />
            <span style={{ color: 'var(--accent)' }}>Another&apos;s raw material.</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: 18,
              maxWidth: 640,
              margin: '20px auto 0',
              lineHeight: 1.7,
              textAlign: 'center',
            }}
          >
            Relink is a platform of six autonomous AI agents that sense factory surplus, verify it
            with vision AI, match buyers across industrial zones, and close the loop &mdash; turning
            manufacturing waste into a revenue stream.
          </p>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 36,
              flexWrap: 'wrap',
            }}
          >
            <a
              href={`${MCP_URL}/mcp`}
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              Connect to MCP <ArrowRight size={18} />
            </a>
            <a href="#mcp" className="btn-secondary">
              <Terminal size={16} /> Integration Guide
            </a>
          </div>
        </FadeIn>

        <FadeIn delay={0.4}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 8,
              marginTop: 80,
              maxWidth: 880,
              width: '100%',
              marginLeft: 'auto',
              marginRight: 'auto',
              borderTop: '1px solid var(--border)',
              paddingTop: 40,
              textAlign: 'center',
            }}
          >
            {[
              { value: 4, suffix: 'B+', label: 'Tonnes waste per year' },
              { value: 15, suffix: '%', label: 'Currently reused' },
              { value: 500, suffix: 'B+', label: 'Market by 2030', prefix: '$' },
              { value: 22, suffix: '', label: 'MCP tools live' },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div className="stat-value">
                  {s.prefix}
                  <CountUp end={s.value} suffix={s.suffix} />
                </div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ── Problem ── */
function Problem() {
  const rows = [
    { flow: 'Production scheduling', status: 'Optimized', ok: true },
    { flow: 'Machine health (IoT + predictive maintenance)', status: 'Optimized', ok: true },
    { flow: 'Quality control (computer vision)', status: 'Optimized', ok: true },
    { flow: 'Inbound supply chain', status: 'Optimized', ok: true },
    { flow: 'Waste and byproduct outflow', status: 'Pen, paper and a phone call', ok: false },
  ];

  return (
    <section id="problem" className="section">
      <FadeIn>
        <div className="section-label">The Industry 4.0 Blind Spot</div>
        <h2 className="section-title">
          Every manufacturing flow got digitized.
          <br />
          <span style={{ color: 'var(--emerald)' }}>Except the one coming out the back door.</span>
        </h2>
        <p className="section-sub">
          Factories run SCADA, MES, and predictive maintenance on every production line &mdash; then
          sell 50 tonnes of monthly scrap to whichever dealer called first, at 30&ndash;40% below
          fair value. That asymmetry costs Indian manufacturing an estimated{' '}
          <strong style={{ color: 'var(--text)' }}>₹25,000 crore</strong> every year.
        </p>
      </FadeIn>

      <FadeIn delay={0.15}>
        <div style={{ marginTop: 44, maxWidth: 700 }}>
          {rows.map((r) => (
            <div
              key={r.flow}
              className="compare-row"
              style={{
                background: r.ok ? 'var(--emerald-light)' : 'var(--rose-light)',
                marginBottom: 8,
              }}
            >
              <span style={{ fontWeight: 500 }}>{r.flow}</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '3px 12px',
                  borderRadius: 100,
                  background: r.ok
                    ? 'rgba(5, 150, 105, 0.12)'
                    : 'rgba(225, 29, 72, 0.1)',
                  color: r.ok ? 'var(--emerald)' : 'var(--rose)',
                }}
              >
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </FadeIn>
    </section>
  );
}

/* ── Agents ── */
function Agents() {
  const agents = [
    {
      icon: Factory,
      name: 'Intake Agent',
      type: 'Proactive',
      desc: 'Polls ERP disposal queues, accepts photo uploads, and answers multilingual voice calls from MSME factories. Sellers set their own price.',
      color: 'var(--emerald)',
      tag: 'emerald',
    },
    {
      icon: ShieldCheck,
      name: 'Verification Agent',
      type: 'Autonomous',
      desc: 'Gemini Vision grades material health (A/B/C), classifies downstream uses, benchmarks price, and scores seller trust without human intervention.',
      color: 'var(--accent)',
      tag: 'blue',
    },
    {
      icon: Search,
      name: 'Sourcing Agent',
      type: 'Conversational',
      desc: 'Natural-language BOM decomposition plus cluster analysis that recommends the best industrial zone to source from based on density, price, and trust.',
      color: 'var(--violet)',
      tag: 'violet',
    },
    {
      icon: GitMerge,
      name: 'Matching Agent',
      type: 'Autonomous',
      desc: 'Solves the many-to-many allocation problem &mdash; combines sellers to fill one buyer&apos;s BOM at minimum cost plus transport.',
      color: 'var(--amber)',
      tag: 'amber',
    },
    {
      icon: Truck,
      name: 'Logistics Agent',
      type: 'On-demand',
      desc: 'Google Maps MCP integration for routes, freight estimates, and transporter matching when a buyer requests delivery assistance.',
      color: 'var(--accent)',
      tag: 'blue',
    },
    {
      icon: TrendingUp,
      name: 'Prediction Agent',
      type: 'Proactive',
      desc: 'Reads production schedules and forecasts waste before it exists &mdash; then pre-notifies matched buyers via WhatsApp. Predictive supply.',
      color: 'var(--rose)',
      tag: 'rose',
    },
  ];

  return (
    <section id="agents" className="section">
      <FadeIn>
        <div className="section-label">Agentic Architecture</div>
        <h2 className="section-title">
          Six autonomous agents.
          <br />
          <span style={{ color: 'var(--accent)' }}>One event-driven MCP nervous system.</span>
        </h2>
        <p className="section-sub">
          Each agent is a standalone MCP server. They communicate through Supabase Realtime &mdash;
          when the Intake Agent writes a listing, the Verification Agent wakes up automatically. No
          polling. No orchestrator bottleneck.
        </p>
      </FadeIn>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
          marginTop: 44,
        }}
      >
        {agents.map((a, i) => (
          <FadeIn key={a.name} delay={i * 0.07}>
            <div className="agent-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: `color-mix(in srgb, ${a.color} 10%, transparent)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <a.icon size={19} color={a.color} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{a.name}</div>
                  <span className={`tag tag-${a.tag}`} style={{ marginTop: 4 }}>
                    {a.type}
                  </span>
                </div>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.65 }}>
                {a.desc}
              </p>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

/* ── MCP Guide ── */
function McpGuide() {
  const curlList = `curl ${MCP_URL}/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'`;

  const curlCall = `curl ${MCP_URL}/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "search_materials",
      "arguments": {
        "material_type": "aluminum_scrap",
        "max_price_per_kg": 150,
        "max_radius_km": 100
      }
    }
  }'`;

  const claudeConfig = `{
  "mcpServers": {
    "relink": {
      "url": "${MCP_URL}/mcp",
      "transport": "http"
    }
  }
}`;

  const tools = [
    'register_seller', 'create_listing_with_price', 'voice_intake_to_listing',
    'sync_erp_surplus', 'analyze_material_health', 'classify_material_usage',
    'suggest_fair_price', 'calculate_seller_trust_score', 'detect_listing_anomalies',
    'search_materials', 'recommend_best_place_to_source', 'get_seller_contact',
    'compare_listings', 'find_optimal_matches', 'rank_suppliers_by_multi_objective',
    'calculate_route', 'estimate_freight_cost', 'find_nearby_transporters',
    'schedule_pickup', 'forecast_waste_generation', 'get_compliance_report',
    'calculate_esg_impact',
  ];

  return (
    <section id="mcp" className="section">
      <FadeIn>
        <div className="section-label">MCP Integration Guide</div>
        <h2 className="section-title">
          Connect any MCP client in{' '}
          <span style={{ color: 'var(--accent)' }}>60 seconds.</span>
        </h2>
        <p className="section-sub">
          Relink speaks the Model Context Protocol over streamable HTTP. Claude, ChatGPT,
          NitroStudio, or your own agent framework can discover and call all 22 tools with no SDK
          lock-in.
        </p>
      </FadeIn>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 20,
          marginTop: 44,
        }}
      >
        <FadeIn delay={0}>
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="step-num">1</div>
            <strong>Discover the tools</strong>
          </div>
          <CodeBlock code={curlList} language="bash" filename="discover.sh" />
        </FadeIn>

        <FadeIn delay={0.1}>
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="step-num">2</div>
            <strong>Call any tool</strong>
          </div>
          <CodeBlock code={curlCall} language="bash" filename="call-tool.sh" />
        </FadeIn>

        <FadeIn delay={0.2}>
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="step-num">3</div>
            <strong>Wire into your client</strong>
          </div>
          <CodeBlock code={claudeConfig} language="json" filename="claude_desktop_config.json" />
        </FadeIn>
      </div>

      <FadeIn delay={0.3}>
        <div style={{ marginTop: 56 }}>
          <h3
            style={{
              fontSize: 20,
              fontWeight: 700,
              marginBottom: 16,
              letterSpacing: '-0.02em',
            }}
          >
            All 22 live tools
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tools.map((t) => (
              <span key={t} className="tool-chip">
                {t}
              </span>
            ))}
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

/* ── Use Cases ── */
function UseCases() {
  const cases = [
    {
      icon: Factory,
      title: 'Auto Stamping Plant, Pune',
      tag: 'SELLER',
      tagStyle: 'tag-emerald',
      body: 'Uploads a photo of 500 kg Al-6061 stamping scrap. Gemini Vision grades it B, benchmarks at ₹148/kg. Manager quotes ₹140/kg. Listed in 40 seconds with a GST-verified trust badge.',
      metric: '₹4,70,000 per year from disposal cost to revenue',
    },
    {
      icon: Search,
      title: 'Die-Casting Unit, Chakan',
      tag: 'BUYER',
      tagStyle: 'tag-blue',
      body: 'Types &ldquo;need 500 kg aluminum scrap for die-casting, budget ₹145/kg&rdquo;. Sourcing Agent recommends the Talegaon zone &mdash; 7 sellers, average ₹132/kg, Grade A. Buyer taps &ldquo;Get Seller Contact&rdquo; and calls directly.',
      metric: '₹20,000 saved on a single 2-tonne order',
    },
    {
      icon: Phone,
      title: 'Fabrication MSME, Coimbatore',
      tag: 'VOICE',
      tagStyle: 'tag-violet',
      body: 'No ERP, no computer. Calls in, speaks in Tamil: &ldquo;200 kg mild steel offcuts, want ₹28/kg.&rdquo; The voice agent transcribes, structures, and lists it &mdash; the digital divide closed with a phone call.',
      metric: '63% of Indian manufacturing output is MSME',
    },
    {
      icon: TrendingUp,
      title: 'Prediction Engine, Every Factory',
      tag: 'PROACTIVE',
      tagStyle: 'tag-amber',
      body: 'The production schedule shows a 10,000-panel batch run Thursday. The Prediction Agent knows that means roughly 500 kg scrap by Friday &mdash; and pre-notifies three matched buyers on WhatsApp before the waste exists.',
      metric: 'Deals done before waste is generated',
    },
  ];

  return (
    <section id="usecases" className="section">
      <FadeIn>
        <div className="section-label">Real Scenarios</div>
        <h2 className="section-title">
          Built for the factory floor,{' '}
          <span style={{ color: 'var(--accent)' }}>not the slide deck.</span>
        </h2>
      </FadeIn>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
          gap: 16,
          marginTop: 44,
        }}
      >
        {cases.map((c, i) => (
          <FadeIn key={c.title} delay={i * 0.07}>
            <SpotlightCard>
              <div style={{ padding: 24 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: 'var(--accent-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <c.icon size={19} color="var(--accent)" />
                  </div>
                  <span className={`tag ${c.tagStyle}`}>{c.tag}</span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
                  {c.title}
                </h3>
                <p
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: 14,
                    lineHeight: 1.7,
                    marginBottom: 16,
                  }}
                  dangerouslySetInnerHTML={{ __html: c.body }}
                />
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--emerald)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    borderTop: '1px solid var(--border)',
                    paddingTop: 14,
                  }}
                >
                  <ChevronRight size={14} />
                  {c.metric}
                </div>
              </div>
            </SpotlightCard>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

/* ── Pricing / Quotes ── */
function PricingQuotes() {
  const quotes = [
    { material: 'Aluminum Scrap (6061)', grade: 'B', seller: 140, benchmark: '135-155', virgin: 230, trend: '+4%', up: true },
    { material: 'HDPE Regrind', grade: 'A', seller: 32, benchmark: '28-35', virgin: 85, trend: '+2%', up: true },
    { material: 'Steel Offcut (MS)', grade: 'B', seller: 28, benchmark: '26-34', virgin: 68, trend: '-1%', up: false },
    { material: 'Copper Wire Scrap', grade: 'B', seller: 620, benchmark: '580-680', virgin: 850, trend: '+6%', up: true },
  ];

  return (
    <section id="pricing" className="section">
      <FadeIn>
        <div className="section-label">Live Benchmark Quotes</div>
        <h2 className="section-title">
          Sellers set the price.{' '}
          <span style={{ color: 'var(--emerald)' }}>AI keeps everyone honest.</span>
        </h2>
        <p className="section-sub">
          Every listing shows the seller&apos;s own quoted price next to the independent AI
          benchmark &mdash; protecting uninformed sellers from underpricing and giving buyers a fair
          reference point.
        </p>
      </FadeIn>

      <FadeIn delay={0.15}>
        <div
          className="card"
          style={{ marginTop: 40, overflow: 'hidden', padding: 0 }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 0.7fr 1fr 1.2fr 1fr 0.7fr',
              padding: '12px 20px',
              background: '#f1f5f9',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--muted)',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
            }}
            className="quote-row"
          >
            <span>Material</span>
            <span>Grade</span>
            <span>Seller</span>
            <span>AI Benchmark</span>
            <span>Virgin</span>
            <span>Trend</span>
          </div>
          {quotes.map((q) => (
            <div
              key={q.material}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 0.7fr 1fr 1.2fr 1fr 0.7fr',
                padding: '14px 20px',
                borderTop: '1px solid var(--border)',
                alignItems: 'center',
                fontSize: 14,
              }}
              className="quote-row"
            >
              <span style={{ fontWeight: 600 }}>{q.material}</span>
              <span>
                <span
                  style={{
                    padding: '2px 10px',
                    borderRadius: 100,
                    fontSize: 11,
                    fontWeight: 800,
                    background:
                      q.grade === 'A'
                        ? 'rgba(5, 150, 105, 0.1)'
                        : 'rgba(37, 99, 235, 0.1)',
                    color:
                      q.grade === 'A' ? 'var(--emerald)' : 'var(--accent)',
                  }}
                >
                  {q.grade}
                </span>
              </span>
              <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                <IndianRupee size={11} />{q.seller}
              </span>
              <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 2 }}>
                <IndianRupee size={11} />{q.benchmark}
              </span>
              <span style={{ color: 'var(--muted)', textDecoration: 'line-through', display: 'flex', alignItems: 'center', gap: 2 }}>
                <IndianRupee size={11} />{q.virgin}
              </span>
              <span
                style={{
                  color: q.up ? 'var(--emerald)' : 'var(--rose)',
                  fontWeight: 600,
                }}
              >
                {q.trend}
              </span>
            </div>
          ))}
        </div>
      </FadeIn>
    </section>
  );
}

/* ── Footer ── */
function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', marginTop: 40 }}>
      <div
        className="section"
        style={{ paddingTop: 80, paddingBottom: 80, textAlign: 'center' }}
      >
        <FadeIn>
          <h2
            style={{
              fontSize: 'clamp(26px, 3.5vw, 44px)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
            }}
          >
            The waste stream is the last
            <br />
            <span style={{ color: 'var(--accent)' }}>unoptimized flow in manufacturing.</span>
          </h2>
          <p
            style={{
              color: 'var(--text-secondary)',
              marginTop: 16,
              fontSize: 16,
            }}
          >
            Plug into the MCP server. Let the six agents close the loop.
          </p>
          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              marginTop: 36,
              flexWrap: 'wrap',
            }}
          >
            <a
              href={`${MCP_URL}/mcp`}
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              <Plug size={16} /> Connect MCP Server
            </a>
            <a
              href="https://github.com/Git-Roshan09/relink"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
            >
              <Globe size={16} /> View on GitHub
            </a>
          </div>
        </FadeIn>

        <div
          style={{
            marginTop: 72,
            paddingTop: 24,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
            fontSize: 13,
            color: 'var(--muted)',
          }}
        >
          <div className="logo" style={{ fontSize: 15 }}>
            Relink
          </div>
          <div
            style={{
              display: 'flex',
              gap: 20,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Workflow size={13} /> 6 Agents
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Zap size={13} /> MCP
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Gauge size={13} /> Supabase
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Brain size={13} /> Gemini
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <MapPin size={13} /> Industry 4.0
            </span>
          </div>
          <span>Manufacturing & Industry 4.0</span>
        </div>
      </div>
    </footer>
  );
}
