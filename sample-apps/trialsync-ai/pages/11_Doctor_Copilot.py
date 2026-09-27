import streamlit as st
from utils.mcp_client import ask_copilot_mcp

st.set_page_config(page_title="Doctor AI Copilot", page_icon="🩺", layout="wide")

st.markdown("### STEP 10 · COPILOT")
st.title("Doctor AI Copilot")
st.caption("Ask questions about trial eligibility, patient metrics, or protocol details.")

# Sidebar patient context
selected_patient = st.sidebar.selectbox("Viewing Patient:", ["P-101 (Jane Doe)", "P-102 (John Smith)"], index=0)
patient_id = selected_patient.split(" ")[0]

# Initialize chat session memory
if "copilot_messages" not in st.session_state:
    st.session_state.copilot_messages = [
        {
            "role": "assistant",
            "content": f"Hello Doctor! I am your AI Copilot for **Jane Doe** ({patient_id}). How can I assist you with this trial today?"
        }
    ]

# Display historical messages
for message in st.session_state.copilot_messages:
    with st.chat_message(message["role"]):
        st.write(message["content"])

# Process new user prompt
if prompt := st.chat_input("Ask about eligibility, protocols, or adherence..."):
    # Render user prompt
    st.session_state.copilot_messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.write(prompt)

    # Generate Copilot response
    with st.spinner("Analyzing protocol and clinical criteria..."):
        response = ask_copilot_mcp(prompt, patient_id=patient_id)

    # Render Copilot response
    st.session_state.copilot_messages.append({"role": "assistant", "content": response})
    with st.chat_message("assistant"):
        st.write(response)

st.markdown("<br>", unsafe_allow_html=True)
if st.button("Generate Final Clinical Report →", type="primary"):
    st.switch_page("pages/13_Reports.py") if hasattr(st, "switch_page") else None