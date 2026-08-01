# SECURITY_COMPLIANCE.md

**Purpose:** Describe privacy, security, and compliance practices for ClinicaMind.

## Privacy

ClinicaMind handles clinical conversation data, which should be treated as Protected Health Information (PHI).
- Only store data in-memory for the current session.
- Do not persist raw transcripts or patient identifiers in logs.
- Use de-identified mock data whenever possible.

## Consent

The UI should require explicit patient consent before recording audio.
- Example: `checkbox: Patient consents to voice recording and clinical analysis.`

## HIPAA Guidelines

Even as a prototype, ClinicaMind should follow these safeguards:
- **Data encryption** for any stored secrets or logs.
- **Minimal collection**: only gather the information needed for the current consultation.
- **Safe handling**: use patient IDs instead of names when referencing records.

## Token & Secret Management

- Store `OPENAI_API_KEY` and other secrets in `.env` only.
- Ensure `.env` is excluded by `.gitignore`.
- Do not expose API keys in frontend code or commit history.

## Data Retention

Define a policy for prototype usage:
- Purge transcript and session data at the end of each consultation.
- If persisted, remove identifiers and store only anonymized summaries.

## Error Handling

Avoid leaking internal details to the UI.
- Return generic error messages for users.
- Log full errors only on the server side.

## Regulatory Disclaimer

ClinicaMind is a demonstration prototype, not a certified medical device.
- Display a disclaimer in the UI: `For demonstration only; not for actual diagnosis.`
- Do not use real patient data in public demos.

## Third-Party Data

- PubMed and OpenFDA are public resources and may be used under their terms.
- No PHI should be transmitted to external APIs.

This compliance guide provides the security mindset and prototype-level privacy practices needed for ClinicaMind.
