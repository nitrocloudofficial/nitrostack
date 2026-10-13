# INTEGRATION.md

**Purpose:** Describe external APIs and integration strategies for ClinicaMind.

## PubMed (NCBI E-utilities)

Use NCBI Entrez E-utilities to search PubMed.

### Example Flow

1. Search for relevant article IDs:
   ```text
   https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=diabetes%20pneumonia&retmax=3&api_key=YOUR_KEY
   ```
2. Fetch article details:
   ```text
   https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=12345678&retmode=json
   ```

### Notes
- API key is optional but increases rate limits.
- Use query parameters safely and URL-encode search text.
- NCBI docs: https://www.ncbi.nlm.nih.gov/books/NBK25497/

## OpenFDA Drug Label API

Use OpenFDA drug label data to detect interaction and warning language.

### Example Endpoint

```text
https://api.fda.gov/drug/label.json?search=openfda.brand_name:"ASPIRIN"&limit=1
```

### Sample Query

- Search by drug name in the active ingredient or label text.
- Extract fields like `warnings`, `drug_interactions`, and `adverse_reactions`.

### Notes
- OpenFDA is public but not clinical-grade.
- Use a static fallback dataset for stable demos.

## Speech Recognition

### Browser Approach

Use the Web Speech API for local transcription in the browser.

```js
const recognition = new window.webkitSpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;
recognition.onresult = (event) => {
  const transcript = event.results[event.resultIndex][0].transcript;
  console.log(transcript);
};
recognition.start();
```

### Server Approach

For backend transcription, use Whisper or another STT provider. This prototype prefers browser STT for simplicity.

## Drug Interaction Data

If OpenFDA is unavailable, use a static JSON fallback such as:

```json
{
  "Aspirin": { "interactsWith": ["Warfarin", "Ibuprofen"] },
  "Penicillin": { "allergy": true }
}
```

## Mock Data Strategy

Store deterministic patient data in `src/resources/patients.json` or a similar file.

Example:

```json
{
  "1234": {
    "conditions": ["hypertension"],
    "allergies": ["Penicillin"],
    "medications": ["Lisinopril"]
  }
}
```

## API Summary

| API/Resource | Purpose | Example Endpoint |
|---|---|---|
| PubMed E-utilities | Medical literature search | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=diabetes%20treatment` |
| OpenFDA Drug Label | Drug warnings and interactions | `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"ASPIRIN"` |
| Web Speech API | Browser STT | `SpeechRecognition` via browser API |
| Static drug matrix | Stable interaction lookup | `src/resources/drug-interactions.json` |

## Data Caveats

- PubMed and OpenFDA are public resources.
- This prototype is not a certified clinical system.
- Use mock or de-identified data to protect privacy.

This integration guide gives API endpoints, sample code, and fallback strategies for stable ClinicaMind development.
