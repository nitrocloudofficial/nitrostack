"""
TrialSync AI+ design system.

One place for the visual language: color/type tokens, the global CSS
injection, and small HTML-rendering helpers for presentational elements
(headers, stat cards, badges, the confidence ring, timeline rows).

Interactive widgets (buttons, forms, sliders, chat, dataframes) stay as
native Streamlit calls everywhere else -- this module only themes them
and adds read-only visual pieces around them.
"""

import os
import textwrap
import streamlit as st

ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")

PAGE_ICON = os.path.join(ASSETS_DIR, "logo_icon.svg")

TONE_COLORS = {
    "teal":  {"fg": "#0B7A6F", "bg": "#E6F5F3", "border": "#BCE6E0"},
    "mint":  {"fg": "#15803D", "bg": "#E6F4EA", "border": "#BFE3CB"},
    "amber": {"fg": "#B4690E", "bg": "#FCF1DF", "border": "#F3DBAE"},
    "coral": {"fg": "#C23B3B", "bg": "#FBE8E8", "border": "#F1C6C6"},
    "ink":   {"fg": "#3D4E63", "bg": "#EEF1F5", "border": "#DDE3EA"},
}

# --------------------------------------------------------------------------
# Icon system -- inline, stroke-based line icons (no emoji anywhere in the
# product). Each entry is the inner markup of a 24x24 SVG; colors/size are
# applied by the caller so a single icon can be recolored per tone.
# --------------------------------------------------------------------------
ICONS = {
    "dashboard":    '<rect x="3" y="3" width="7" height="9" rx="1.2"/><rect x="14" y="3" width="7" height="5" rx="1.2"/><rect x="14" y="12" width="7" height="9" rx="1.2"/><rect x="3" y="16" width="7" height="5" rx="1.2"/>',
    "compass":      '<circle cx="12" cy="12" r="9"/><path d="M14.8 9.2l-2 5.6-5.6 2 2-5.6z"/>',
    "grid":         '<rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="7" height="7" rx="1.2"/>',
    "folder":       '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    "search":       '<circle cx="10.5" cy="10.5" r="6.5"/><line x1="20" y1="20" x2="15.3" y2="15.3"/>',
    "bot":          '<rect x="4" y="9" width="16" height="10" rx="2.2"/><path d="M12 9V5"/><circle cx="12" cy="4" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="14" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="14" r="1.1" fill="currentColor" stroke="none"/><path d="M2 12.5v3M22 12.5v3"/>',
    "activity":     '<path d="M2 12h4l2-7 4 14 3-9 2 4h5"/>',
    "alert":        '<path d="M12 3.5 21.5 20h-19z"/><line x1="12" y1="9.5" x2="12" y2="13.5"/><circle cx="12" cy="16.5" r="0.9" fill="currentColor" stroke="none"/>',
    "alert-octagon":'<polygon points="7.86,2 16.14,2 22,7.86 22,16.14 16.14,22 7.86,22 2,16.14 2,7.86"/><line x1="12" y1="8" x2="12" y2="13"/><circle cx="12" cy="16" r="0.9" fill="currentColor" stroke="none"/>',
    "plus":         '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    "file-text":    '<path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4"/><line x1="8.5" y1="12.5" x2="15.5" y2="12.5"/><line x1="8.5" y1="16" x2="15.5" y2="16"/>',
    "message":      '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.3 0-2.5-.28-3.6-.78L3 21l1.9-5.1A8.44 8.44 0 0 1 3.5 11.5 8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5z"/>',
    "bar-chart":    '<line x1="4" y1="20.5" x2="20" y2="20.5"/><rect x="5" y="12" width="3.2" height="8.5"/><rect x="10.4" y="6.5" width="3.2" height="14"/><rect x="15.8" y="15.5" width="3.2" height="5"/>',
    "trending-up":  '<polyline points="3,17 9,11 13,15 21,6"/><polyline points="15,6 21,6 21,12"/>',
    "target":       '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.2"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
    "clipboard":    '<rect x="5" y="4" width="14" height="17" rx="2"/><rect x="9" y="2.3" width="6" height="3.4" rx="1"/><line x1="8" y1="11.5" x2="16" y2="11.5"/><line x1="8" y1="15.5" x2="16" y2="15.5"/>',
    "download":     '<path d="M12 3v12"/><polyline points="7,10 12,15 17,10"/><path d="M4 19h16"/>',
    "upload":       '<path d="M12 21V9"/><polyline points="7,14 12,9 17,14"/><path d="M4 5h16"/>',
    "id-card":      '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="12" r="2"/><line x1="13.5" y1="10.3" x2="18" y2="10.3"/><line x1="13.5" y1="13.5" x2="18" y2="13.5"/><path d="M5.3 16.7c.6-1.6 1.8-2.5 3.2-2.5s2.6.9 3.2 2.5"/>',
    "dna":          '<path d="M6 3c0 5 12 4 12 9M6 12c0 5 12 4 12 9"/><path d="M7 6.2h10M6.4 9.2h11.2M6.4 14.8h11.2M7 17.8h10"/>',
    "pill":         '<rect x="3.3" y="9.3" width="17.4" height="6.6" rx="3.3" transform="rotate(-45 12 12)"/><line x1="12" y1="7.6" x2="12" y2="16.4" transform="rotate(-45 12 12)"/>',
    "scale":        '<line x1="12" y1="3" x2="12" y2="21"/><line x1="5.5" y1="7" x2="18.5" y2="7"/><path d="M5.5 7l-3 6a3 3 0 0 0 6 0z"/><path d="M18.5 7l-3 6a3 3 0 0 0 6 0z"/><line x1="8.5" y1="21" x2="15.5" y2="21"/>',
    "check-circle": '<circle cx="12" cy="12" r="9"/><polyline points="8,12.3 10.8,15.2 16,9.3"/>',
    "x-circle":     '<circle cx="12" cy="12" r="9"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>',
    "check":        '<polyline points="5,12.5 9.5,17 19,7"/>',
    "award":        '<circle cx="12" cy="8.5" r="5.5"/><path d="M8.7 13.3 7.2 20l4.8-2.6 4.8 2.6-1.5-6.7"/>',
    "list":         '<line x1="9.5" y1="6" x2="20" y2="6"/><line x1="9.5" y1="12" x2="20" y2="12"/><line x1="9.5" y1="18" x2="20" y2="18"/><circle cx="4.5" cy="6" r="1.1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1.1" fill="currentColor" stroke="none"/>',
    "map":          '<polygon points="3,6 9,3.3 15,6 21,3.3 21,17.7 15,20.7 9,17.7 3,20.7"/><line x1="9" y1="3.3" x2="9" y2="17.7"/><line x1="15" y1="6" x2="15" y2="20.7"/>',
    "calendar":     '<rect x="3.5" y="5" width="17" height="16" rx="2"/><line x1="3.5" y1="10" x2="20.5" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/>',
    "sliders":      '<line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2" fill="var(--surface)"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="16" cy="12" r="2" fill="var(--surface)"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="11" cy="18" r="2" fill="var(--surface)"/>',
    "flask":        '<path d="M9.5 3h5M10 3v6.2l-5.4 9.3A2 2 0 0 0 6.4 21h11.2a2 2 0 0 0 1.8-2.9L14 9.2V3"/><line x1="8.3" y1="15" x2="15.7" y2="15"/>',
    "arrow-right":  '<line x1="4" y1="12" x2="19" y2="12"/><polyline points="13,6 19,12 13,18"/>',
    "users":        '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6"/><circle cx="17.5" cy="9" r="2.6"/><path d="M15.8 14.2c2.6.4 4.2 2.4 4.2 5.8"/>',
    "shield-check": '<path d="M12 3 4.5 6v6c0 4.6 3.2 7.9 7.5 9 4.3-1.1 7.5-4.4 7.5-9V6z"/><polyline points="8.5,12.3 11,14.8 15.6,9.7"/>',
}


def icon(name: str, size: int = 18, color: str = "currentColor", stroke: float = 1.8) -> str:
    """Return an inline <svg> for the given icon key (see ICONS)."""
    inner = ICONS.get(name, ICONS["dashboard"])
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" '
        f'viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="{stroke}" '
        f'stroke-linecap="round" stroke-linejoin="round" '
        f'style="display:inline-block;vertical-align:middle;flex:none;">{inner}</svg>'
    )


def set_page(title: str, layout: str = "wide"):
    """Standard page config, identical across every page."""
    st.set_page_config(page_title=f"{title} · TrialSync AI+", page_icon=PAGE_ICON, layout=layout)
    try:
        st.logo(os.path.join(ASSETS_DIR, "logo_full.svg"), icon_image=os.path.join(ASSETS_DIR, "logo_icon.svg"))
    except Exception:
        pass
    inject_theme()


def inject_theme():
    st.markdown(
        textwrap.dedent(
            """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');

    :root{
        --ink:#0A1628; --ink-soft:#3D4E63; --paper:#F5F7FA; --surface:#FFFFFF;
        --line:#E3E8EE; --teal:#0D9488; --teal-deep:#0B7A6F; --teal-soft:#E6F5F3;
        --amber:#C9821A; --coral:#D64545; --mint:#15803D;
    }

    html, body, [class*="css"]{ font-family:'Inter', sans-serif; }
    .stApp{ background:var(--paper); color:var(--ink); }

    h1, h2, h3, h4, .ts-display{
        font-family:'Space Grotesk', sans-serif !important;
        color:var(--ink) !important;
        letter-spacing:-0.01em;
    }
    code, .ts-mono{ font-family:'JetBrains Mono', monospace !important; }

    /* ---------- sidebar ---------- */
    section[data-testid="stSidebar"]{
        background:var(--ink);
        border-right:1px solid #16243A;
    }
    section[data-testid="stSidebar"] *{ color:#C7D2DD !important; }
    section[data-testid="stSidebar"] a{
        border-radius:8px !important;
        font-weight:500;
        transition:background .15s ease;
    }
    section[data-testid="stSidebar"] a:hover{ background:#132133 !important; }
    section[data-testid="stSidebar"] [aria-current="page"]{
        background:#0F2E2A !important;
        color:#5EEAD4 !important;
        border-left:2px solid var(--teal);
    }
    section[data-testid="stSidebar"] [aria-current="page"] *{ color:#5EEAD4 !important; font-weight:600; }
    section[data-testid="stSidebar"] hr{ border-color:#1B2B41; }

    /* ---------- headings / hr ---------- */
    hr{ border-color:var(--line) !important; }

    /* ---------- buttons ---------- */
    .stButton>button, .stDownloadButton>button, .stFormSubmitButton>button{
        border-radius:8px;
        border:1px solid var(--line);
        font-weight:600;
        transition:transform .1s ease, box-shadow .15s ease, border-color .15s ease;
        background:var(--surface);
        color:var(--ink);
    }
    .stButton>button:hover, .stDownloadButton>button:hover, .stFormSubmitButton>button:hover{
        border-color:var(--teal);
        color:var(--teal-deep);
        transform:translateY(-1px);
        box-shadow:0 4px 10px rgba(13,148,136,.14);
    }
    .stButton>button[kind="primary"], .stFormSubmitButton>button[kind="primary"]{
        background:var(--teal); border-color:var(--teal); color:#fff;
    }
    .stButton>button[kind="primary"]:hover{ background:var(--teal-deep); color:#fff; }

    /* ---------- containers used as cards ---------- */
    div[data-testid="stVerticalBlockBorderWrapper"]{
        border-radius:12px !important;
        border:1px solid var(--line) !important;
        background:var(--surface);
        transition:box-shadow .15s ease, transform .15s ease;
    }
    div[data-testid="stVerticalBlockBorderWrapper"]:hover{
        box-shadow:0 6px 18px rgba(10,22,40,.06);
    }

    /* ---------- metrics ---------- */
    div[data-testid="stMetric"]{
        background:var(--surface);
        border:1px solid var(--line);
        border-radius:12px;
        padding:14px 16px;
    }
    [data-testid="stMetricLabel"]{ color:var(--ink-soft) !important; font-weight:600; }
    [data-testid="stMetricValue"]{ font-family:'Space Grotesk', sans-serif; color:var(--ink); }

    /* ---------- inputs ---------- */
    .stTextInput input, .stTextArea textarea, .stSelectbox div[data-baseweb="select"]>div,
    .stDateInput input, .stNumberInput input{
        border-radius:8px !important;
        border-color:var(--line) !important;
    }
    .stTextInput input:focus, .stTextArea textarea:focus{
        border-color:var(--teal) !important;
        box-shadow:0 0 0 1px var(--teal) !important;
    }

    /* ---------- progress ---------- */
    div[data-testid="stProgress"] div[role="progressbar"] > div{ background:var(--teal) !important; }

    /* ---------- expander ---------- */
    div[data-testid="stExpander"]{
        border:1px solid var(--line) !important;
        border-radius:10px !important;
        background:var(--surface);
    }

    /* ---------- chat ---------- */
    div[data-testid="stChatMessage"]{
        border:1px solid var(--line);
        border-radius:12px;
        background:var(--surface);
    }

    /* ---------- dataframe / table ---------- */
    div[data-testid="stDataFrame"], div[data-testid="stTable"]{
        border:1px solid var(--line);
        border-radius:10px;
        overflow:hidden;
    }

    /* ---------- tags / footer ---------- */
    footer, #MainMenu{ visibility:hidden; }

    /* ================= custom components ================= */
    .ts-eyebrow{
        font-family:'JetBrains Mono', monospace;
        font-size:.72rem; font-weight:600; letter-spacing:.12em; text-transform:uppercase;
        color:var(--teal-deep); margin-bottom:4px;
    }
    .ts-header{ margin-bottom:1.1rem; display:flex; align-items:flex-start; gap:14px; }
    .ts-header h1{ font-size:1.9rem; margin:0 0 2px 0; line-height:1.2; }
    .ts-header p{ color:var(--ink-soft); margin:0; font-size:1rem; }
    .ts-icon-badge{
        width:44px; height:44px; border-radius:12px; flex:none;
        background:linear-gradient(150deg, var(--teal) 0%, var(--teal-deep) 100%);
        color:#fff; display:flex; align-items:center; justify-content:center;
        box-shadow:0 4px 12px rgba(11,122,111,.28);
        margin-top:2px;
    }
    .ts-icon-badge.on-dark{ background:rgba(94,234,212,.14); box-shadow:none; color:#5EEAD4; border:1px solid rgba(94,234,212,.35); }
    .ts-icon-badge.soft{ background:var(--teal-soft); color:var(--teal-deep); box-shadow:none; }

    .ts-hero{
        background:linear-gradient(135deg, #0A1628 0%, #0E2A3D 60%, #0B3B36 100%);
        border-radius:18px;
        padding:38px 40px;
        color:#EAF1F6;
        position:relative;
        overflow:hidden;
        margin-bottom:1.4rem;
    }
    .ts-hero:before{
        content:"";
        position:absolute; inset:0;
        background-image:radial-gradient(circle at 1.5px 1.5px, rgba(94,234,212,.18) 1.2px, transparent 0);
        background-size:22px 22px;
        opacity:.5;
    }
    .ts-hero .ts-eyebrow{ color:#5EEAD4; }
    .ts-hero-top{ display:flex; align-items:center; gap:14px; position:relative; }
    .ts-hero h1{ color:#fff !important; font-size:2.15rem; margin:2px 0 10px 0; position:relative; }
    .ts-hero p{ color:#B9C7D3; max-width:640px; font-size:1.02rem; line-height:1.55; position:relative; }

    .ts-grid{ display:grid; grid-template-columns:repeat(auto-fit, minmax(190px,1fr)); gap:14px; margin:8px 0 4px 0; }
    .ts-card{
        background:var(--surface); border:1px solid var(--line); border-radius:12px;
        padding:16px 18px; transition:box-shadow .15s ease, transform .15s ease;
    }
    .ts-card:hover{ box-shadow:0 6px 18px rgba(10,22,40,.07); transform:translateY(-1px); }
    .ts-card .ts-card-top{ display:flex; align-items:center; justify-content:space-between; }
    .ts-card .ts-label{ font-size:.78rem; font-weight:600; color:var(--ink-soft); text-transform:uppercase; letter-spacing:.04em; }
    .ts-card .ts-value{ font-family:'Space Grotesk', sans-serif; font-size:1.7rem; font-weight:700; color:var(--ink); margin-top:4px; }
    .ts-card .ts-delta{ font-size:.82rem; font-weight:600; margin-top:4px; display:flex; align-items:center; gap:4px; }
    .ts-card .ts-delta.up{ color:var(--mint); } .ts-card .ts-delta.down{ color:var(--coral); }
    .ts-card .ts-kpi-icon{
        width:30px; height:30px; border-radius:8px; background:var(--teal-soft); color:var(--teal-deep);
        display:flex; align-items:center; justify-content:center; flex:none;
    }

    .ts-badge{
        display:inline-flex; align-items:center; gap:5px; padding:3px 10px;
        border-radius:999px; font-size:.78rem; font-weight:600; border:1px solid transparent;
    }

    .ts-status-pill{
        display:inline-flex; align-items:center; gap:10px; padding:10px 16px;
        border-radius:10px; background:var(--surface); border:1px solid var(--line);
        font-size:.92rem; color:var(--ink-soft);
    }
    .ts-status-dot{ width:9px; height:9px; border-radius:50%; flex:none; background:var(--mint); box-shadow:0 0 0 4px rgba(21,128,61,.15); }
    .ts-status-dot.busy{ background:var(--amber); box-shadow:0 0 0 4px rgba(201,130,26,.15); }
    .ts-status-dot.off{ background:var(--coral); box-shadow:0 0 0 4px rgba(214,69,69,.15); }

    .ts-ring{ display:flex; align-items:center; gap:18px; }
    .ts-ring-viz{
        width:112px; height:112px; border-radius:50%; flex:none;
        display:flex; align-items:center; justify-content:center;
        background:conic-gradient(var(--ring-color,var(--teal)) calc(var(--pct,0)*1%), #E9EEF3 0);
    }
    .ts-ring-viz .ts-ring-inner{
        width:84px; height:84px; border-radius:50%; background:var(--surface);
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        border:1px solid var(--line);
    }
    .ts-ring-inner b{ font-family:'Space Grotesk', sans-serif; font-size:1.35rem; color:var(--ink); }
    .ts-ring-inner span{ font-size:.66rem; color:var(--ink-soft); font-weight:600; }
    .ts-ring-caption b{ font-family:'Space Grotesk', sans-serif; font-size:1.05rem; color:var(--ink); display:block; }
    .ts-ring-caption span{ color:var(--ink-soft); font-size:.9rem; }

    .ts-step{ display:flex; gap:14px; align-items:flex-start; padding:2px 0; }
    .ts-step .ts-dot{
        width:30px; height:30px; border-radius:50%; flex:none;
        display:flex; align-items:center; justify-content:center;
        font-family:'JetBrains Mono', monospace; font-size:.78rem; font-weight:700;
        border:2px solid var(--line); color:var(--ink-soft); background:var(--surface);
        line-height:1;
    }
    .ts-step.done .ts-dot{ background:var(--mint); border-color:var(--mint); color:#fff; }
    .ts-step.active .ts-dot{ background:var(--teal); border-color:var(--teal); color:#fff; box-shadow:0 0 0 4px var(--teal-soft); }
    .ts-step .ts-line{ width:2px; flex:1; background:var(--line); margin:2px 0 2px 14px; }
    .ts-step.done + .ts-connector{ background:var(--mint); }
    .ts-step-title{ font-weight:600; color:var(--ink); }
    .ts-step-meta{ color:var(--ink-soft); font-size:.85rem; }

    .ts-section-title{
        font-family:'Space Grotesk', sans-serif; font-weight:600; font-size:1.05rem;
        color:var(--ink); margin:6px 0 10px 0; display:flex; align-items:center; gap:8px;
    }
    </style>
    """
        ).strip(),
        unsafe_allow_html=True,
    )


def page_header(icon_name: str, title: str, subtitle: str = "", eyebrow: str = ""):
    eyebrow_html = f'<div class="ts-eyebrow">{eyebrow}</div>' if eyebrow else ""
    st.markdown(
        textwrap.dedent(
            f"""
        <div class="ts-header">
            <div class="ts-icon-badge">{icon(icon_name, size=22, color="#fff")}</div>
            <div>
                {eyebrow_html}
                <h1>{title}</h1>
                <p>{subtitle}</p>
            </div>
        </div>
        """
        ).strip(),
        unsafe_allow_html=True,
    )


def hero(eyebrow: str, title: str, body: str, icon_name: str = "dna"):
    st.markdown(
        textwrap.dedent(
            f"""
        <div class="ts-hero">
            <div class="ts-hero-top">
                <div class="ts-icon-badge on-dark">{icon(icon_name, size=22)}</div>
                <div class="ts-eyebrow">{eyebrow}</div>
            </div>
            <h1>{title}</h1>
            <p>{body}</p>
        </div>
        """
        ).strip(),
        unsafe_allow_html=True,
    )


def stat_grid(items):
    """items: list of dicts {label, value, delta?, direction?('up'|'down'), sentiment?('good'|'bad'), icon?}
    direction controls the arrow glyph, sentiment controls the color."""
    cards = []
    for it in items:
        delta_html = ""
        if it.get("delta"):
            direction = it.get("direction", "up")
            sentiment = it.get("sentiment", "good")
            cls = "up" if sentiment == "good" else "down"
            arrow_name = "trending-up" if direction == "up" else "arrow-right"
            arrow_svg = icon(arrow_name, size=13, color="currentColor", stroke=2.2) if direction == "up" else \
                f'<span style="display:inline-block;transform:rotate(45deg) scaleY(-1);">{icon("trending-up", size=13, color="currentColor", stroke=2.2)}</span>'
            delta_html = f'<div class="ts-delta {cls}">{arrow_svg} {it["delta"]}</div>'
        icon_html = f'<div class="ts-kpi-icon">{icon(it["icon"], size=15, color="var(--teal-deep)")}</div>' if it.get("icon") else ""
        cards.append(
            f"""<div class="ts-card">
                    <div class="ts-card-top">
                        <div class="ts-label">{it['label']}</div>
                        {icon_html}
                    </div>
                    <div class="ts-value">{it['value']}</div>
                    {delta_html}
                </div>"""
        )
    st.markdown(f'<div class="ts-grid">{"".join(cards)}</div>', unsafe_allow_html=True)


def badge(text: str, tone: str = "teal", icon_name: str = None) -> str:
    c = TONE_COLORS.get(tone, TONE_COLORS["teal"])
    icon_html = icon(icon_name, size=12, color=c["fg"], stroke=2.4) if icon_name else ""
    return f'<span class="ts-badge" style="background:{c["bg"]};color:{c["fg"]};border-color:{c["border"]}">{icon_html}{text}</span>'

def badge_html(text: str, tone: str = "teal", icon_name: str = None):
    st.markdown(badge(text, tone, icon_name), unsafe_allow_html=True)


def status_pill(label: str, state: str = "ok"):
    """state in {'ok','busy','off'} -- a small colored-dot status readout, no emoji."""
    dot_cls = {"ok": "", "busy": "busy", "off": "off"}.get(state, "")
    st.markdown(
        f'<div class="ts-status-pill"><span class="ts-status-dot {dot_cls}"></span>{label}</div>',
        unsafe_allow_html=True,
    )


def confidence_ring(percent: float, big_label: str, caption_title: str, caption_body: str, color: str = "var(--teal)"):
    pct = max(0, min(100, round(percent)))
    st.markdown(
        textwrap.dedent(
            f"""
        <div class="ts-ring">
            <div class="ts-ring-viz" style="--pct:{pct};--ring-color:{color};">
                <div class="ts-ring-inner"><b>{pct}%</b><span>{big_label}</span></div>
            </div>
            <div class="ts-ring-caption"><b>{caption_title}</b><span>{caption_body}</span></div>
        </div>
        """
        ).strip(),
        unsafe_allow_html=True,
    )


def section_title(icon_name: str, text: str):
    st.markdown(
        f'<div class="ts-section-title">{icon(icon_name, size=17, color="var(--teal-deep)")} {text}</div>',
        unsafe_allow_html=True,
    )


def journey_step(index: int, title: str, meta: str, status: str):
    """status in {'Complete','In Progress','Pending'}"""
    cls = "done" if status == "Complete" else ("active" if status == "In Progress" else "")
    dot_content = icon("check", size=14, color="#fff", stroke=2.6) if status == "Complete" else f"{index:02d}"
    st.markdown(
        textwrap.dedent(
            f"""
        <div class="ts-step {cls}">
            <div class="ts-dot">{dot_content}</div>
            <div>
                <div class="ts-step-title">{title}</div>
                <div class="ts-step-meta">{meta} &nbsp;·&nbsp; {status}</div>
            </div>
        </div>
        """
        ).strip(),
        unsafe_allow_html=True,
    )
