# TrialSync AI+ (Streamlit)

## Run it
```bash
pip install -r requirements.txt
streamlit run app.py
```

## Accounts & roles

The app now opens on a **sign in / create account** screen with a
**Patient / Doctor** toggle. Everything is stored locally in
`data/users.json` (created automatically on first run — safe to delete
to reset the demo).

Demo logins seeded on first run:

| Role    | Username | Password     |
|---------|----------|--------------|
| Patient | `jane`   | `patient123` |
| Patient | `marcus` | `patient123` |
| Doctor  | `drchen` | `doctor123`  |

You can also just create a new account from the "Create account" tab.

### Patient mode
- Lands on a personal home page and only ever sees **their own** record.
- **My Profile** (page `0`) shows their profile. Their **name is set at
  sign-up and is locked everywhere** — it can never be edited again,
  including by re-uploading a record (extraction always keeps the
  account name).
- Pages that show one patient's data (Upload, Analysis, Trial Discovery,
  Eligibility, Recommendations, Journey, Scheduler, Side Effects) work
  against their own profile automatically.
- Aggregate/administrative pages (Home dashboard, Doctor Copilot,
  Research Analytics, Reports) are hidden and blocked for patients.

### Doctor mode
- Lands on a doctor-oriented home page.
- **Patient Profile** (page `0`) shows the **full patient roster** —
  every registered patient, with a "Select" button. Whoever is selected
  becomes the active patient for every other page (also switchable any
  time from the sidebar dropdown).
- Doctors can view/edit any patient's clinical fields, but even a doctor
  can't rename a patient — the name stays tied to that patient's account.
- Doctor-only pages: Home dashboard, Doctor Copilot, Research Analytics,
  Reports.

## What changed from the original
- Added `utils/auth.py`: the account store, login/sign-up UI, and the
  `require_login()` / `require_role()` / `require_patient_context()`
  guards used at the top of every page.
- Added `pages/0_Patient_Profile.py`: patient's own locked profile, or
  the doctor's patient roster.
- `app.py` now gates on login and shows a role-specific home page.
- Every one of the original 13 pages got a one/two-line guard added so
  the whole app is access-controlled, plus per-patient session keys for
  appointments/symptoms so switching patients doesn't mix up records.
