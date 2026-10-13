import streamlit as st
from utils import ui, auth
from utils.mcp_client import call_mcp_tool

# Set up page theme and required authentication context
ui.set_page("Eligibility Review")
patient = auth.require_patient_context()
ui.page_header("scale", "Precision Eligibility Check", "Automated inclusion/exclusion clause review against the trial protocol.", eyebrow="Step 4 · Eligibility")

st.info("Agent **Matcher-1** is comparing clinical notes against trial protocols.")

# 1. Safely extract patient ID
patient_id = getattr(patient, "id", "P-101") if patient else "P-101"

# 2. Call live NitroStack MCP backend server
with st.spinner("Querying NitroStack MCP Server on port 3000..."):
    mcp_data = call_mcp_tool("check_eligibility", {
        "patientId": patient_id,
        "trialId": "NCT001"
    })

results = []

# 3. Parse live response or gracefully fall back if server is unreachable
if mcp_data and isinstance(mcp_data, dict):
    # Extract criteria lists returned by check_eligibility
    matched = mcp_data.get("matchedCriteria", [])
    unmatched = mcp_data.get("unmatchedCriteria", [])
    
    for c in matched:
        results.append({"criteria": str(c), "status": "Met", "details": "Verified against patient medical records."})
    for c in unmatched:
        results.append({"criteria": str(c), "status": "Excluded", "details": "Patient records do not satisfy this criterion."})

# Fallback view if backend call returned no data or server isn't running
if not results:
    st.caption("⚡ *Note: Showing default protocol dataset (start NitroStack backend server to view live stream)*")
    results = [
        {"criteria": "Age >= 18", "status": "Met", "details": "Patient age meets trial requirement (45 yrs)"},
        {"criteria": "Stage II/III Diagnosis", "status": "Met", "details": "Confirmed Breast Cancer Diagnosis"},
        {"criteria": "Prior Chemotherapy Completed", "status": "Met", "details": "Completed baseline protocol"},
        {"criteria": "Hepatic Function (AST/ALT)", "status": "Excluded", "details": "Elevated liver enzyme levels exceed threshold"}
    ]

met_count = sum(1 for r in results if r["status"] == "Met")

# 4. Clean Native Metrics (Avoids unrendered raw HTML tags)
col1, col2, col3 = st.columns(3)
with col1:
    st.metric(label="Criteria Reviewed", value=len(results))
with col2:
    st.metric(label="Met", value=met_count, delta=f"{met_count}/{len(results)}")
with col3:
    st.metric(label="Excluded", value=len(results) - met_count)

st.markdown("---")

# 5. Visual Criteria Cards
for item in results:
    with st.container(border=True):
        c1, c2 = st.columns([1, 4])
        with c1:
            if item["status"] == "Met":
                st.success(" MET")
            else:
                st.error(" EXCLUDED")
        with c2:
            st.markdown(f"**{item['criteria']}**")
            st.caption(item["details"])

st.markdown("")
if st.button("Generate Recommendations →", type="primary"):
    st.switch_page("pages/6_Recommendations.py")