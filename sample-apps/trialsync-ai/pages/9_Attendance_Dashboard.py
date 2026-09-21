import streamlit as st
from utils import ui, auth
from utils.mcp_client import call_mcp_tool

ui.set_page("Attendance Dashboard")
patient = auth.require_patient_context()
ui.page_header("check-square", "Patient Attendance & Retention", "Track visit adherence and dropout risk predictions.", eyebrow="Step 8 · Attendance")

st.info("Agent **Retention-AI** is analyzing appointment logs and adherence patterns.")

patient_id = getattr(patient, "id", "P-101") if patient else "P-101"

with st.spinner("Fetching attendance metrics from NitroStack MCP Server on port 3000..."):
    mcp_data = call_mcp_tool("track_attendance", {
        "patientId": patient_id
    })

adherence_rate = 92
dropout_risk = "Low"
total_visits = 12
attended_visits = 11

if mcp_data and isinstance(mcp_data, dict):
    adherence_rate = mcp_data.get("adherenceRate", mcp_data.get("adherence", 92))
    dropout_risk = mcp_data.get("dropoutRisk", mcp_data.get("risk", "Low"))
    total_visits = mcp_data.get("totalVisits", 12)
    attended_visits = mcp_data.get("attendedVisits", 11)

col1, col2, col3 = st.columns(3)
with col1:
    st.metric(label="Adherence Rate", value=f"{adherence_rate}%", delta="High Retention")
with col2:
    st.metric(label="Dropout Risk Level", value=dropout_risk)
with col3:
    st.metric(label="Visits Attended", value=f"{attended_visits}/{total_visits}")

st.markdown("---")
st.markdown("###  Visit Log History")

visit_logs = [
    {"visit": "Screening Visit", "date": "2026-07-01", "status": "Attended", "notes": "On time"},
    {"visit": "Baseline Scans", "date": "2026-07-15", "status": "Attended", "notes": "On time"},
    {"visit": "Cycle 1 Dose", "date": "2026-07-29", "status": "Scheduled", "notes": "Upcoming"},
]

for log in visit_logs:
    with st.container(border=True):
        c1, c2, c3 = st.columns([1, 2, 2])
        with c1:
            if log["status"] == "Attended":
                st.success(" Attended")
            else:
                st.info(" Scheduled")
        with c2:
            st.markdown(f"**{log['visit']}**")
        with c3:
            st.caption(f"Date: `{log['date']}` | Notes: {log['notes']}")

st.markdown("")
if st.button("Log Adverse Side Effects →", type="primary"):
    st.switch_page("pages/10_Side_Effects.py")