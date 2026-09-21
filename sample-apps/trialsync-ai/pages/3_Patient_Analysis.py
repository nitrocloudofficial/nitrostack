import streamlit as st
from utils import ui, auth

ui.set_page("Patient Analysis")
p = auth.require_patient_context()
ui.page_header("id-card", "Extracted Patient Profile", f"Structured summary for {p['name']}.", eyebrow="Step 2 · Analysis")

col1, col2 = st.columns(2)
with col1:
    with st.container(border=True):
        ui.section_title("id-card", "Identity & Condition")
        st.markdown(f"**Name** &nbsp; {p['name']}")
        st.markdown(f"**Age** &nbsp; {p.get('age','—')}")
        st.markdown(f"**Condition** &nbsp; {p['condition']} · Stage {p['stage']}")
        st.markdown(f"**Location** &nbsp; {p['location']}")

with col2:
    with st.container(border=True):
        ui.section_title("dna", "Biomarkers")
        badges = " ".join(ui.badge(b, "teal") for b in p["biomarkers"])
        st.markdown(badges, unsafe_allow_html=True)

st.markdown("")
with st.container(border=True):
    ui.section_title("pill", "Current Medications")
    st.table(p["medications"])

st.markdown("")
if st.button("Find Matching Trials →", type="primary"):
    st.switch_page("pages/4_Trial_Discovery.py")
