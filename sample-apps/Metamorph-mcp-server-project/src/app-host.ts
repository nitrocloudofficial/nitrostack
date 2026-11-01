// GET /app : a browser host for the MCP tools and the real score-dashboard widget. It is only a host: the widget HTML
// comes from the MCP resource ui://widget/next-score-dashboard.html (resources/read over POST /mcp) and runs in a
// sandboxed iframe (no allow-same-origin). The key lives in one JS variable in this tab and is sent only to /mcp.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOGO_D64 } from './landing-logo.js';
import { TOOLS, escapeHtml } from './landing.js';

export const START_REPO = 'https://github.com/dhilipa01/metamorph-demo-legacy';
export const START_SUB = 'php-shop';
export const BANNER = 'Public dashboard: assess, plan, preview and projected apply on public GitHub repositories. Nothing is changed in any repository. Rate limited.';
export const WIDGET_URI = 'ui://widget/next-score-dashboard.html';

// ---- pure host logic. Kept as source text so the browser runs exactly what the unit tests run. ----
export const LOGIC = `
function parseRpc(text){
  if(typeof text!=='string')return null;
  var t=text.trim();
  if(!t)return null;
  if(t.charAt(0)==='{'){try{return JSON.parse(t)}catch(e){return null}}
  var out=null,lines=t.split(/\\r?\\n/);
  for(var i=0;i<lines.length;i++){
    var l=lines[i];
    if(l.indexOf('data:')!==0)continue;
    try{var o=JSON.parse(l.slice(5).trim());if(o&&typeof o==='object'&&('result' in o||'error' in o))out=o}catch(e){}
  }
  return out;
}
function allowedExternal(url,origin){
  if(typeof url!=='string'||url.length>2000)return false;
  var u;try{u=new URL(url,origin)}catch(e){return false}
  if(u.username||u.password)return false;
  if(u.origin===origin)return u.pathname.indexOf('/reports/')===0;
  return u.protocol==='https:';
}
function callPolicy(name,from,canWrite,tools){
  if(typeof name!=='string'||!Object.prototype.hasOwnProperty.call(tools,name))return{ok:false,error:'Unknown tool.'};
  if(tools[name]==='write'){
    if(from!=='host')return{ok:false,error:'The widget may not run tools that need write scope. Use the host button.'};
    if(!canWrite)return{ok:false,error:'This tool needs write scope. Ask the owner for a key with write scope.'};
  }
  return{ok:true};
}
function cleanArgs(a){
  if(!a||typeof a!=='object'||Array.isArray(a))return{};
  var o={};
  for(var k in a){if(Object.prototype.hasOwnProperty.call(a,k)&&/^[a-z_]{1,40}$/.test(k)){var v=a[k];if(typeof v==='string'||typeof v==='boolean'||typeof v==='number')o[k]=v}}
  return o;
}
function decide(ev,ctx){
  if(!ev||!ctx.frameWindow||ev.source!==ctx.frameWindow)return{act:'ignore'};
  var d=ev.data;
  if(!d||typeof d!=='object'||d.src!=='mm-widget')return{act:'ignore'};
  switch(d.t){
    case'ready':return{act:'ready'};
    case'theme':return{act:'theme'};
    case'fullscreen':return{act:'fullscreen'};
    case'openExternal':return allowedExternal(d.url,ctx.origin)?{act:'open',url:new URL(d.url,ctx.origin).href}:{act:'ignore'};
    case'callTool':{
      var id=typeof d.id==='number'?d.id:0;
      var p=callPolicy(d.name,'widget',ctx.canWrite,ctx.tools);
      if(!p.ok)return{act:'deny',id:id,error:p.error};
      return{act:'call',id:id,name:d.name,args:cleanArgs(d.args)};
    }
  }
  return{act:'ignore'};
}
`;

// Runs inside the iframe: the window.openai surface the widget expects (same shape as scripts/widget_shots.py), with
// callTool/openExternal/requestDisplayMode forwarded to the host by postMessage.
export const SHIM = `(function(){var p=window.parent,n=0,pend={};var o=window.openai={toolOutput:null,theme:'light',displayMode:'fullscreen',locale:'en',maxHeight:null,callTool:function(name,args){return new Promise(function(res,rej){var id=++n;pend[id]=[res,rej];p.postMessage({src:'mm-widget',t:'callTool',id:id,name:name,args:args||{}},'*')})},openExternal:function(a){p.postMessage({src:'mm-widget',t:'openExternal',url:a&&a.href},'*')},requestDisplayMode:function(){p.postMessage({src:'mm-widget',t:'fullscreen'},'*');return Promise.resolve()},requestClose:function(){},setWidgetState:function(){return Promise.resolve()},sendFollowUpMessage:function(){return Promise.resolve()}};window.addEventListener('message',function(e){if(e.source!==p)return;var d=e.data;if(!d||typeof d!=='object')return;if(d.type==='NITRO_INJECT_OPENAI'&&d.data){for(var k in d.data)o[k]=d.data[k];window.dispatchEvent(new CustomEvent('openai:set_globals',{detail:{globals:d.data}}))}else if(d.type==='mm-result'){var q=pend[d.id];delete pend[d.id];if(q){if(d.error)q[1](new Error(d.error));else q[0](d.result)}}});window.dispatchEvent(new Event('openai:ready'));p.postMessage({src:'mm-widget',t:'ready'},'*')})();`;

const toolScopes = Object.fromEntries(TOOLS.map((t) => [t.name, t.scope]));

const CSS = `
:root{--bg:#D5DAD0;--card:#EFE7D6;--ink:#1B1D19;--mute:#555A50;--accent:#6B1F2A;--onacc:#EFE7D6;--line:#1B1D1933;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#151614;--card:#1A211C;--ink:#ECE9DF;--mute:#A9AFA2;--accent:#D1344A;--onacc:#151614;--line:#ECE9DF33;color-scheme:dark}}
:root[data-theme=dark]{--bg:#151614;--card:#1A211C;--ink:#ECE9DF;--mute:#A9AFA2;--accent:#D1344A;--onacc:#151614;--line:#ECE9DF33;color-scheme:dark}
*{box-sizing:border-box}
html,body{height:100%}
body{--sw:320px;margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 "Helvetica Neue",Helvetica,Arial,"Liberation Sans",system-ui,sans-serif;display:grid;grid-template-columns:var(--sw) 1fr;grid-template-rows:auto 1fr auto}
body.rail{--sw:72px}
aside{grid-row:1/3;background:var(--card);padding:24px 24px 16px;overflow:auto;display:flex;flex-direction:column;gap:16px;border-right:1px solid var(--line);min-width:0}
.brand{display:flex;align-items:center;gap:12px}
.brand .bt{flex:1;min-width:0}
svg.logo{width:44px;height:44px;color:var(--accent);flex:none}
h1{font:700 26px/1 "Helvetica Neue",Helvetica,Arial,sans-serif;letter-spacing:-.02em;margin:0}
.sub{font-size:12px;color:var(--mute);margin:2px 0 0}
.f{margin-top:10px}
label{display:block;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);font-weight:700;margin-bottom:4px}
input,select{width:100%;font:inherit;font-size:14px;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:4px;padding:8px 10px}
input:focus,select:focus,button:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.note{font-size:12px;color:var(--mute);margin:4px 0 0}
button{font:inherit;font-size:14px;color:var(--ink);background:none;border:1px solid var(--line);border-radius:4px;padding:8px 12px;cursor:pointer}
button:disabled{opacity:.45;cursor:not-allowed}
button.primary{background:var(--accent);color:var(--onacc);border-color:var(--accent);font-weight:700;width:100%;padding:10px 12px}
button.big{font-size:17px;padding:12px}
details{font-size:13px}summary{cursor:pointer;color:var(--accent)}
.about p{margin:6px 0 0;font-size:12px;color:var(--mute)}
button.link{border:0;padding:0;font-size:12px;color:var(--accent);text-decoration:underline}
button.ico{width:36px;height:36px;padding:0;flex:none;font-size:16px;line-height:1}
ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
li button{width:100%;min-height:40px;text-align:left;display:flex;gap:10px;align-items:baseline}
li .n{font-family:Georgia,"Times New Roman",serif;font-size:18px;width:18px;color:var(--accent)}
li.cur button{border-color:var(--accent);box-shadow:inset 3px 0 0 var(--accent);font-weight:700}
li.done .n{text-decoration:underline}
li .h{font-size:11px;color:var(--mute);margin-left:auto}
.bar{display:flex;gap:8px;align-items:center;justify-content:space-between}
.bar a{font-size:12px;color:var(--accent)}
.foot{margin-top:auto}
body.rail aside{padding:16px 0;align-items:center;overflow:hidden}
body.rail aside>:not(.brand):not(#flow){display:none}
body.rail .brand .bt,body.rail svg.logo{display:none}
body.rail #flow{align-items:center}
body.rail li button{width:44px;height:44px;padding:0;justify-content:center;align-items:center}
body.rail li .lbl,body.rail li .h{display:none}
body.rail li .n{width:auto}
#top{grid-column:2;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 24px;border-bottom:1px solid var(--line)}
#crumb{margin:0;font:700 17px/1.2 "Helvetica Neue",Helvetica,Arial,sans-serif}
#theme{min-height:40px}
main{position:relative;min-width:0;min-height:0}
iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:var(--bg)}
#empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--mute);text-align:center;padding:24px;font-size:17px}
#busy{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(128,128,128,.25);font-size:17px;font-weight:700}
#busy.on{display:flex}
#status{grid-column:1/3;padding:8px 24px;border-top:1px solid var(--line);background:var(--card);font-size:13px;min-height:36px}
#status.err{color:var(--accent);font-weight:700}
@media (max-height:780px){aside{gap:8px;padding:12px 24px}svg.logo{width:32px;height:32px}h1{font-size:22px}.sub{display:none}input,select{padding:5px 9px}.f{margin-top:6px}li button{min-height:34px;padding:4px 12px}ol{gap:4px}button.primary{padding:7px 12px}#top{padding:8px 24px}body.rail aside{padding:12px 0}body.rail li button{height:38px}}
@media (max-width:760px){body{grid-template-columns:1fr;grid-template-rows:auto auto 70vh auto}aside{grid-row:auto}#top{grid-column:1}#status{grid-column:1}button.ico{display:none}}
`.trim();

// The page script. Only DOM text (textContent) is ever written from server data.
const JS = `(function(){
${LOGIC}
var TOOLS=${JSON.stringify(toolScopes)};
var WIDGET=${JSON.stringify(WIDGET_URI)};
var SHIM=${JSON.stringify(SHIM)};
var origin=location.origin;
var pub0=document.body.getAttribute('data-pub')==='1';var key='';var sid='';var rid=0;var canWrite=pub0;var pending=null;var busy=false;var inited=false;
var last={};var done={};var STAGES=['assess','plan','preview','apply','verify','report'];var cur='assess';var themePref='auto';var railMem=false;
function isPub(){return pub0&&key.length<8}
var $=function(i){return document.getElementById(i)};
var root=document.documentElement,frame=null,main=$('main'),status=$('status');
var LABEL={assess:'Assess',plan:'Plan',preview:'Preview',apply:'Apply',verify:'Verify',report:'Report'};
var GH=/^https:\\/\\/github\\.com\\/[^\\/\\s]+\\/[^\\/\\s]+/;
function say(t,err){status.textContent=t;status.className=err?'err':''}
function dark(){var t=root.getAttribute('data-theme');return t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches}
function themeName(){return dark()?'dark':'light'}
function inputs(){return{repo:$('repo').value.trim(),sub:$('sub').value.trim(),goal:$('goal').value}}
function ready(){return(isPub()||key.length>=8)&&GH.test(inputs().repo)&&!busy}
function refresh(){
  var r=ready();
  $('run').disabled=!r;
  $('run').textContent='Run '+cur;
  STAGES.forEach(function(s){var li=$('s-'+s);li.className=(done[s]?'done ':'')+(s===cur?'cur':'');var b=li.firstChild;b.disabled=busy;if(s===cur)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current')});
  $('crumb').textContent=LABEL[cur];
  $('hint').textContent=(!isPub()&&key.length<8)?'Paste your API key to enable the buttons.':(GH.test(inputs().repo)?'':'Enter a public GitHub repository URL.');
}
function store(k,v){try{window.localStorage.setItem(k,v)}catch(e){}}
function recall(k){try{return window.localStorage.getItem(k)}catch(e){return null}}
function setRail(on,save){
  document.body.classList.toggle('rail',on);railMem=on;
  var c=$('collapse');c.setAttribute('aria-expanded',on?'false':'true');
  c.setAttribute('aria-label',on?'Expand sidebar':'Collapse sidebar');c.title=on?'Expand sidebar':'Collapse sidebar';
  c.textContent=on?'»':'«';
  if(save)store('mm-host-sidebar',on?'rail':'open');
}
function setTheme(p,save){
  themePref=p;
  if(p==='auto')root.removeAttribute('data-theme');else root.setAttribute('data-theme',p);
  var l=p==='auto'?'Auto':p==='light'?'Light':'Dark';
  $('theme').textContent='Theme: '+l;$('theme').setAttribute('aria-label','Theme: '+l+'. Click to change (Auto, Light, Dark)');
  send({type:'NITRO_INJECT_OPENAI',data:{theme:themeName()}});
  if(save)store('mm-host-theme',p);
}
function select(s){cur=s;try{history.replaceState(null,'','#'+s)}catch(e){}refresh()}
function post(body){
  var h={'Content-Type':'application/json','Accept':'application/json, text/event-stream'};
  var dm=isPub();
  if(!dm&&key)h['Authorization']='Bearer '+key;
  if(sid)h['mcp-session-id']=sid;
  return fetch(dm?'/app/rpc':'/mcp',{method:'POST',headers:h,body:JSON.stringify(body),credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'}).then(function(r){
    var s=r.headers.get('mcp-session-id');if(s)sid=s;
    return r.text().then(function(t){
      var o=parseRpc(t);
      if(!r.ok&&!o){var m=t.trim().slice(0,300);throw new Error(m||('HTTP '+r.status))}
      return o;
    });
  });
}
function rpc(method,params){
  return post({jsonrpc:'2.0',id:++rid,method:method,params:params||{}}).then(function(x){
    if(!x)throw new Error('Empty reply from the server.');
    if(x.error)throw new Error(String(x.error.message||'Request failed').slice(0,400));
    return x.result;
  });
}
function init(){
  if(inited)return Promise.resolve();
  return rpc('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'metamorph-browser-host',version:'1'}}).then(function(){
    inited=true;
    return post({jsonrpc:'2.0',method:'notifications/initialized'}).catch(function(){});
  });
}
function fullText(res){
  var c=res&&res.content;if(!Array.isArray(c))return'';
  return c.filter(function(x){return x&&x.type==='text'&&typeof x.text==='string'}).map(function(x){return x.text}).join(' ');
}
function textOf(res){return fullText(res).slice(0,400)}
function outputOf(res){
  if(res&&res.structuredContent)return res.structuredContent;
  try{return JSON.parse(fullText(res))}catch(e){return null}
}
function callTool(name,args,from){
  var p=callPolicy(name,from,canWrite,TOOLS);
  if(!p.ok)return Promise.reject(new Error(p.error));
  return init().then(function(){return rpc('tools/call',{name:name,arguments:args})}).then(function(res){
    if(res&&res.isError)throw new Error(textOf(res)||'The tool returned an error.');
    return res;
  });
}
function setBusy(on,msg){busy=on;$('busy').className=on?'on':'';if(msg)say(msg);refresh()}
function send(msg){if(frame&&frame.contentWindow)frame.contentWindow.postMessage(msg,'*')}
function inject(out){
  pending=out;
  send({type:'NITRO_INJECT_OPENAI',data:{toolOutput:out,theme:themeName()}});
}
function mount(){
  if(frame)return Promise.resolve();
  return init().then(function(){return rpc('resources/read',{uri:WIDGET})}).then(function(r){
    var c=r&&r.contents&&r.contents[0];var h=c&&typeof c.text==='string'?c.text:'';
    if(!h)throw new Error('The server returned no widget HTML.');
    var ce=$('wcss'),tag='<style>'+(ce?ce.textContent:'')+'.mm .tswitch,.mm .inline-tools{display:none!important}</style><script>'+SHIM+'<\\/script>';
    frame=document.createElement('iframe');
    frame.setAttribute('sandbox','allow-scripts');
    frame.setAttribute('title','Metamorph score dashboard');
    frame.srcdoc=h.indexOf('<head>')>=0?h.replace('<head>','<head>'+tag):tag+h;
    $('empty').style.display='none';
    main.insertBefore(frame,$('busy'));
  });
}
function firstStage(){return((last.plan&&last.plan.stages)||[]).filter(function(s){return s&&s.automated})[0]}
function base(){var i=inputs(),b={repo_url:i.repo};if(i.sub)b.subfolder=i.sub;return b}
function exec(tool,args,step){
  return callTool(tool,args,'host').then(function(res){var o=outputOf(res);last[step]=o;done[step]=true;return o});
}
function planP(){return exec('plan_modernization',Object.assign({goal:inputs().goal},base()),'plan')}
function withStage(){
  var p=firstStage()?Promise.resolve():(say('Running plan_modernization first ...'),planP());
  return p.then(function(){var st=firstStage();if(!st)throw new Error('The plan has no automated stage to preview.');return st});
}
// Every stage is independent: the tools take repo_url themselves. Preview and apply need a stage and an approval token,
// so they chain plan (if needed) then preview, then the stage tool, for the first automated stage.
function chain(step){
  var g=inputs().goal,b=base();
  if(step==='assess')return exec('assess_project',b,'assess');
  if(step==='plan')return planP();
  if(step==='report')return exec('generate_report',Object.assign({goal:g},b),'report');
  if(step==='verify'&&isPub())return Promise.reject(new Error('Verify needs your own key and the runner. Open "Use my own key".'));
  if((step==='apply'||step==='verify')&&!canWrite)return Promise.reject(new Error('This stage needs write scope. Ask the owner for a key with write scope.'));
  return withStage().then(function(st){
    say('Running preview_changes ...');
    return exec('preview_changes',Object.assign({goal:g,stage:st.id},b),'preview').then(function(pv){
      if(step==='preview')return pv;
      var tok=pv&&pv.approvalToken;
      if(!tok)throw new Error('The preview returned no approval token, so this server cannot apply or verify (the operator must set METAMORPH_TOKEN_SECRET).');
      var tool=step==='apply'?'apply_stage':'verify_patch';
      say('Running '+tool+' ...');
      return exec(tool,Object.assign({goal:g,stage:st.id,approval_token:tok},b),step);
    });
  });
}
var TOOLOF={assess:'assess_project',plan:'plan_modernization',preview:'preview_changes',apply:'apply_stage',verify:'verify_patch',report:'generate_report'};
function run(step){
  select(step);
  if(busy)return;
  if(!ready()){say(isPub()||key.length>=8?'Enter a public GitHub repository URL, then run '+LABEL[step]+'.':'Paste your API key, then run '+LABEL[step]+'.');return}
  setBusy(true,'Running '+TOOLOF[step]+' ...');
  return mount().then(function(){return chain(step)}).then(function(out){
    if(step==='assess'&&!canWrite&&!isPub())probe();
    inject(out);
    say('Done: '+TOOLOF[step]+(step==='apply'||step==='verify'?' (projected on a temporary copy; nothing in your repository changed).':'.'));
  }).catch(function(e){say(e.message||String(e),true)}).then(function(){setBusy(false)});
}
// A write-scope check without side effects: the scope guard answers before the tool validates its (empty) input.
function probe(){
  rpc('tools/call',{name:'apply_stage',arguments:{}}).then(function(res){
    canWrite=!/needs "write" scope/.test(textOf(res));refresh();
  }).catch(function(e){canWrite=!/write/.test(e.message);refresh()});
}
window.addEventListener('message',function(ev){
  var d=decide(ev,{frameWindow:frame&&frame.contentWindow,origin:origin,tools:TOOLS,canWrite:canWrite});
  switch(d.act){
    case'ready':send({type:'NITRO_INJECT_OPENAI',data:{theme:themeName(),toolOutput:pending}});break;
    case'theme':send({type:'NITRO_INJECT_OPENAI',data:{theme:themeName()}});break;
    case'fullscreen':if(main.requestFullscreen)main.requestFullscreen().catch(function(){});break;
    case'open':window.open(d.url,'_blank','noopener,noreferrer');break;
    case'deny':send({type:'mm-result',id:d.id,error:d.error});say(d.error,true);break;
    case'call':
      setBusy(true,'Running '+d.name+' ...');
      callTool(d.name,d.args,'widget').then(function(res){
        var out=outputOf(res);send({type:'mm-result',id:d.id,result:out});inject(out);
        if(d.name==='preview_changes'){last.preview=out;done.preview=true}
        if(d.name==='plan_modernization'){last.plan=out;done.plan=true}
        say('Done: '+d.name+'.');
      }).catch(function(e){send({type:'mm-result',id:d.id,error:e.message});say(e.message,true)}).then(function(){setBusy(false)});
  }
});
['repo','sub','goal'].forEach(function(i){$(i).addEventListener('input',function(){last={};done={};refresh()})});
$('key').addEventListener('input',function(){key=$('key').value;sid='';inited=false;canWrite=isPub();refresh()});
$('forget').addEventListener('click',function(){key='';sid='';inited=false;canWrite=pub0;$('key').value='';say(pub0?'Key forgotten. back to the public dashboard.':'Key forgotten.');refresh()});
STAGES.forEach(function(s){$('s-'+s).firstChild.addEventListener('click',function(){run(s)})});
$('form').addEventListener('submit',function(e){e.preventDefault();if(ready())run(cur)});
$('theme').addEventListener('click',function(){setTheme(themePref==='auto'?'light':themePref==='light'?'dark':'auto',true)});
$('collapse').addEventListener('click',function(){setRail(!railMem,true)});
window.addEventListener('hashchange',function(){var h=location.hash.slice(1);if(STAGES.indexOf(h)>=0&&h!==cur)run(h)});
var t0=recall('mm-host-theme');setTheme(t0==='light'||t0==='dark'?t0:'auto',false);
setRail(recall('mm-host-sidebar')==='rail'&&matchMedia('(min-width:761px)').matches,false);
var h0=location.hash.slice(1);
if(STAGES.indexOf(h0)>=0){cur=h0;refresh();if(ready())run(h0)}else refresh();
})();`;

const sha = (s: string) => `'sha256-${createHash('sha256').update(s).digest('base64')}'`;

// The widget is served by the SDK from the same bundled file (resources/read). The iframe inherits this page's CSP, so
// the CSP must allow that file's inline scripts: hash them from the file the SDK reads. Styles use 'unsafe-inline':
// the widget injects its CSS at runtime (React), which no fixed hash can cover; scripts stay hash-only.
export function widgetHashes(cwd: string = process.cwd()): { script: string[]; style: string[] } {
  const file = ['src/widgets/out', 'dist/widgets/out', 'widgets/out'].map((d) => join(cwd, d, 'score-dashboard.html')).find((p) => existsSync(p));
  if (!file) return { script: [], style: [] };
  const html = readFileSync(file, 'utf-8');
  const grab = (tag: string) => [...html.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => m[1]).filter((s) => s.length > 0);
  return { script: grab('script').map(sha), style: grab('style').map(sha) };
}

export function appCsp(cwd?: string): string {
  const w = widgetHashes(cwd);
  const script = [sha(JS), sha(SHIM), ...w.script].join(' ');
  return `default-src 'none'; style-src 'unsafe-inline'; script-src ${script}; connect-src 'self'; frame-src 'self' blob:; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`;
}

export { CSS as APP_CSS, JS as APP_JS };

// The bundled widget page (what resources/read returns) has no stylesheet: the build writes it next to the HTML as
// score-dashboard.css. The host embeds that file as inert data and adds it to the iframe document.
export function widgetCss(cwd: string = process.cwd()): string {
  const file = ['src/widgets/out', 'dist/widgets/out', 'widgets/out'].map((d) => join(cwd, d, 'score-dashboard.css')).find((p) => existsSync(p));
  return file ? readFileSync(file, 'utf-8').replace(/<\//g, '<\\/') : '';
}

export function renderApp(opts: { pub?: boolean } = {}): string {
  const pub = opts.pub !== false;
  const e = escapeHtml;
  const step = (id: string, n: number, label: string, hint = '') => `<li id="s-${id}"><button type="button" title="${e(label)}" aria-label="${e(label)}"><span class="n">${n}</span><span class="lbl">${e(label)}</span><span class="h">${e(hint)}</span></button></li>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Metamorph dashboard</title>
<meta name="referrer" content="no-referrer">
<style>${CSS}</style></head>
<body data-pub="${pub ? 1 : 0}">
<aside id="side">
<div class="brand"><svg class="logo" viewBox="0 0 64 64" shape-rendering="crispEdges" fill="currentColor" role="img" aria-label="Metamorph logo"><path d="${LOGO_D64}"/></svg><div class="bt"><h1>Metamorph</h1><p class="sub">Browser dashboard</p></div><button type="button" id="collapse" class="ico" aria-controls="side" aria-expanded="true" aria-label="Collapse sidebar" title="Collapse sidebar">&laquo;</button></div>
${pub ? '<details class="about"><summary>About the public dashboard</summary><p>' + e(BANNER) + '</p></details><p class="note">Rate limited.</p>' : ''}
<form id="form" autocomplete="off">
<div><label for="repo">Repository URL</label><input id="repo" type="url" placeholder="https://github.com/owner/repo" spellcheck="false"${pub ? ' value="' + e(START_REPO) + '"' : ''}></div>
<div class="f"><label for="sub">Subfolder (optional)</label><input id="sub" type="text" placeholder="apps/api" spellcheck="false"${pub ? ' value="' + e(START_SUB) + '"' : ''}></div>
<div class="f"><label for="goal">Goal</label><select id="goal"><option value="modernize_all">modernize_all</option><option value="patch_advisory">patch_advisory</option><option value="upgrade_runtime">upgrade_runtime</option></select></div>
<div class="f"><button type="submit" id="run" class="primary big" disabled>Run assess</button><p id="hint" class="note"></p></div>
</form>
<ol id="flow" aria-label="Stages">
${step('assess', 1, 'Assess')}${step('plan', 2, 'Plan')}${step('preview', 3, 'Preview')}${step('apply', 4, 'Apply', pub ? 'projected' : 'write scope')}${step('verify', 5, 'Verify', pub ? 'own key + runner' : 'write scope')}${step('report', 6, 'Report')}
</ol>
<details id="own"${pub ? '' : ' open'}><summary>Use my own key</summary>
<div class="f"><label for="key">API key</label><input id="key" type="password" autocomplete="off" spellcheck="false" placeholder="Bearer key"><p class="note">Your key stays in this tab and is sent only to this server.</p>
<div class="bar"><span></span><button type="button" id="forget" class="link">Forget key</button></div></div>
</details>
<div class="bar foot"><a href="/">Back to overview</a></div>
</aside>
<header id="top"><h2 id="crumb">Assess</h2><button type="button" id="theme" aria-label="Theme: Auto. Click to change (Auto, Light, Dark)">Theme: Auto</button></header>
<main id="main"><div id="empty">Pick a stage to see the dashboard</div><div id="busy">Working...</div></main>
<div id="status" role="status" aria-live="polite">Ready.</div>
<script type="text/plain" id="wcss">${widgetCss()}</script>
<script>${JS}</script></body></html>`;
}

interface Res {
  status(code: number): Res;
  setHeader(name: string, value: string): unknown;
  send(body: string): unknown;
}
export function handleApp(_req: unknown, res: Res, pub = true): void {
  res.status(200);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', appCsp());
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store');
  res.send(renderApp({ pub }));
}

export interface AppHostApp {
  get(path: string, handler: (req: never, res: never) => void): unknown;
}
export function installAppHost(app: AppHostApp, opts: { pub?: boolean } = {}): void {
  app.get('/app', ((req: unknown, res: Res) => handleApp(req, res, opts.pub !== false)) as (req: never, res: never) => void);
}
