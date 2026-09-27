import streamlit as st
from utils import ui, auth
from utils.mcp_client import call_mcp_tool

# Set up page theme and required authentication context
ui.set_page("Clinical Trial Journey")
patient = auth.require_patient_context()
ui.page_header("map-pin", "Patient Journey Roadmap", "From screening to follow-up, tracked stage by stage.", eyebrow="Step 6 · Journey")

st.info("Agent **Journey-Tracker** is monitoring milestone progress and schedule completion.")

# 1. Extract patient ID
patient_id = getattr(patient, "id", "P-101") if patient else "P-101"

# 2. Call live NitroStack MCP backend tool `get_patient_journey`
with st.spinner("Fetching patient timeline from NitroStack MCP Server on port 3000..."):
    mcp_data = call_mcp_tool("get_patient_journey", {
        "patientId": patient_id
    })

timeline = []
progress_pct = 25

# 3. Parse live response or fall back gracefully
if mcp_data and isinstance(mcp_data, dict):
    # Extract timeline list from MCP response
    timeline = mcp_data.get("timeline", mcp_data.get("stages", []))
    progress_pct = mcp_data.get("progressPercent", mcp_data.get("progress", 25))

# Fallback view if backend call returned no data or server isn't running
if not timeline:
    st.caption(" *Note: Showing default journey dataset (start NitroStack backend server to view live stream)*")
    timeline = [
        {"phase": "Screening & Eligibility", "status": "Complete", "duration": "2 weeks", "details": "Informed consent signed and baseline eligibility verified."},
        {"phase": "Baseline Scans & Biomarkers", "status": "In Progress", "duration": "1 week", "details": "CT scan complete; waiting on central lab biomarker panel."},
        {"phase": "Treatment Phase 1 (Cycle 1-3)", "status": "Pending", "duration": "12 weeks", "details": "First dose scheduled upon biomarker clearance."},
        {"phase": "Follow-up & Survival Monitoring", "status": "Pending", "duration": "24 weeks", "details": "Post-treatment evaluation visits every 4 weeks."}
    ]

# 4. Display Progress Metrics
col1, col2 = st.columns([3, 1])
with col1:
    st.write(f"**Journey Progress:** `{progress_pct}%`")
    st.progress(progress_pct / 100.0)
with col2:
    st.metric(label="Total Stages", value=len(timeline))

st.markdown("---")

# 5. Render Interactive Timeline Cards
for idx, stage in enumerate(timeline, start=1):
    with st.container(border=True):
        c1, c2 = st.columns([1, 4])
        
        status = stage.get("status", "Pending")
        with c1:
            if status == "Complete":
                st.success(" Complete")
            elif status == "In Progress":
                st.warning(" In Progress")
            else:
                st.info(" Pending")
            st.caption(f"Duration: {stage.get('duration', 'N/A')}")
            
        with c2:
            st.markdown(f"### Stage {idx}: {stage.get('phase', 'Protocol Milestone')}")
            st.write(stage.get("details", "Milestone details tracked by trial protocol."))

st.markdown("")
if st.button("Manage Appointments →", type="primary"):
    st.switch_page("pages/8_Appointment_Scheduler.py")