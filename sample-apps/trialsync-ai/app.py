import streamlit as st
from utils import ui, auth

ui.set_page("Welcome")

if not auth.is_logged_in():
    auth.login_signup_gate()

auth.render_sidebar_account()
user = auth.current_user()
is_doctor = user["role"] == "doctor"

if is_doctor:
    ui.hero(
        eyebrow="Multi-agent clinical trial copilot",
        title=f"Welcome back, {user['name']}",
        body="Review any patient in your roster, screen eligibility with the agent pipeline, "
             "and follow each patient from match to enrollment to first dose &mdash; with every "
             "step tracked in one place.",
        icon_name="dna",
    )
else:
    ui.hero(
        eyebrow="Your clinical trial copilot",
        title=f"Welcome, {user['name']}",
        body="Here's where your care team is tracking your trial matches, appointments, "
             "and side effects. Everything below reflects your own profile only.",
        icon_name="dna",
    )

st.markdown("")
ui.section_title("compass", "Where to start")

if is_doctor:
    cols = st.columns(3)
    steps = [
        ("users", "Patient roster", "See every patient, and switch who you're working with.", "pages/0_Patient_Profile.py"),
        ("folder", "Onboard a patient", "Upload a record or paste clinical notes and let the agent extract a structured profile.", "pages/2_Patient_Upload.py"),
        ("bot", "Ask the copilot", "Get protocol answers and cohort-level guidance in plain language.", "pages/11_Doctor_Copilot.py"),
    ]
else:
    cols = st.columns(3)
    steps = [
        ("id-card", "My profile", "View your profile. Your name is locked to your account and can't be edited.", "pages/0_Patient_Profile.py"),
        ("search", "My trial matches", "See studies matched to your condition and location.", "pages/4_Trial_Discovery.py"),
        ("calendar", "My appointments", "See upcoming visits and log side effects.", "pages/8_Appointment_Scheduler.py"),
    ]

for col, (icon_name, title, body, target) in zip(cols, steps):
    with col:
        with st.container(border=True):
            st.markdown(f'<div style="display:flex;align-items:center;gap:10px;margin-bottom:2px;">'
                        f'<div class="ts-icon-badge soft" style="width:34px;height:34px;border-radius:9px;">{ui.icon(icon_name, size=17, color="var(--teal-deep)")}</div>'
                        f'<span style="font-weight:600;font-family:\'Space Grotesk\',sans-serif;font-size:1.02rem;color:var(--ink);">{title}</span></div>',
                        unsafe_allow_html=True)
            st.caption(body)
            if st.button("Open", key=f"home_{target}", use_container_width=True):
                st.switch_page(target)

st.markdown("")
ui.section_title("grid", "Full navigation")
st.caption("Everything below is also available anytime from the sidebar, in workflow order.")

nav_map = [
    ("0", "Patient Profile", "Doctors: full patient roster. Patients: your own locked profile.", "pages/0_Patient_Profile.py"),
    ("1", "Home", "Executive dashboard: enrollment, active trials, risk alerts. (Doctor only)", "pages/1_Home.py"),
    ("2", "Patient Upload", "Turn a record or note into a structured profile.", "pages/2_Patient_Upload.py"),
    ("3", "Patient Analysis", "Review the extracted profile and current medications.", "pages/3_Patient_Analysis.py"),
    ("4", "Trial Discovery", "Browse trials matched to the patient.", "pages/4_Trial_Discovery.py"),
    ("5", "Eligibility", "Automated inclusion/exclusion clause review.", "pages/5_Eligibility.py"),
    ("6", "Recommendations", "Ranked trials with a top-pick rationale.", "pages/6_Recommendations.py"),
    ("7", "Clinical Trial Journey", "Roadmap from screening to follow-up.", "pages/7_Clinical_Trial_Journey.py"),
    ("8", "Appointment Scheduler", "Upcoming visits, reschedule on a missed visit.", "pages/8_Appointment_Scheduler.py"),
    ("9", "Attendance Dashboard", "Retention risk from travel, frequency, complexity.", "pages/9_Attendance_Dashboard.py"),
    ("10", "Side Effects", "Log symptoms and surface urgent alerts.", "pages/10_Side_Effects.py"),
    ("11", "Doctor Copilot", "Chat-based protocol and cohort assistant. (Doctor only)", "pages/11_Doctor_Copilot.py"),
    ("12", "Research Analytics", "Sponsor-facing phase and retention charts. (Doctor only)", "pages/12_Research_Analytics.py"),
    ("13", "Reports", "Executive summary and export center. (Doctor only)", "pages/13_Reports.py"),
]

if not is_doctor:
    nav_map = [row for row in nav_map if "(Doctor only)" not in row[2]]

grid_cols = st.columns(3)
for i, (num, title, desc, target) in enumerate(nav_map):
    with grid_cols[i % 3]:
        with st.container(border=True):
            st.markdown(f'<span class="ts-mono" style="color:var(--teal-deep);font-weight:700;">{num}</span> &nbsp;**{title}**', unsafe_allow_html=True)
            st.caption(desc)

st.divider()
ui.status_pill("Connected to NitroStack MCP · Simulation Mode: Active", state="ok")
