/**
 * The root landing page for PassportIQ.
 *
 * WHY THIS FILE EXISTS
 * -------------------
 * NitroStack core serves its own page at `/`: a connection-setup panel plus a
 * searchable catalogue of registered tools. That page is correct and useful for
 * wiring an MCP client, but it is the *only* thing a visitor sees, and it makes
 * a passport-verification product look like a bag of JSON-RPC endpoints. A judge
 * (or an officer, or a teammate) landing on the deployed URL must immediately
 * see the product: the workflow, what runs automatically, where the human
 * decides, and one obvious way into the console.
 *
 * So this page takes over `/`, and core's catalogue is re-exposed unharmed at
 * `/mcp-tools` (see ConsoleHttpService.takeOverRoot). Nothing is lost — the
 * tool catalogue is also summarised inline below, grouped by role in the
 * workflow rather than listed alphabetically, which is more informative than
 * the default anyway.
 *
 * WHY IT IS SERVER-RENDERED PLAIN HTML AND NOT A WIDGET
 * ---------------------------------------------------
 * The widget pipeline (nitrostack-cli build → esbuild → src/widgets/out/*.html)
 * produces ~200KB React bundles. A landing page must render instantly, must
 * survive a missing/failed widget build, and must never be the reason the demo
 * shows a blank screen. This is one string with no dependencies. The live
 * numbers are progressively enhanced: the page is complete and correct before
 * any fetch resolves, and each fetch failure degrades to a dash.
 */

import { earthGlobeScript } from './earth.js';

/** Pipeline stages in execution order, with the tool that owns each one. */
const STAGES: ReadonlyArray<{ tool: string; label: string; blurb: string; optional?: boolean }> = [
  {
    tool: 'document_validate',
    label: 'Validate documents',
    blurb: 'Checks every submitted document for type, expiry, legibility and tampering markers.',
  },
  {
    tool: 'ocr_extract',
    label: 'Extract fields',
    blurb: 'Pulls name, DOB, passport number and address off each document with per-field confidence.',
  },
  {
    tool: 'check_identity_consistency',
    label: 'Reconcile identity',
    blurb: 'Compares extracted identity fields against the application form and flags divergence.',
  },
  {
    tool: 'check_address_consistency',
    label: 'Reconcile address',
    blurb: 'Normalises and compares addresses across proofs; tolerates formatting, not substance.',
  },
  {
    tool: 'detect_duplicate_signals',
    label: 'Detect reuse',
    blurb: 'Searches every other live application for reused phone, email, address, passport or image hash.',
  },
  {
    tool: 'build_risk_graph',
    label: 'Build link graph',
    blurb: 'Assembles the applicant cluster, traversing shared identifiers transitively to surface rings.',
  },
  {
    tool: 'visual_similarity_flag',
    label: 'Compare photographs',
    blurb: 'Perceptual-hash comparison of applicant photographs across the cluster.',
    optional: true,
  },
  {
    tool: 'evaluate_rules',
    label: 'Evaluate rules',
    blurb: 'Runs the deterministic rule book; every fired rule carries an id, weight and citation.',
  },
  {
    tool: 'score_risk',
    label: 'Score risk',
    blurb: 'Aggregates fired rules into a 0–100 score and a low / medium / high band.',
  },
  {
    tool: 'explain_risk',
    label: 'Explain the score',
    blurb: 'Produces the officer-readable narrative, citing the exact rules and evidence that moved it.',
  },
];

const TOOL_GROUPS: ReadonlyArray<{
  name: string;
  note: string;
  tone: string;
  tools: ReadonlyArray<[string, string]>;
}> = [
  {
    name: 'Agentic investigation',
    tone: '#7C3AED',
    note: 'The agent plans its own tool calls. It reasons, acts, observes, and stops at the officer.',
    tools: [
      ['agent_investigate', 'Runs a multi-step investigation on one application, choosing tools itself.'],
      ['agent_triage_queue', 'Sweeps the whole queue, investigates what looks worst, escalates the rest.'],
      ['agent_recommend_decision', 'Produces a recommendation with cited evidence — never a decision.'],
      ['get_agent_trace', 'Returns the full reasoning trace of a run: every thought, action and observation.'],
    ],
  },
  {
    name: 'Verification pipeline',
    tone: '#2563EB',
    note: 'Ten chained stages. Each one emits an event and writes to the audit trail.',
    tools: [
      ['run_verification_pipeline', 'Orchestrates all ten stages end to end for one application.'],
      ['document_validate', 'Document type, expiry, legibility and tampering checks.'],
      ['ocr_extract', 'Field extraction with per-field confidence.'],
      ['check_identity_consistency', 'Identity fields vs. the application form.'],
      ['check_address_consistency', 'Address proofs reconciled against each other.'],
      ['visual_similarity_flag', 'Perceptual photo comparison across the cluster.'],
      ['detect_duplicate_signals', 'Cross-application identifier reuse detection.'],
      ['build_risk_graph', 'Transitive applicant link graph and ring detection.'],
      ['evaluate_rules', 'Deterministic rule book with citations.'],
      ['score_risk', 'Weighted 0–100 score and risk band.'],
      ['explain_risk', 'Cited, officer-readable explanation of the score.'],
    ],
  },
  {
    name: 'Case data',
    tone: '#0891B2',
    note: 'Read models the officer and the agent share, so both see the same case.',
    tools: [
      ['list_applications', 'The application pool with status and risk.'],
      ['get_application', 'One application: applicant, documents, progress, risk, decision.'],
      ['list_applicant_clusters', 'Every detected cluster, largest first.'],
      ['get_pipeline_progress', 'Stages completed, stages outstanding, and whether a decision is permitted.'],
    ],
  },
  {
    name: 'Decision and audit',
    tone: '#059669',
    note: 'The only tool that can change an outcome is guarded, and it is operated by a human.',
    tools: [
      ['officer_decide', 'Approve, request clarification or reject. Blocked until the pipeline is complete.'],
      ['get_audit_trail', 'Immutable, attributed record of every stage, run and decision.'],
      ['get_pipeline_events', 'The raw event log emitted during processing.'],
    ],
  },
  {
    name: 'Automation and console',
    tone: '#B45309',
    note: 'Autopilot works the queue on a timer without being asked.',
    tools: [
      ['autopilot_status', 'Sweeps run, applications investigated, escalations raised, next sweep due.'],
      ['autopilot_control', 'Arm, disarm, or run a single sweep now.'],
      ['get_officer_queue', 'The triage queue, ordered by what deserves attention first.'],
      ['get_console_activity', 'Recent activity as officer-readable lines.'],
    ],
  },
];

const AUTOPILOT_STEPS: ReadonlyArray<[string, string]> = [
  ['Wakes on a timer', 'No prompt, no click. A sweep fires on its configured interval.'],
  ['Picks its own targets', 'Reads the queue, ranks by cluster size, reuse signals and outstanding stages.'],
  ['Runs what is missing', 'Drives the verification pipeline for applications that have not been processed.'],
  ['Investigates the worst', 'Sends the agent in on the highest-risk cases and records the full trace.'],
  ['Escalates and stops', 'Raises escalations, surfaces rings, and hands the queue to an officer. It decides nothing.'],
];

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stageMarkup(): string {
  return STAGES.map((stage, index) => {
    const n = String(index + 1).padStart(2, '0');
    return `<li class="stage${stage.optional ? ' is-opt' : ''}">
      <span class="stage-n">${n}</span>
      <div class="stage-body">
        <div class="stage-head">
          <span class="stage-label">${esc(stage.label)}</span>
          ${stage.optional ? '<span class="tag tag-opt">optional</span>' : '<span class="tag tag-req">required to decide</span>'}
        </div>
        <code class="stage-tool">${esc(stage.tool)}</code>
        <p class="stage-blurb">${esc(stage.blurb)}</p>
      </div>
    </li>`;
  }).join('');
}

function toolGroupMarkup(): string {
  return TOOL_GROUPS.map(
    (group) => `<section class="tgroup" style="--tone:${group.tone}">
      <header class="tgroup-head">
        <h3>${esc(group.name)}</h3>
        <span class="tgroup-count">${group.tools.length} tools</span>
      </header>
      <p class="tgroup-note">${esc(group.note)}</p>
      <ul class="tlist">
        ${group.tools
          .map(
            ([name, blurb]) =>
              `<li><code>${esc(name)}</code><span>${esc(blurb)}</span></li>`
          )
          .join('')}
      </ul>
    </section>`
  ).join('');
}

function autopilotMarkup(): string {
  return AUTOPILOT_STEPS.map(
    ([title, blurb], i) => `<li class="auto-step">
      <span class="auto-n">${i + 1}</span>
      <div>
        <strong>${esc(title)}</strong>
        <p>${esc(blurb)}</p>
      </div>
    </li>`
  ).join('');
}

const STYLE = `
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:#F4F6FA;color:#0F172A;font:15px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
code{font-family:ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,monospace}
.wrap{max-width:1180px;margin:0 auto;padding:0 24px}

/* ---- masthead ---- */
.mast{background:#FFF;border-bottom:1px solid #E2E6EF;position:sticky;top:0;z-index:20}
.mast-in{display:flex;align-items:center;gap:14px;height:60px}
.emblem{width:32px;height:32px;border-radius:7px;background:#4F46E5;display:grid;place-items:center;flex:0 0 auto}
.emblem svg{width:19px;height:19px}
.mast-t{font-weight:650;letter-spacing:-.2px;font-size:15px}
.mast-s{font-size:11.5px;color:#64748B;letter-spacing:.02em}
.mast-nav{margin-left:auto;display:flex;align-items:center;gap:6px}
.mast-nav a{font-size:13px;color:#475569;padding:7px 11px;border-radius:6px}
.mast-nav a:hover{background:#F1F5F9;color:#0F172A}
.mast-nav a.cta{background:#4F46E5;color:#FFF;font-weight:600;padding:8px 15px}
.mast-nav a.cta:hover{background:#4338CA;color:#FFF}

/* ---- hero: dark, with the dotted Earth — the graph is global, so is the fraud ---- */
.hero{background:radial-gradient(1200px 640px at 78% 42%,#101A33 0%,#070B15 55%,#05070E 100%);border-bottom:1px solid #E2E6EF;padding:56px 0 44px;color:#EDF0F7;position:relative;overflow:hidden}
.hero-grid{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:34px;align-items:center}
.hero-globe{position:relative;height:400px}
.hero-globe canvas{width:100%;height:100%;display:block}
.kicker{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:#A5B4FC;background:rgba(99,102,241,.14);border:1px solid rgba(129,140,248,.35);padding:5px 11px;border-radius:4px}
.hero h1{font-size:38px;line-height:1.14;letter-spacing:-.9px;font-weight:680;margin:18px 0 0;max-width:20ch;color:#F5F7FF}
.hero h1 em{font-style:normal;color:#8B9CF9}
.hero p.lede{font-size:16.5px;color:#A9B4C9;max-width:64ch;margin:16px 0 0}
.hero .btn{border-color:rgba(255,255,255,.2);background:rgba(255,255,255,.05);color:#EDF0F7}
.hero .btn:hover{background:rgba(255,255,255,.11)}
.hero .btn-primary{background:#5B4DFF;border-color:#5B4DFF;color:#FFF}
.hero .btn-primary:hover{background:#4B3EE8}
.hero .btn-ghost{border-color:transparent;background:transparent;color:#A9B4C9}
.hero .btn-ghost:hover{background:rgba(255,255,255,.07);color:#EDF0F7}
.hero-note{color:#8593AB!important}
.hero-note code{background:rgba(255,255,255,.08)!important;border-color:rgba(255,255,255,.14)!important;color:#C9D2E3}
@media (max-width:960px){.hero-grid{grid-template-columns:1fr}.hero-globe{height:300px;order:-1}}
.hero-cta{display:flex;flex-wrap:wrap;gap:10px;margin-top:26px}
.btn{display:inline-flex;align-items:center;gap:9px;font-size:14px;font-weight:600;padding:11px 18px;border-radius:7px;border:1px solid #CBD5E1;background:#FFF;color:#0F172A;cursor:pointer}
.btn:hover{background:#F8FAFC}
.btn-primary{background:#4F46E5;border-color:#4F46E5;color:#FFF}
.btn-primary:hover{background:#4338CA;color:#FFF}
.btn-ghost{border-color:transparent;background:transparent;color:#475569}
.btn-ghost:hover{background:#F1F5F9}
.hero-note{margin-top:16px;font-size:12.5px;color:#64748B}
.hero-note code{background:#F1F5F9;border:1px solid #E2E8F0;border-radius:4px;padding:1px 5px;font-size:11.5px}

/* ---- live strip ---- */
.strip{background:#0B1220;color:#E2E8F0;padding:0}
.strip-in{display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:rgba(255,255,255,.07)}
.sv{background:#0B1220;padding:16px 14px}
.sv-n{font-size:23px;font-weight:660;letter-spacing:-.5px;font-variant-numeric:tabular-nums;color:#FFF}
.sv-l{font-size:10.5px;text-transform:uppercase;letter-spacing:.09em;color:#8593AB;margin-top:3px}
.sv.hot .sv-n{color:#F87171}
.sv.warn .sv-n{color:#FBBF24}
.sv.ok .sv-n{color:#34D399}
.sv.mach .sv-n{color:#A78BFA}
.strip-foot{display:flex;align-items:center;gap:10px;padding:9px 0;font-size:11.5px;color:#8593AB;border-top:1px solid rgba(255,255,255,.07)}
.dot{width:7px;height:7px;border-radius:50%;background:#34D399;box-shadow:0 0 0 3px rgba(52,211,153,.18)}
.dot.off{background:#64748B;box-shadow:none}

/* ---- sections ---- */
section.band{padding:52px 0}
section.band.alt{background:#FFF;border-top:1px solid #E2E6EF;border-bottom:1px solid #E2E6EF}
.eyebrow{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#64748B}
h2.sec{font-size:25px;letter-spacing:-.5px;font-weight:660;margin:9px 0 0}
p.sec{font-size:15px;color:#475569;max-width:76ch;margin:11px 0 0}

/* ---- pipeline ---- */
.stages{list-style:none;margin:26px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(268px,1fr));gap:12px}
.stage{display:flex;gap:12px;background:#FFF;border:1px solid #E2E6EF;border-left:3px solid #2563EB;border-radius:8px;padding:14px}
.stage.is-opt{border-left-color:#94A3B8}
.stage-n{font-size:11px;font-weight:700;color:#94A3B8;font-variant-numeric:tabular-nums;padding-top:2px}
.stage-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.stage-label{font-weight:640;font-size:14px}
.tag{font-size:9.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:2px 6px;border-radius:3px}
.tag-req{background:#EFF6FF;color:#1D4ED8;border:1px solid #DBEAFE}
.tag-opt{background:#F1F5F9;color:#64748B;border:1px solid #E2E8F0}
.stage-tool{display:inline-block;margin-top:6px;font-size:11.5px;color:#4F46E5;background:#F5F5FF;border:1px solid #E7E7FB;border-radius:4px;padding:2px 6px}
.stage-blurb{margin:8px 0 0;font-size:12.5px;color:#64748B;line-height:1.5}

/* ---- gate ---- */
.gate{margin-top:22px;background:#FFFBEB;border:1px solid #FDE68A;border-left:3px solid #D97706;border-radius:8px;padding:18px 20px;display:flex;gap:14px}
.gate h4{margin:0;font-size:14.5px;font-weight:660;color:#78350F}
.gate p{margin:7px 0 0;font-size:13.5px;color:#92400E;max-width:82ch}

/* ---- autopilot ---- */
.cols{display:grid;grid-template-columns:1.05fr .95fr;gap:34px;align-items:start}
.auto{list-style:none;margin:22px 0 0;padding:0;display:grid;gap:9px}
.auto-step{display:flex;gap:13px;background:#FFF;border:1px solid #E2E6EF;border-radius:8px;padding:13px 15px}
.auto-n{width:23px;height:23px;flex:0 0 auto;border-radius:5px;background:#F5F3FF;color:#6D28D9;border:1px solid #E9D8FD;display:grid;place-items:center;font-size:11.5px;font-weight:700}
.auto-step strong{font-size:13.5px;font-weight:640}
.auto-step p{margin:4px 0 0;font-size:12.5px;color:#64748B}
.loop{background:#0B1220;border-radius:10px;padding:20px;color:#CBD5E1;margin-top:22px}
.loop-t{font-size:11px;letter-spacing:.11em;text-transform:uppercase;color:#8593AB;font-weight:700}
.loop ol{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:9px}
.loop li{display:flex;gap:10px;align-items:flex-start;font-size:12.5px;line-height:1.5}
.loop li b{color:#A78BFA;font-weight:640;flex:0 0 74px;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;padding-top:2px}
.loop li.stop b{color:#FBBF24}
.loop li span{color:#94A3B8}

/* ---- screens ---- */
.screens{list-style:none;margin:24px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:11px}
.screens li{background:#FFF;border:1px solid #E2E6EF;border-radius:8px;padding:15px}
.screens a{display:block}
.screens b{font-size:13.5px;font-weight:640;display:block}
.screens p{margin:6px 0 0;font-size:12.5px;color:#64748B;line-height:1.5}
.screens li:hover{border-color:#A5B4FC;box-shadow:0 1px 3px rgba(79,70,229,.09)}

/* ---- mcp ---- */
.endpoint{margin-top:22px;background:#0B1220;border-radius:9px;padding:15px 17px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.endpoint-l{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:#8593AB;font-weight:700}
.endpoint code{color:#7DD3FC;font-size:13px;flex:1;min-width:240px;word-break:break-all}
.copy{background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.14);color:#E2E8F0;font-size:12px;font-weight:600;padding:7px 13px;border-radius:6px;cursor:pointer}
.copy:hover{background:rgba(255,255,255,.16)}
.tgroups{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:13px;margin-top:20px}
.tgroup{background:#FFF;border:1px solid #E2E6EF;border-top:3px solid var(--tone);border-radius:8px;padding:16px 17px}
.tgroup-head{display:flex;align-items:baseline;gap:9px}
.tgroup h3{margin:0;font-size:14.5px;font-weight:650}
.tgroup-count{margin-left:auto;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--tone)}
.tgroup-note{margin:7px 0 0;font-size:12.5px;color:#64748B;line-height:1.5}
.tlist{list-style:none;margin:13px 0 0;padding:0;display:grid;gap:8px}
.tlist li{display:grid;gap:3px;padding-top:8px;border-top:1px solid #F1F5F9}
.tlist li:first-child{border-top:0;padding-top:0}
.tlist code{font-size:12px;color:#0F172A;font-weight:600}
.tlist span{font-size:12px;color:#64748B;line-height:1.45}

/* ---- footer ---- */
footer{background:#0B1220;color:#94A3B8;padding:32px 0;font-size:12.5px}
footer .fl{display:flex;flex-wrap:wrap;gap:8px 20px;margin-bottom:16px}
footer a{color:#CBD5E1}
footer a:hover{color:#FFF;text-decoration:underline}
footer .fine{border-top:1px solid rgba(255,255,255,.08);padding-top:15px;line-height:1.65}

@media (max-width:900px){
  .cols{grid-template-columns:1fr}
  .strip-in{grid-template-columns:repeat(3,1fr)}
  .hero h1{font-size:29px}
}
`;

const SCRIPT = `
(function(){
  var base = location.origin;
  function set(id, v){ var el=document.getElementById(id); if(el) el.textContent = (v===undefined||v===null)?'—':String(v); }
  function j(p){ return fetch(base+p,{headers:{'Accept':'application/json'}}).then(function(r){ if(!r.ok) throw new Error(String(r.status)); return r.json(); }); }

  document.getElementById('ep').textContent = base + '/mcp';
  var cp = document.getElementById('copy');
  if (cp) cp.addEventListener('click', function(){
    var t = base + '/mcp';
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function(){
      cp.textContent='Copied'; setTimeout(function(){ cp.textContent='Copy endpoint'; },1400);
    }, function(){ cp.textContent='Copy failed'; setTimeout(function(){ cp.textContent='Copy endpoint'; },1400); });
  });

  j('/api/console/health').then(function(h){
    set('m-tools', h.toolsRegistered);
    var d=document.getElementById('livedot'), s=document.getElementById('livetext');
    if(h.ok){ if(d) d.className='dot'; if(s) s.textContent='Server live · executor '+(h.executorReady?'ready':'warming')+' · autopilot '+((h.autopilot&&h.autopilot.mode)||'stopped'); }
  }).catch(function(){
    var d=document.getElementById('livedot'), s=document.getElementById('livetext');
    if(d) d.className='dot off'; if(s) s.textContent='Live figures unavailable — the page above is still accurate.';
  });

  j('/api/overview').then(function(o){
    var t=(o&&o.totals)||{};
    set('m-apps', t.applications); set('m-pending', t.pending);
    set('m-high', t.highRisk); set('m-rings', t.rings);
    set('m-runs', t.agentRuns); set('m-esc', t.escalations);
    var q=(o&&o.queue)||[];
    if(q.length){
      var top=q[0], el=document.getElementById('topcase');
      if(el && top){
        el.innerHTML = '<a href="/console"><span class="tc-l">Worst case in the queue right now</span>'+
          '<span class="tc-id">'+(top.applicationId||'')+'</span>'+
          '<span class="tc-n">'+(top.applicantName||'')+'</span>'+
          '<span class="tc-r">risk '+(top.riskScore==null?'unscored':top.riskScore)+'</span>'+
          '<p class="tc-h">'+(top.headline||'')+'</p>'+
          '<span class="tc-go">Open in the officer console &rarr;</span></a>';
        el.style.display='block';
      }
    }
  }).catch(function(){});
})();
`;

const TOPCASE_STYLE = `
#topcase{display:none;margin-top:22px;background:#FFF;border:1px solid #E2E6EF;border-left:3px solid #DC2626;border-radius:8px;padding:16px 18px}
#topcase:hover{border-color:#FCA5A5}
.tc-l{display:block;font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#B91C1C}
.tc-id{font-family:ui-monospace,Menlo,monospace;font-size:12.5px;color:#475569;margin-top:8px;display:inline-block}
.tc-n{font-size:16px;font-weight:650;margin-left:10px;letter-spacing:-.2px}
.tc-r{margin-left:10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#B91C1C;background:#FEF2F2;border:1px solid #FECACA;border-radius:3px;padding:2px 7px}
.tc-h{margin:9px 0 0;font-size:13.5px;color:#475569;max-width:88ch;line-height:1.5}
.tc-go{display:inline-block;margin-top:11px;font-size:13px;font-weight:640;color:#4F46E5}
`;

/**
 * The landing page, fully rendered. One string, no dependencies, no build step.
 */
export const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PassportIQ — agentic passport verification for the officer's desk</title>
<meta name="description" content="PassportIQ runs the entire passport verification workflow — ten chained checks, cross-application fraud-graph analysis and an autonomous investigating agent — and stops at the officer for the decision. Built on NitroStack MCP.">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>${STYLE}${TOPCASE_STYLE}</style>
</head>
<body>

<header class="mast">
  <div class="wrap mast-in">
    <span class="emblem"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3l7.5 3.2v5.6c0 4.6-3.1 8.6-7.5 10.2-4.4-1.6-7.5-5.6-7.5-10.2V6.2L12 3z" fill="rgba(255,255,255,.2)" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/><path d="M8.6 12.3l2.6 2.6 4.4-4.7" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
    <div>
      <div class="mast-t">PassportIQ</div>
      <div class="mast-s">Agentic verification copilot · Passport Seva (simulated)</div>
    </div>
    <nav class="mast-nav">
      <a href="#workflow">Workflow</a>
      <a href="#autopilot">Automation</a>
      <a href="#mcp">MCP tools</a>
      <a href="/mcp-tools">Connect a client</a>
      <a class="cta" href="/console">Open Officer Console &rarr;</a>
    </nav>
  </div>
</header>

<div class="hero">
  <div class="wrap hero-grid">
  <div>
    <span class="kicker">Live system · NitroStack MCP</span>
    <h1>The passport verification workflow, <em>run by an agent</em>, decided by an officer.</h1>
    <p class="lede">
      PassportIQ takes an application through ten chained verification stages, hunts for identifier reuse
      across every other live application, builds the fraud graph that exposes coordinated rings, scores the
      risk against a cited rule book — then stops, and hands a complete evidence pack to a human. The machine
      investigates. It never approves.
    </p>
    <div class="hero-cta">
      <a class="btn btn-primary" href="/login">Officer sign-in &rarr;</a>
      <a class="btn" href="/console">Open the console</a>
      <a class="btn btn-ghost" href="/mcp-tools">Connect an MCP client</a>
    </div>
    <p class="hero-note">
      The console is the product. The <code>/mcp</code> endpoint exposes the same guarded tools to Claude,
      Cursor, ChatGPT or any MCP client — same schemas, same guards, same audit trail.
    </p>
    <div id="topcase"></div>
  </div>
  <div class="hero-globe"><canvas id="hero-globe" aria-hidden="true"></canvas></div>
  </div>
</div>

<div class="strip">
  <div class="wrap">
    <div class="strip-in">
      <div class="sv"><div class="sv-n" id="m-apps">—</div><div class="sv-l">Applications</div></div>
      <div class="sv warn"><div class="sv-n" id="m-pending">—</div><div class="sv-l">Awaiting officer</div></div>
      <div class="sv hot"><div class="sv-n" id="m-high">—</div><div class="sv-l">High risk</div></div>
      <div class="sv hot"><div class="sv-n" id="m-rings">—</div><div class="sv-l">Fraud rings</div></div>
      <div class="sv mach"><div class="sv-n" id="m-runs">—</div><div class="sv-l">Agent runs</div></div>
      <div class="sv warn"><div class="sv-n" id="m-esc">—</div><div class="sv-l">Escalations</div></div>
      <div class="sv ok"><div class="sv-n" id="m-tools">—</div><div class="sv-l">MCP tools live</div></div>
    </div>
    <div class="strip-foot"><span class="dot off" id="livedot"></span><span id="livetext">Reading live state…</span></div>
  </div>
</div>

<section class="band" id="workflow">
  <div class="wrap">
    <span class="eyebrow">The main event · the verification pipeline</span>
    <h2 class="sec">Ten stages, chained, every one of them an MCP tool</h2>
    <p class="sec">
      <code>run_verification_pipeline</code> drives the whole chain for one application. Each stage emits an
      event on the live stream and writes an attributed line to the audit trail, so the officer can see not
      only the verdict but the order in which it was reached. Nine of the ten are required before a decision
      is legally permitted; the guard enforces that in code, not in a comment.
    </p>
    <ol class="stages">${stageMarkup()}</ol>

    <div class="gate">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="flex:0 0 auto;margin-top:1px"><path d="M12 3l8 4v5c0 5-3.4 9.2-8 10.5C7.4 21.2 4 17 4 12V7l8-4z" stroke="#B45309" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 9v4M12 16h.01" stroke="#B45309" stroke-width="1.9" stroke-linecap="round"/></svg>
      <div>
        <h4>The decision gate is not advisory — it is a guard</h4>
        <p>
          <code>officer_decide</code> is wrapped in <code>PipelineCompleteGuard</code>. Call it before the
          required stages have completed and it is refused with the exact list of what is still outstanding —
          whether the caller is a browser, an LLM, or the autopilot. In thousands of autonomous sweeps the
          agent has recorded zero decisions of its own, and the acceptance suite asserts that number stays zero.
        </p>
      </div>
    </div>
  </div>
</section>

<section class="band alt" id="autopilot">
  <div class="wrap">
    <span class="eyebrow">Agentic · unattended</span>
    <h2 class="sec">What happens when nobody asks it to do anything</h2>
    <p class="sec">
      Autopilot is the part that makes this a copilot rather than a form. It runs on a timer, chooses its own
      targets from the queue, drives the pipeline where stages are missing, sends the agent in on the worst
      cases, and leaves a queue that has already been worked before an officer sits down.
    </p>
    <div class="cols">
      <ol class="auto">${autopilotMarkup()}</ol>
      <div class="loop">
        <div class="loop-t">The agent's reasoning loop, per turn</div>
        <ol>
          <li><b>Observe</b><span>Reads the case: documents, extracted fields, existing signals, cluster shape.</span></li>
          <li><b>Think</b><span>States a hypothesis and what would confirm or kill it. Recorded verbatim in the trace.</span></li>
          <li><b>Act</b><span>Chooses and calls an MCP tool. Nobody hands it the tool — it picks.</span></li>
          <li><b>Observe</b><span>Reads the tool output and updates the hypothesis. Loops until confident or exhausted.</span></li>
          <li><b>Conclude</b><span>Writes a recommendation citing the rules and evidence that produced it.</span></li>
          <li class="stop"><b>Stop</b><span>Hands to the officer. It has no authority to approve, reject or request clarification.</span></li>
        </ol>
      </div>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <span class="eyebrow">The officer console · six screens</span>
    <h2 class="sec">Everything above, in a browser, live</h2>
    <p class="sec">
      One page, server-streamed over SSE. Every mutating action in it goes through the real registered MCP
      tool — schema validation, guards, audit logging and events included. There is no second backend and no
      path in the UI that can write an outcome the MCP surface could not.
    </p>
    <ul class="screens">
      <li><a href="/console"><b>Overview</b><p>Totals, escalation banner, the queue at a glance, autopilot state and the live activity stream.</p></a></li>
      <li><a href="/console"><b>Officer Queue</b><p>Triage ordered by what deserves attention, with a one-line reason each case is there.</p></a></li>
      <li><a href="/console"><b>Application Review</b><p>Applicant, documents, stage timeline, cited risk summary, agent trace, evidence modal.</p></a></li>
      <li><a href="/console"><b>Fraud Graph</b><p>The applicant link graph with detected clusters and the identifier behind every edge.</p></a></li>
      <li><a href="/console"><b>Agent &amp; Autopilot</b><p>Run history, full reasoning traces, sweep controls and the escalations raised.</p></a></li>
      <li><a href="/console"><b>Audit Trail</b><p>Immutable attributed record, filterable to a single application.</p></a></li>
    </ul>
  </div>
</section>

<section class="band alt" id="mcp">
  <div class="wrap">
    <span class="eyebrow">Model Context Protocol</span>
    <h2 class="sec">The same workflow, exposed as tools to any MCP client</h2>
    <p class="sec">
      The console and the MCP surface are two faces of one server. Point Claude Desktop, Cursor, ChatGPT or
      the raw SSE transport at the endpoint below and you get the identical tools, schemas, guards and audit
      trail — including the four widgets that render pipeline progress, the fraud graph, the cited risk
      explanation and the agent trace directly inside the client.
    </p>
    <div class="endpoint">
      <span class="endpoint-l">MCP endpoint</span>
      <code id="ep">/mcp</code>
      <button class="copy" id="copy" type="button">Copy endpoint</button>
      <a class="copy" href="/mcp-tools">Setup instructions &amp; schemas</a>
    </div>
    <div class="tgroups">${toolGroupMarkup()}</div>
  </div>
</section>

<footer>
  <div class="wrap">
    <div class="fl">
      <a href="/console"><strong>Officer Console</strong></a>
      <a href="/mcp-tools">MCP tool catalogue &amp; setup</a>
      <a href="/api/overview">/api/overview</a>
      <a href="/api/console/health">/api/console/health</a>
      <a href="/api/autopilot">/api/autopilot</a>
      <a href="/api/events">/api/events (SSE)</a>
    </div>
    <div class="fine">
      PassportIQ — built on NitroStack MCP for the NitroStack Agentic AI Hackathon 2026.
      All applicants, documents and identifiers are synthetic fixtures; nothing here touches real
      passport data. The system produces recommendations with citations. Every decision of record is
      made by a named human officer, and the guard enforces it.
    </div>
  </div>
</footer>

<script>${SCRIPT}</script>
${earthGlobeScript('hero-globe', { rpm: 0.6 })}
</body>
</html>`;
