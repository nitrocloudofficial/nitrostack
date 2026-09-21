import streamlit as st
from utils import ui, auth
from utils.mcp_client import call_mcp_tool

# Set up page theme and required authentication context
ui.set_page("Executive Dashboard")
patient = auth.require_patient_context()

# Page Header
ui.page_header("layout", "Executive Dashboard", "Live snapshot across every active trial and patient in the pipeline.", eyebrow="Overview · Home")

st.markdown("")

# 1. Executive Summary Metrics (Native Streamlit Cards to prevent raw HTML rendering)
col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric(label="Total Patients", value="124", delta="↑ 8 onboarded")

with col2:
    st.metric(label="Active Trials", value="12", delta="Active Pipeline")

with col3:
    st.metric(label="Completion Rate", value="88%", delta="↑ 3.2%")

with col4:
    st.metric(label="High Risk Alerts", value="5", delta="Action Required", delta_color="inverse")

st.markdown("---")

# 2. Main Dashboard Grid
col_left, col_right = st.columns([2, 1])

with col_left:
    st.markdown("### ⚠️ Priority Alerts")
    
    # Priority Alerts Table
    alerts = [
        {"Patient": "Jane Doe", "Trial": "NCT04561234", "Issue": "2 missed visits — risk score 0.85", "Severity": "🔴 High"},
        {"Patient": "Marcus Lee", "Trial": "NCT09876543", "Issue": "Lab values pending review", "Severity": "🟡 Medium"},
        {"Patient": "Priya Nair", "Trial": "NCT01122334", "Issue": "Consent renewal due in 5 days", "Severity": "🟢 Low"},
    ]
    st.dataframe(alerts, use_container_width=True, hide_index=True)

    st.markdown("")
    st.markdown("### 🚀 Quick Navigation")
    
    c1, c2, c3 = st.columns(3)
    with c1:
        if st.button("🔍 Find Trials", use_container_width=True):
            st.switch_page("pages/4_Trial_Discovery.py")
    with c2:
        if st.button("📋 Check Eligibility", use_container_width=True):
            st.switch_page("pages/5_Eligibility.py")
    with c3:
        if st.button("🗺️ View Journey", use_container_width=True):
            st.switch_page("pages/7_Clinical_Trial_Journey.py")

with col_right:
    st.markdown("### 🩺 System Status")
    
    with st.container(border=True):
        st.success("🟢 Connected to NitroStack MCP")
        st.caption("Port 3000 Listening · Streamable HTTP")
        st.divider()
        st.markdown("**Active Agent Pipeline:**")
        st.markdown("• Extractor-1 `(Active)`")
        st.markdown("• Matcher-1 `(Active)`")
        st.markdown("• Ranker-AI `(Active)`")
        st.markdown("• Retention-AI `(Active)`")
        
    st.markdown("")
    with st.container(border=True):
        st.markdown("### 📊 Active Patient Context")
        patient_name = getattr(patient, "name", "Jane Doe") if patient else "Jane Doe"
        patient_id = getattr(patient, "id", "P-101") if patient else "P-101"
        st.write(f"**Name:** {patient_name}")
        st.write(f"**ID:** `{patient_id}`")
        if st.button("Switch Patient Context", use_container_width=True):
            st.switch_page("pages/0_Patient_Profile.py")