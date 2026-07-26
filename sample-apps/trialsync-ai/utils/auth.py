"""
TrialSync AI+ authentication & role layer.

Two account types share the same app: 'patient' and 'doctor'.

- Every account is stored (with a hashed password) in a small JSON file
  acting as the user directory, so accounts and patient profiles persist
  across reruns and across the different multipage scripts.
- A patient's name is captured once at sign-up and is then permanently
  linked to their account -- nothing in the product lets it be edited
  afterwards.
- Doctors can browse every patient and select one to work with; patients
  are always scoped to their own record and never see anyone else's data.

Every page calls one of the `require_*` functions at the top. Those
functions also render the shared sidebar (account info, role badge,
patient switcher for doctors, logout).
"""

import hashlib
import json
import os
import textwrap

import streamlit as st

from utils import ui

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
USERS_FILE = os.path.join(DATA_DIR, "users.json")

_DEFAULT_PATIENT_PROFILE = {
    "age": 54,
    "gender": "Female",
    "condition": "Non-Small Cell Lung Cancer (NSCLC)",
    "stage": "IV",
    "biomarkers": ["EGFR+", "PD-L1 > 50%"],
    "medications": ["Metformin", "Lisinopril"],
    "location": "Chicago, IL",
    "distance_willing_to_travel": 50,
}


# --------------------------------------------------------------------------
# Storage
# --------------------------------------------------------------------------
def _hash(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def _seed_store():
    """First-run demo accounts so the app isn't empty on a fresh checkout."""
    seed = {
        "jane": {
            "password": _hash("patient123"),
            "role": "patient",
            "name": "Jane Doe",
            "profile": dict(_DEFAULT_PATIENT_PROFILE, name="Jane Doe"),
        },
        "marcus": {
            "password": _hash("patient123"),
            "role": "patient",
            "name": "Marcus Lee",
            "profile": dict(
                _DEFAULT_PATIENT_PROFILE,
                name="Marcus Lee",
                age=61,
                gender="Male",
                condition="Prostate Cancer",
                stage="III",
                biomarkers=["BRCA2"],
                medications=["Bicalutamide"],
                location="Austin, TX",
            ),
        },
        "drchen": {
            "password": _hash("doctor123"),
            "role": "doctor",
            "name": "Dr. Sarah Chen",
            "specialty": "Oncology",
        },
    }
    _save(seed)
    return seed


def _load() -> dict:
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(USERS_FILE):
        return _seed_store()
    try:
        with open(USERS_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return _seed_store()


def _save(users: dict):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=2)


# --------------------------------------------------------------------------
# Accounts
# --------------------------------------------------------------------------
def register(username: str, password: str, role: str, name: str, **extra):
    username = username.strip().lower()
    users = _load()
    if not username or not password or not name.strip():
        return False, "Please fill in every field."
    if username in users:
        return False, "That username is already taken."

    entry = {"password": _hash(password), "role": role, "name": name.strip()}
    if role == "patient":
        profile = dict(_DEFAULT_PATIENT_PROFILE)
        profile.update({k: v for k, v in extra.items() if v not in (None, "")})
        profile["name"] = name.strip()  # locked forever
        entry["profile"] = profile
    else:
        entry["specialty"] = extra.get("specialty", "")

    users[username] = entry
    _save(users)
    return True, "Account created."


def authenticate(username: str, password: str, role: str):
    users = _load()
    u = users.get(username.strip().lower())
    if not u or u["role"] != role or u["password"] != _hash(password):
        return False, None
    return True, u


def all_patients() -> dict:
    """username -> user record, for every patient account."""
    return {uname: u for uname, u in _load().items() if u["role"] == "patient"}


def save_patient_profile(username: str, profile: dict):
    users = _load()
    if username not in users:
        return
    profile = dict(profile)
    profile["name"] = users[username]["profile"]["name"]  # name can never change
    users[username]["profile"] = profile
    _save(users)
    if st.session_state.get("user", {}).get("username") == username:
        st.session_state.user["profile"] = profile


# --------------------------------------------------------------------------
# Session helpers
# --------------------------------------------------------------------------
def current_user():
    return st.session_state.get("user")


def is_logged_in() -> bool:
    return "user" in st.session_state


def log_out():
    for key in ("user", "selected_patient_username", "current_patient"):
        st.session_state.pop(key, None)
    st.rerun()


def get_current_patient():
    """The patient profile the current session should be working with, or
    None if a doctor hasn't picked anyone yet."""
    user = current_user()
    if not user:
        return None
    if user["role"] == "patient":
        return user["profile"]
    sel = st.session_state.get("selected_patient_username")
    if sel:
        rec = all_patients().get(sel)
        return rec["profile"] if rec else None
    return None


# --------------------------------------------------------------------------
# Sidebar (rendered by every require_* call)
# --------------------------------------------------------------------------
def render_sidebar_account():
    user = current_user()
    if not user:
        return
    with st.sidebar:
        st.divider()
        role = user["role"]
        tone = "teal" if role == "doctor" else "mint"
        st.markdown(
            f'<div style="padding:2px 0 8px 0;">'
            f'<div style="font-weight:600;">{user["name"]}</div>'
            f'{ui.badge(role.capitalize(), tone)}'
            f"</div>",
            unsafe_allow_html=True,
        )

        if role == "doctor":
            patients = all_patients()
            if patients:
                options = list(patients.keys())
                labels = {u: patients[u]["profile"]["name"] for u in options}
                current = st.session_state.get("selected_patient_username")
                index = options.index(current) if current in options else 0
                chosen = st.selectbox(
                    "Viewing patient",
                    options,
                    index=index,
                    format_func=lambda u: labels[u],
                    key="sidebar_patient_select",
                )
                if chosen != current:
                    st.session_state.selected_patient_username = chosen
                    st.session_state.current_patient = patients[chosen]["profile"]
                    st.rerun()
                else:
                    st.session_state.selected_patient_username = chosen
                    st.session_state.current_patient = patients[chosen]["profile"]
            else:
                st.caption("No patients registered yet.")

        if st.button("Log out", use_container_width=True):
            log_out()


# --------------------------------------------------------------------------
# Page guards
# --------------------------------------------------------------------------
def require_login():
    if not is_logged_in():
        st.warning("Please sign in first.")
        if st.button("Go to sign in"):
            st.switch_page("app.py")
        st.stop()
    render_sidebar_account()


def require_role(*roles):
    require_login()
    if current_user()["role"] not in roles:
        st.error("This page isn't available for your account type.")
        st.stop()


def require_patient_context():
    """Guard for every patient-centric page. Returns the active patient
    profile dict. Doctors must pick a patient first (Patient Profile page
    or the sidebar switcher); patients are always scoped to themselves."""
    require_login()
    profile = get_current_patient()
    if profile is None:
        st.warning("Select a patient to work with first.")
        if st.button("Go to Patient Profile"):
            st.switch_page("pages/0_Patient_Profile.py")
        st.stop()
    st.session_state.current_patient = profile
    return profile


# --------------------------------------------------------------------------
# Login / sign-up UI shown on app.py when nobody is signed in
# --------------------------------------------------------------------------
def login_signup_gate():
    st.markdown(
        textwrap.dedent(
            """
            <div style="text-align:center; padding: 8px 0 18px 0;">
                <div style="font-family:'Space Grotesk',sans-serif; font-size:1.7rem; font-weight:700; color:var(--ink);">TrialSync AI+</div>
                <div style="color:var(--ink-soft);">Sign in as a patient or a doctor to continue.</div>
            </div>
            """
        ).strip(),
        unsafe_allow_html=True,
    )

    _, mid, _ = st.columns([1, 1.3, 1])
    with mid:
        with st.container(border=True):
            role = st.radio("I am a", ["Patient", "Doctor"], horizontal=True, key="gate_role").lower()

            tab_in, tab_up = st.tabs(["Sign in", "Create account"])

            with tab_in:
                with st.form("login_form"):
                    username = st.text_input("Username")
                    password = st.text_input("Password", type="password")
                    submitted = st.form_submit_button("Sign in", type="primary", use_container_width=True)
                if submitted:
                    ok, user = authenticate(username, password, role)
                    if ok:
                        st.session_state.user = dict(user, username=username.strip().lower())
                        if role == "patient":
                            st.session_state.current_patient = user["profile"]
                        st.rerun()
                    else:
                        st.error(f"No matching {role} account for that username/password.")
                if role == "patient":
                    st.caption("Demo login &middot; username `jane` or `marcus` &middot; password `patient123`")
                else:
                    st.caption("Demo login &middot; username `drchen` &middot; password `doctor123`")

            with tab_up:
                with st.form("signup_form"):
                    su_name = st.text_input("Full name", help="This is permanent and can't be changed later.")
                    su_username = st.text_input("Choose a username")
                    su_password = st.text_input("Choose a password", type="password")
                    su_password2 = st.text_input("Confirm password", type="password")

                    extra = {}
                    if role == "patient":
                        c1, c2 = st.columns(2)
                        extra["age"] = c1.number_input("Age", min_value=0, max_value=120, value=45)
                        extra["gender"] = c2.selectbox("Gender", ["Female", "Male", "Other"])
                        extra["condition"] = st.text_input("Primary condition", placeholder="e.g. Breast Cancer")
                        extra["location"] = st.text_input("Location", placeholder="City, State")
                    else:
                        extra["specialty"] = st.text_input("Specialty", placeholder="e.g. Oncology")

                    su_submitted = st.form_submit_button("Create account", type="primary", use_container_width=True)

                if su_submitted:
                    if su_password != su_password2:
                        st.error("Passwords don't match.")
                    else:
                        ok, msg = register(su_username, su_password, role, su_name, **extra)
                        if ok:
                            ok2, user = authenticate(su_username, su_password, role)
                            st.session_state.user = dict(user, username=su_username.strip().lower())
                            if role == "patient":
                                st.session_state.current_patient = user["profile"]
                            st.success(msg)
                            st.rerun()
                        else:
                            st.error(msg)

    st.stop()
