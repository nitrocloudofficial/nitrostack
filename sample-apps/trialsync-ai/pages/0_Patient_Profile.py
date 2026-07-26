import streamlit as st
from utils import ui, auth

ui.set_page("Patient Profile")
auth.require_login()

user = auth.current_user()

if user["role"] == "patient":
    ui.page_header(
        "id-card", "My Profile",
        "Your name is linked to your account and can't be changed here. "
        "Everything else can be kept up to date.",
        eyebrow="Patient",
    )

    profile = user["profile"]

    with st.container(border=True):
        ui.section_title("id-card", "Identity")
        col1, col2 = st.columns(2)
        col1.text_input("Full name", value=profile["name"], disabled=True,
                         help="Locked to your account — contact your care team to correct this.")
        col2.number_input("Age", min_value=0, max_value=120, value=int(profile.get("age", 0)), key="prof_age")

    with st.container(border=True):
        ui.section_title("dna", "Condition")
        col1, col2 = st.columns(2)
        condition = col1.text_input("Condition", value=profile.get("condition", ""), key="prof_condition")
        stage = col2.text_input("Stage", value=profile.get("stage", ""), key="prof_stage")
        location = st.text_input("Location", value=profile.get("location", ""), key="prof_location")
        biomarkers = st.text_input(
            "Biomarkers (comma separated)",
            value=", ".join(profile.get("biomarkers", [])),
            key="prof_biomarkers",
        )
        medications = st.text_input(
            "Current medications (comma separated)",
            value=", ".join(profile.get("medications", [])),
            key="prof_medications",
        )

    if st.button("Save changes", type="primary"):
        updated = dict(profile)
        updated["age"] = st.session_state.prof_age
        updated["condition"] = condition
        updated["stage"] = stage
        updated["location"] = location
        updated["biomarkers"] = [b.strip() for b in biomarkers.split(",") if b.strip()]
        updated["medications"] = [m.strip() for m in medications.split(",") if m.strip()]
        auth.save_patient_profile(user["username"], updated)
        st.session_state.current_patient = st.session_state.user["profile"]
        st.success("Profile updated.")
        st.rerun()

else:
    ui.page_header(
        "users", "Patient Roster",
        "Every patient registered in TrialSync AI+. Select one to work with across every page.",
        eyebrow="Doctor",
    )

    patients = auth.all_patients()

    if not patients:
        st.info("No patients have registered yet.")
    else:
        selected = st.session_state.get("selected_patient_username")

        for uname, rec in patients.items():
            p = rec["profile"]
            with st.container(border=True):
                c1, c2, c3 = st.columns([3, 3, 1.2])
                with c1:
                    st.markdown(f"**{p['name']}**")
                    st.caption(f"Age {p.get('age', '—')} &middot; {p.get('gender', '—')}", unsafe_allow_html=True)
                with c2:
                    st.markdown(f"{p.get('condition', '—')} &middot; Stage {p.get('stage', '—')}", unsafe_allow_html=True)
                    st.caption(p.get("location", "—"))
                with c3:
                    is_selected = (uname == selected)
                    label = "Selected" if is_selected else "Select"
                    if st.button(label, key=f"select_{uname}", type="primary" if is_selected else "secondary",
                                 use_container_width=True, disabled=is_selected):
                        st.session_state.selected_patient_username = uname
                        st.session_state.current_patient = p
                        st.rerun()

        st.markdown("")
        if selected:
            st.success(f"Currently viewing **{patients[selected]['profile']['name']}** across every page.")
            if st.button("Go to Patient Analysis →", type="primary"):
                st.switch_page("pages/3_Patient_Analysis.py")
        else:
            st.info("Select a patient above to open their record in the other pages.")
