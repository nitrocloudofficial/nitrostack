# MedBridge MCP Server

MedBridge is a consent-gated MCP server for secure healthcare record reconciliation. It helps an attending physician or agent request patient consent, verify OTP-based authorization, reconcile hospital, lab, and pharmacy data, and generate a review-ready report without exposing sensitive records prematurely.

## What MedBridge does

- Discovers patient records and consent state
- Registers a short-lived doctor session for clinical workflows
- Sends and verifies patient OTP challenges before access is granted
- Reconciles data from multiple evidence sources into one summary
- Checks for drug allergies and medication interactions
- Generates a Markdown report that can be shared with a recipient email

## Core workflow

1. Register a doctor session with `medbridge_register_doctor_session`
2. Send an OTP to the patient with `medbridge_send_patient_otp`
3. Verify the OTP with `medbridge_verify_patient_otp`
4. Request or revoke consent as needed with `medbridge_request_consent` and `medbridge_revoke_consent`
5. Reconcile records and generate a report with the MedBridge tools

## Project structure

```text
src/
  app.module.ts
  index.ts
  modules/
    medbridge/
      medbridge.module.ts
      medbridge.resources.ts
      medbridge.service.ts
      medbridge.tools.ts
```

## Prerequisites

- Node.js 20+
- npm 10+
- Optional: SMTP credentials for email delivery
- Optional: Twilio credentials for SMS OTP delivery

## Getting started

```bash
npm install
cp .env.example .env
npm run dev
```

Update `.env` with your SMTP/Twilio settings before using the live delivery features. The repository includes a dev-mode flag in `.env.example` that can expose OTPs in tool responses for local testing.

## Available commands

```bash
npm run dev
npm run build
npm start
npm run start:prod
```

## Key tools

- `medbridge_list_patients`
- `medbridge_request_consent`
- `medbridge_revoke_consent`
- `medbridge_register_doctor_session`
- `medbridge_send_patient_otp`
- `medbridge_verify_patient_otp`
- `medbridge_reconcile_patient_history`
- `medbridge_check_drug_safety`
- `medbridge_get_patient_summary`
- `medbridge_generate_reconciliation_report`
- `medbridge_share_report`
- `medbridge_get_consent_log`

## Notes

This project is built on NitroStack and uses TypeScript + Zod for tool validation. The current implementation is demo-oriented and uses in-memory state for sessions, consent grants, and reports.

<!-- auto-commit:generated -->
