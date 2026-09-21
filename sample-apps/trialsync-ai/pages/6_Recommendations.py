import streamlit as st
from utils import ui, auth
from utils.mcp_client import call_mcp_tool

# Set up page theme and required authentication context
ui.set_page("Trial Recommendations")
patient = auth.require_patient_context()
ui.page_header("award", "AI Trial Recommendations", "Ranked clinical trial matches tailored to the patient's molecular and clinical profile.", eyebrow="Step 5 · Recommendations")

st.info("Agent **Ranker-AI** is prioritizing trials based on eligibility score, location proximity, and Phase suitability.")

# 1. Extract patient ID
patient_id = getattr(patient, "id", "P-101") if patient else "P-101"

# 2. Call live NitroStack MCP backend tool `rank_trials`
with st.spinner("Fetching ranked trials from NitroStack MCP Server on port 3000..."):
    mcp_data = call_mcp_tool("rank_trials", {
        "patientId": patient_id
    })

recommended_trials = []

# 3. Parse live response or fall back gracefully
if mcp_data and isinstance(mcp_data, dict):
    # Extract ranked list from MCP response
    trials = mcp_data.get("rankedTrials", []) or mcp_data.get("trials", [])
    for trial in trials:
        if isinstance(trial, dict):
            recommended_trials.append({
                "id": trial.get("trialId", trial.get("id", "NCT-0000")),
                "title": trial.get("title", "Clinical Study"),
                "score": trial.get("matchScore", trial.get("score", 85)),
                "phase": trial.get("phase", "Phase III"),
                "reason": trial.get("reason", "High inclusion criteria alignment.")
            })

# Fallback view if backend call returned no data or server isn't running
if not recommended_trials:
    st.caption(" *Note: Showing default trial dataset (start NitroStack backend server to view live stream)*")
    recommended_trials = [
        {
            "id": "NCT001",
            "title": "Targeted HER2+ Monoclonal Antibody Therapy Protocol",
            "score": 94,
            "phase": "Phase III",
            "reason": "100% biomarker match (HER2+), local site availability, low burden schedule."
        },
        {
            "id": "NCT002",
            "title": "Neoadjuvant Immunotherapy Combination Trial",
            "score": 88,
            "phase": "Phase II",
            "reason": "High efficacy profile for Stage II/III diagnoses; requires weekly monitoring."
        },
        {
            "id": "NCT003",
            "title": "Novel Kinase Inhibitor Evaluation Study",
            "score": 76,
            "phase": "Phase I/II",
            "reason": "Partial criteria match; requires additional liver function panel verification."
        }
    ]

# 4. Display Key Summary Metrics
col1, col2 = st.columns(2)
with col1:
    st.metric(label="Top Recommended Trial", value=recommended_trials[0]["id"] if recommended_trials else "N/A")
with col2:
    st.metric(label="Highest Match Score", value=f"{recommended_trials[0]['score']}%" if recommended_trials else "0%", delta="Top Candidate")

st.markdown("---")

# 5. Render Ranked Trial Cards
for idx, trial in enumerate(recommended_trials, start=1):
    with st.container(border=True):
        c1, c2, c3 = st.columns([1, 4, 1.5])
        
        with c1:
            st.markdown(f"### #{idx}")
            st.caption(f"**{trial['phase']}**")
            
        with c2:
            st.markdown(f"### {trial['id']} — {trial['title']}")
            st.write(trial['reason'])
            
        with c3:
            st.metric(label="Match Score", value=f"{trial['score']}%")
            if st.button(f"Select Trial {trial['id']}", key=f"select_{trial['id']}"):
                st.session_state["selected_trial"] = trial["id"]
                st.success(f"Selected {trial['id']}! Proceeding to Journey Roadmap...")
                st.switch_page("pages/7_Clinical_Trial_Journey.py")

st.markdown("")
if st.button("View Patient Journey Roadmap →", type="primary"):
    st.switch_page("pages/7_Clinical_Trial_Journey.py")