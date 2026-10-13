# MedTriage MCP

Team: Zerogravity

MedTriage MCP is a NitroStack sample app for patient intake, symptom triage, specialty matching, and appointment booking. It exposes MCP tools for collecting patient intake data, analyzing symptom descriptions, scoring urgency, recommending specialties, finding hospital and doctor options, confirming bookings, and generating visit summaries. The app also includes NitroStack widgets for symptom analysis, urgency results, hospital and specialty grids, doctor profiles, booking confirmation, and calculator output.

## What It Includes

- NitroStack TypeScript MCP server using `@nitrostack/core`
- Intake, triage, matching, discovery, reference, booking, filesystem, and calculator modules
- Zod schemas for patients, doctors, hospitals, specialties, appointments, and history records
- Local fixture data plus CSV-backed medical reference data
- Next.js widget app under `src/widgets`
- Example environment file at `.env.example`

## Requirements

- Node.js 20+
- npm
- NitroStack CLI, installed through project dependencies

## Run The MCP Server

```bash
npm install
npm run dev
```

For a production-style build and start:

```bash
npm run build
npm start
```

## Run The Widgets

```bash
npm run widget -- install
npm run widget -- run dev
```

The widget dev server runs from `src/widgets` and defaults to port `3001`.

## Configuration

Copy `.env.example` to `.env` if you need local overrides. The sample does not require API keys to run with the included fixture data.

## Data Files

- `fixtures/seed.json` contains sample patients, hospitals, doctors, specialties, and appointment data.
- `db_drug_interactions.csv` and `train-selected-columns.csv` provide local medical reference data for the demo.

## Notes

This project is intended as a hackathon sample, not medical advice or a production diagnostic system. Any real clinical workflow should include professional review, validated data sources, security hardening, and compliance checks.
