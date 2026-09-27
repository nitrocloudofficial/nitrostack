import streamlit as st
from utils.sample_data import mock_extract_profile
from utils import ui, auth

ui.set_page("Patient Upload")
patient = auth.require_patient_context()
user = auth.current_user()

ui.page_header("folder", "Patient Data Onboarding",
                f"Upload a record or paste clinical notes for **{patient['name']}** — the agent turns it into a structured profile.",
                eyebrow="Step 1 · Onboarding")

if user["role"] == "patient":
    st.caption("Your name is locked to your account, so extraction will never overwrite it.")
else:
    st.caption(f"Updating the record for **{patient['name']}**. Switch patients from the sidebar.")

with st.container(border=True):
    ui.section_title("file-text", "Source document")
    uploaded_file = st.file_uploader("Upload medical records (PDF/TXT)")
    manual_text = st.text_area("Or paste clinical notes here...", height=140, placeholder="e.g. 54F, NSCLC stage IV, EGFR+, PD-L1 > 50%, currently on Metformin, Lisinopril...")

    if st.button("Extract Profile with AI Agent", type="primary"):
        with st.spinner("Analyzing medical records..."):
            extracted = mock_extract_profile(manual_text, uploaded_file)
            extracted["name"] = patient["name"]  # account-linked name can never change
            username = (
                user["username"] if user["role"] == "patient"
                else st.session_state.selected_patient_username
            )
            auth.save_patient_profile(username, extracted)
            st.session_state.current_patient = extracted
            st.success("Profile extracted.")
            st.switch_page("pages/3_Patient_Analysis.py")

st.caption("Agent: **Extractor-1** · Runs entirely on the NitroStack MCP simulation layer — no data leaves this session.")
