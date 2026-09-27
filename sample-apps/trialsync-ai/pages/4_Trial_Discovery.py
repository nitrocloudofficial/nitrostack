import streamlit as st
import pandas as pd
from utils.mcp_client import search_clinical_trials_mcp

st.set_page_config(page_title="Trial Discovery", page_icon="🔍", layout="wide")

st.markdown("### STEP 3 · DISCOVERY")
st.title("Trial Discovery")
st.caption("Live clinical studies matched to this patient's condition via NIH ClinicalTrials.gov API.")

# Patient / condition selection input
condition_query = st.text_input(
    "Search Condition for Selected Patient:",
    value="Non-Small Cell Lung Cancer (NSCLC)"
)

st.write(f"Showing live trials matching **{condition_query}**")

# Fetch trials directly from backend client
trials = search_clinical_trials_mcp(condition_query)

if trials and len(trials) > 0:
    df = pd.DataFrame(trials)
    
    # Render interactive data table
    st.dataframe(
        df,
        column_config={
            "NCT_ID": "NCT ID",
            "Title": "Trial Title",
            "Phase": "Phase",
            "Status": "Status",
            "Location": "Location",
            "Eligibility": "Eligibility Summary"
        },
        use_container_width=True,
        hide_index=True
    )
else:
    st.warning(f"No active live trials found for '{condition_query}'. Try refining your search query.")

st.markdown("---")
if st.button("Proceed to Eligibility Check →", type="primary"):
    st.switch_page("pages/5_Eligibility.py") if hasattr(st, "switch_page") else None