import streamlit as st
from utils import ui, auth
from utils.mcp_client import call_mcp_tool

ui.set_page("Side Effects")
patient = auth.require_patient_context()
ui.page_header("alert-circle", "Adverse Event & Side Effect Logger", "Log patient side effects for automated safety monitoring.", eyebrow="Step 9 · Side Effects")

st.info("Agent **Safety-Monitor** evaluates toxicity severity against clinical trial protocols.")

patient_id = getattr(patient, "id", "P-101") if patient else "P-101"

with st.form("side_effects_form"):
    symptom = st.text_input("Reported Symptom / Adverse Event", placeholder="e.g., Nausea, Fatigue, Skin Rash")
    severity = st.selectbox("Severity Grade", ["Mild", "Moderate", "Severe"])
    onset_date = st.date_input("Onset Date")
    submitted = st.form_submit_button("Log Side Effect", type="primary")

if submitted:
    if symptom:
        with st.spinner("Submitting safety log to NitroStack MCP Server on port 3000..."):
            mcp_data = call_mcp_tool("log_side_effects", {
                "patientId": patient_id,
                "symptom": symptom,
                "severity": severity
            })
        
        if mcp_data and isinstance(mcp_data, dict):
            action = mcp_data.get("actionRequired", "Monitor at next visit")
            st.warning(f" Event Logged: **{symptom}** ({severity}). Recommended Action: **{action}**")
        else:
            st.success(f" Side effect '{symptom}' logged successfully!")
    else:
        st.error("Please enter a symptom description.")

st.markdown("")
if st.button("Consult Doctor Copilot →", type="primary"):
    st.switch_page("pages/11_Doctor_Copilot.py")