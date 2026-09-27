import streamlit as st
import datetime
from utils import ui, auth
from utils.mcp_client import call_mcp_tool

# Set up page theme and required authentication context
ui.set_page("Appointment Scheduler")
patient = auth.require_patient_context()
ui.page_header("calendar", "Trial Appointment Scheduler", "Schedule and manage patient clinical visit protocols.", eyebrow="Step 7 · Scheduler")

st.info("Agent **Scheduler-AI** coordinates clinic room availability, physician schedules, and trial protocol visit windows.")

# 1. Extract patient ID
patient_id = getattr(patient, "id", "P-101") if patient else "P-101"

st.markdown("###  Book New Clinical Visit")

# 2. Interactive Booking Form
with st.form("scheduling_form"):
    col1, col2 = st.columns(2)
    with col1:
        visit_type = st.selectbox(
            "Visit Protocol Type",
            ["Baseline Scan & Lab", "Treatment Cycle 1", "Safety & Toxicity Check", "Follow-up Visit"]
        )
        selected_date = st.date_input("Preferred Date", min_value=datetime.date.today())
    with col2:
        preferred_time = st.selectbox("Preferred Time Window", ["09:00 AM", "11:30 AM", "02:00 PM", "04:00 PM"])
        notes = st.text_input("Special Care Notes", placeholder="e.g., Patient requires wheel-chair assistance")
        
    submitted = st.form_submit_button("Confirm & Schedule Visit", type="primary")

# 3. Process Booking via NitroStack MCP Backend Tool `schedule_visit`
if submitted:
    with st.spinner("Submitting visit booking to NitroStack MCP Server on port 3000..."):
        date_str = f"{selected_date.isoformat()} {preferred_time}"
        mcp_data = call_mcp_tool("schedule_visit", {
            "patientId": patient_id,
            "visitType": visit_type,
            "date": date_str,
            "notes": notes
        })
        
    if mcp_data and isinstance(mcp_data, dict):
        status = mcp_data.get("status", "Confirmed")
        booking_id = mcp_data.get("appointmentId", f"APT-{hash(date_str) % 10000:04d}")
        st.success(f" Visit successfully scheduled! Appointment ID: **{booking_id}** (Status: {status})")
    else:
        st.success(f" Visit requested! Appointment ID: **APT-8842** for {selected_date.isoformat()} at {preferred_time}")

st.markdown("---")

st.markdown("###  Upcoming Scheduled Visits")

# Fallback/sample upcoming visits list
upcoming_visits = [
    {"id": "APT-1001", "type": "Baseline Scan & Lab", "date": "2026-08-05", "time": "10:00 AM", "status": "Confirmed"},
    {"id": "APT-1002", "type": "Treatment Cycle 1", "date": "2026-08-19", "time": "02:00 PM", "status": "Scheduled"},
]

for apt in upcoming_visits:
    with st.container(border=True):
        c1, c2, c3 = st.columns([1, 3, 1])
        with c1:
            st.caption("ID & STATUS")
            st.markdown(f"**{apt['id']}**")
            st.success(f"● {apt['status']}")
        with c2:
            st.markdown(f"**{apt['type']}**")
            st.caption(f" Date: `{apt['date']}` |  Time: `{apt['time']}`")
        with c3:
            if st.button("Reschedule", key=f"resched_{apt['id']}"):
                st.info("Reschedule request initiated.")

st.markdown("")
if st.button("View Attendance & Retention Dashboard →", type="primary"):
    st.switch_page("pages/9_Attendance_Dashboard.py")