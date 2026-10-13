/**
 * login.page.ts — GET /login, the officer sign-in surface.
 *
 * WHY A LOGIN PAGE ON A DEMO
 * --------------------------
 * Two reasons, and neither is real security:
 *
 *   1. ACCOUNTABILITY THEATRE THAT MATTERS. The whole product claim is "a human
 *      officer owns the decision". A console that opens anonymously undercuts
 *      that story; one that opens with a named, badged officer session makes
 *      every decision note and audit row legible ("who is Priya Nair?" answers
 *      itself). The signed-in identity is injected into the console as
 *      window.__PIQ_OFFICER__ and stamped onto chat turns and decisions.
 *
 *   2. THE DEMO WALKTHROUGH. Judges see product surfaces in a fixed order:
 *      landing → sign-in → console. The sign-in screen is where the dotted
 *      Earth lives, which sets the visual register before the console opens.
 *
 * It is DELIBERATELY not an auth boundary: any name and badge is accepted, the
 * API stays open, and the session lives in localStorage. Wiring a real IdP is a
 * deploy-time concern (NitroCloud secrets + an OAuth provider), not a hackathon
 * one — and pretending otherwise with a hardcoded password would be worse than
 * saying so out loud, which this page does in its footnote.
 *
 * Server-rendered single string for the same reason as the landing page: it
 * must render instantly and cannot depend on the widget build.
 */
import { earthGlobeScript } from './earth.js';

export const LOGIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PassportIQ — Officer sign-in</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
  :root{
    --ink:#EDF0F7; --dim:#98A2B3; --line:rgba(255,255,255,.09);
    --accent:#6C5CE7; --accent-2:#8B7CF7; --bg:#04060B;
  }
  *{box-sizing:border-box}
  html,body{height:100%}
  body{
    margin:0; background:var(--bg); color:var(--ink);
    font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;
    overflow:hidden;
  }
  .stage{position:relative; height:100vh; display:flex; align-items:center; justify-content:center}
  /* The globe owns the backdrop; the card floats over its eastern hemisphere. */
  #globe{
    position:absolute; inset:0; width:100%; height:100%;
    display:block; opacity:.9;
  }
  .vignette{
    position:absolute; inset:0; pointer-events:none;
    background:radial-gradient(ellipse at center, transparent 40%, rgba(4,6,11,.88) 78%, var(--bg) 100%);
  }
  .brand{
    position:absolute; top:26px; left:32px; display:flex; gap:11px; align-items:center;
    text-decoration:none; color:var(--ink); z-index:3;
  }
  .brand .mark{
    width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#4F46E5,#7C6CF7);
    display:flex;align-items:center;justify-content:center;box-shadow:0 4px 18px rgba(108,92,231,.45);
  }
  .brand b{font-size:15px;letter-spacing:.02em}
  .brand span{display:block;font-size:10.5px;color:var(--dim);letter-spacing:.14em;text-transform:uppercase}
  .toplinks{position:absolute; top:30px; right:32px; z-index:3; display:flex; gap:18px}
  .toplinks a{color:var(--dim); font-size:13px; text-decoration:none}
  .toplinks a:hover{color:var(--ink)}
  .card{
    position:relative; z-index:2; width:400px; max-width:calc(100vw - 40px);
    background:rgba(10,13,22,.82); backdrop-filter:blur(14px);
    border:1px solid var(--line); border-radius:16px; padding:34px 34px 28px;
    box-shadow:0 30px 80px rgba(0,0,0,.6);
  }
  .eyebrow{font-size:10.5px; letter-spacing:.18em; text-transform:uppercase; color:var(--accent-2); margin:0 0 6px}
  h1{margin:0 0 6px; font-size:23px; font-weight:650}
  .sub{margin:0 0 22px; font-size:13px; color:var(--dim); line-height:1.6}
  label{display:block; font-size:11.5px; font-weight:600; letter-spacing:.04em; color:#C9D2E3; margin:0 0 6px}
  .field{margin-bottom:15px}
  input,select{
    width:100%; padding:11px 13px; border-radius:9px; font-size:14px; color:var(--ink);
    background:rgba(255,255,255,.045); border:1px solid var(--line); outline:none;
    transition:border-color .15s, box-shadow .15s; appearance:none;
  }
  select{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2398A2B3' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:right 13px center}
  input::placeholder{color:#5D6B82}
  input:focus,select:focus{border-color:var(--accent); box-shadow:0 0 0 3px rgba(108,92,231,.22)}
  .btn{
    width:100%; margin-top:6px; padding:12px; border:0; border-radius:9px; cursor:pointer;
    background:linear-gradient(135deg,#5B4DFF,#7C6CF7); color:#fff; font-size:14.5px; font-weight:600;
    letter-spacing:.01em; transition:filter .15s, transform .05s;
  }
  .btn:hover{filter:brightness(1.1)} .btn:active{transform:translateY(1px)}
  .btn[disabled]{opacity:.6; cursor:wait}
  .alt{
    width:100%; margin-top:10px; padding:11px; border-radius:9px; cursor:pointer; font-size:13.5px;
    background:transparent; border:1px solid var(--line); color:var(--dim);
  }
  .alt:hover{color:var(--ink); border-color:rgba(255,255,255,.22)}
  .note{margin:18px 0 0; font-size:11.5px; color:#5D6B82; line-height:1.6; text-align:center}
  .note b{color:var(--dim); font-weight:600}
  .err{display:none; margin:0 0 14px; padding:10px 12px; border-radius:8px; font-size:12.5px;
    background:rgba(240,68,56,.12); border:1px solid rgba(240,68,56,.4); color:#FDA29B}
  .foot{position:absolute; bottom:22px; left:0; right:0; text-align:center; font-size:11.5px; color:#42506A; z-index:3}
  .foot a{color:#5D6B82; text-decoration:none} .foot a:hover{color:var(--dim)}
  @media (max-height:560px){ .brand,.foot{display:none} }
</style>
</head>
<body>
<div class="stage">
  <canvas id="globe" aria-hidden="true"></canvas>
  <div class="vignette"></div>

  <a class="brand" href="/">
    <span class="mark">
      <svg width="19" height="19" viewBox="0 0 32 32" fill="none"><path d="M16 6l7 3v7c0 4.6-3 8.3-7 10-4-1.7-7-5.4-7-10V9l7-3z" fill="#fff" fill-opacity=".18" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><path d="M12.4 16.2l2.6 2.6 4.8-5" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </span>
    <span><b>PassportIQ</b><span>AI copilot · passport verification</span></span>
  </a>

  <nav class="toplinks">
    <a href="/">Product overview</a>
    <a href="/mcp-tools">MCP tools</a>
  </nav>

  <form class="card" id="login-form" autocomplete="off">
    <p class="eyebrow">Restricted · officer workstation</p>
    <h1>Officer sign-in</h1>
    <p class="sub">Sign in to open the live verification console. Your name is stamped on every
       decision, chat instruction and audit row you create.</p>

    <p class="err" id="err"></p>

    <div class="field">
      <label for="f-name">Officer name</label>
      <input id="f-name" placeholder="e.g. Priya Nair" maxlength="60" required>
    </div>
    <div class="field">
      <label for="f-badge">Badge / employee ID</label>
      <input id="f-badge" placeholder="e.g. PVO-0417" maxlength="24" required>
    </div>
    <div class="field">
      <label for="f-role">Role</label>
      <select id="f-role">
        <option>Passport Verification Officer</option>
        <option>Senior Verification Officer</option>
        <option>Regional Supervisor</option>
        <option>Fraud Intelligence Analyst</option>
      </select>
    </div>

    <button class="btn" id="submit" type="submit">Sign in to the console</button>
    <button class="alt" id="guest" type="button">Continue as duty officer (demo)</button>

    <p class="note"><b>Demo environment.</b> Any name and badge are accepted — this session
       establishes <em>identity for accountability</em>, not authentication. Production deploys
       plug an IdP in front of this route.</p>
  </form>

  <p class="foot">PassportIQ · NitroStack MCP server · <a href="/console">console</a> · <a href="/api/console/health">health</a></p>
</div>

${earthGlobeScript('globe', { rpm: 0.5 })}

<script>
(function () {
  var form = document.getElementById('login-form');
  var err = document.getElementById('err');
  var btn = document.getElementById('submit');

  function fail(message) {
    err.textContent = message;
    err.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Sign in to the console';
  }

  async function signIn(officer) {
    btn.disabled = true;
    btn.textContent = 'Opening console…';
    err.style.display = 'none';
    try {
      var res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(officer)
      });
      var body = await res.json();
      if (!res.ok || !body.token) return fail(body.error || 'Sign-in failed — try again.');
      localStorage.setItem('piq.session', JSON.stringify({
        token: body.token,
        officer: body.officer,
        signedInAt: new Date().toISOString()
      }));
      location.href = '/console';
    } catch (e) {
      fail('Could not reach the server: ' + (e && e.message ? e.message : e));
    }
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var name = document.getElementById('f-name').value.trim();
    var badge = document.getElementById('f-badge').value.trim();
    var role = document.getElementById('f-role').value;
    if (!name) return fail('Enter your name — it is stamped on your decisions.');
    if (!badge) return fail('Enter your badge or employee ID.');
    signIn({ name: name, badgeId: badge, role: role });
  });

  document.getElementById('guest').addEventListener('click', function () {
    signIn({ name: 'Officer on duty', badgeId: 'PVO-DEMO', role: 'Passport Verification Officer' });
  });
})();
</script>
</body>
</html>
`;
