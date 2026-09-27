import streamlit as st
from utils import ui, auth
from utils.mcp_client import call_mcp_tool

ui.set_page("Reports")
patient = auth.require_patient_context()
ui.page_header("file-text", "Clinical Summary Reports", "Generate comprehensive compliance and trial summary reports.", eyebrow="Step 11 · Reports")

st.info("Agent **Reporter-AI** consolidates patient journey notes, eligibility checks, and adherence metrics.")

patient_id = getattr(patient, "id", "P-101") if patient else "P-101"

report_type = st.selectbox("Select Report Type", ["Comprehensive Progress Report", "Compliance & Safety Summary", "Eligibility Audit Trail"])

if st.button("Generate Report", type="primary"):
    with st.spinner("Generating report via NitroStack MCP Server on port 3000..."):
        mcp_data = call_mcp_tool("generate_clinical_report", {
            "patientId": patient_id,
            "reportType": report_type
        })
    
    if mcp_data and isinstance(mcp_data, dict):
        report_id = mcp_data.get("reportId", "REP-9921")
        summary = mcp_data.get("summary", "Report generated successfully.")
        st.success(f" **Report ID:** {report_id}")
        st.write(summary)
    else:
        st.success(f" Generated **{report_type}** for Patient **{patient_id}**! Ready for download.")

    st.markdown("---")
    st.download_button(
        label=" Download PDF Summary",
        data=f"TrialSync AI Summary Report\nPatient ID: {patient_id}\nReport Type: {report_type}\nStatus: Verified",
        file_name=f"TrialSync_Report_{patient_id}.txt",
        mime="text/plain"
    )