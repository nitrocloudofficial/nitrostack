<img src="femmon_logo.png" alt="Alt Text" width="500">

# PCOS Health Assistant – MCP Server

A production-quality clinical decision-support MCP server for analyzing hormone reports and providing personalized PCOS management recommendations.

## Overview

The PCOS Health Assistant is a Model Context Protocol (MCP) server that:

1. **Imports reference data** – Loads menstrual cycle patterns from CSV datasets
2. **Extracts lab values** – Parses hormone reports (PDFs) to extract medically relevant markers
3. **Analyzes findings** – Compares extracted values against reference patterns and identifies abnormalities
4. **Recommends plans** – Suggests personalized diet and exercise recommendations
5. **Generates reports** – Creates professional downloadable reports with all findings and recommendations
6. **Cleans up** – Securely deletes temporary files to protect patient privacy

## Privacy & Compliance

✅ **No patient data stored** – All uploaded PDFs and extracted values are temporary  
✅ **No identifiers** – Reference datasets contain only medical metrics, no participant IDs  
✅ **Automatic cleanup** – Temporary files deleted after processing  
✅ **Clinical decision support only** – Not a diagnostic tool; requires healthcare provider review  

## Project Structure

```
src/
├── app.module.ts              # Root module, registers PCOSModule
├── index.ts                   # MCP server entry point
├── mongodb.ts                 # MongoDB connection & collection initialization
├── pcos/
│   └── pcos.module.ts         # PCOS feature module
├── tools/
│   ├── importCycleDataset.ts  # Tool 1: Import CSV reference data
│   ├── extractLabReport.ts    # Tool 2: Extract lab values from PDF
│   ├── analyzePCOS.ts         # Tool 3: Analyze findings & recommend plans
│   ├── generateReport.ts      # Tool 4: Generate downloadable report
│   └── clearTemporaryFiles.ts # Tool 5: Delete temporary files
└── utils/
    ├── csv.ts                 # CSV parsing & filtering
    ├── pdf.ts                 # PDF extraction & validation
    └── similarity.ts          # Pattern matching & scoring

data/
├── datasets/
│   └── FedCycleData071012.csv # Reference menstrual cycle data
├── uploads/                   # Temporary uploaded PDFs (auto-cleaned)
└── generated_reports/         # Generated report files
```

## MongoDB Collections

All collections contain **reference data only** (no patient information):

- **cycle_patterns** – Menstrual cycle metrics (FSH/LH ratio, testosterone, cycle length, etc.)
- **diet_plans** – Nutrition recommendations keyed by phenotype/hormone profile
- **exercise_plans** – Fitness recommendations keyed by fitness level and cycle phase
- **pcos_guidelines** – Clinical explanations for identified findings

## Tools

### 1. importCycleDataset()

**Purpose:** Load reference menstrual cycle data from CSV  
**Input:** File path (optional; defaults to `data/datasets/FedCycleData071012.csv`)  
**Output:** Import statistics (records imported, duplicates skipped)  
**Privacy:** Filters out participant identifiers; keeps only medical metrics

```
Input:  { filePath: "data/datasets/FedCycleData071012.csv" }
Output: { status: "success", imported: 10, duplicates: 0, total_processed: 10 }
```

### 2. extractLabReport()

**Purpose:** Extract lab values from uploaded hormone report PDF  
**Input:** Base64-encoded PDF file  
**Output:** Temporary JSON with extracted lab values  
**Privacy:** No storage; values exist only in memory during processing

```
Input:  { file_name: "report.pdf", file_type: "application/pdf", file_content: "JVBERi..." }
Output: { status: "success", lab_values: { lh: 12, fsh: 4, testosterone: 0.8, ... } }
```

### 3. analyzePCOS()

**Purpose:** Analyze lab values against reference patterns  
**Input:** Extracted lab values + fitness level  
**Output:** Findings, explanations, diet/exercise recommendations, confidence score  
**Privacy:** No storage; analysis is stateless

```
Input:  { lab_values: { lh: 12, fsh: 4, testosterone: 0.8, ... }, fitness_level: "intermediate" }
Output: {
  status: "success",
  findings: ["elevated_lh_fsh_ratio", "elevated_testosterone"],
  explanations: { ... },
  diet_recommendation: { name: "Low Glycemic Index Diet", ... },
  exercise_recommendation: { name: "Follicular Phase Workout", ... },
  confidence_score: 85
}
```

### 4. generateReport()

**Purpose:** Generate professional downloadable report  
**Input:** Lab values, findings, recommendations, confidence score  
**Output:** Report file path + download URL  
**Privacy:** Report stored with UUID filename only (no patient identifiers)

```
Input:  { lab_values: {...}, findings: [...], confidence_score: 85 }
Output: { status: "success", report_id: "report_1234567890", file_path: "...", download_url: "/reports/report_1234567890.txt" }
```

### 5. clearTemporaryFiles()

**Purpose:** Delete temporary uploaded PDFs and extracted data  
**Input:** Optional specific file path  
**Output:** Cleanup status + count of deleted files  
**Privacy:** Ensures no temporary data remains after processing

```
Input:  { file_path: null }  # Clears entire uploads/ directory
Output: { status: "success", deleted_count: 3, uploads_directory: "..." }
```

## Setup & Configuration

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (or local MongoDB instance)
- NitroStack SDK

### Environment Variables

Create a `.env` file in the project root:

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=pcos_assistant

# Server
NODE_ENV=development
```

### Installation

```bash
# Install dependencies
npm install

# Install widget dependencies
npm --prefix src/widgets install

# Start dev server
npm run dev
```

## Usage Example

### Workflow: Analyze a Patient's Hormone Report

1. **Extract lab values** from uploaded PDF:
   ```
   User: "Extract lab values from my hormone report"
   → Tool: extractLabReport() → Returns: { lh: 12, fsh: 4, testosterone: 0.8, ... }
   ```

2. **Analyze findings** against reference data:
   ```
   User: "Analyze these lab values"
   → Tool: analyzePCOS() → Returns: { findings: [...], diet_plan: {...}, exercise_plan: {...} }
   ```

3. **Generate downloadable report**:
   ```
   User: "Generate a report with these findings"
   → Tool: generateReport() → Returns: { report_id: "...", download_url: "..." }
   ```

4. **Clean up temporary files**:
   ```
   User: "Clean up temporary files"
   → Tool: clearTemporaryFiles() → Returns: { deleted_count: 1 }
   ```

## Medical Disclaimer

⚠️ **This is a clinical decision-support tool only.**

- Does NOT diagnose diseases
- Does NOT replace professional medical advice
- Requires review by a qualified healthcare provider
- All recommendations should be discussed with a physician

## Architecture

### Technology Stack

- **Framework:** NitroStack SDK (TypeScript)
- **Database:** MongoDB Atlas
- **Transport:** MCP (Model Context Protocol)
- **PDF Processing:** pdf-parse (for production; simplified in MVP)
- **CSV Processing:** Native Node.js file I/O

### Design Principles

✅ **Modular** – Each tool is independent and reusable  
✅ **Stateless** – No session state; each request is self-contained  
✅ **Privacy-first** – Temporary data only; automatic cleanup  
✅ **Error-resilient** – Graceful error handling with detailed logging  
✅ **Testable** – Each utility function is pure and unit-testable  

## Development

### Running Tests

```bash
# Typecheck
npm run build

# Dev server
npm run dev
```

### Adding New Tools

1. Create a new tool file in `src/tools/`
2. Implement the tool class with `@Tool` decorator
3. Register in `src/pcos/pcos.module.ts`
4. Add utility functions to `src/utils/` as needed

### Adding New Reference Data

1. Add CSV file to `data/datasets/`
2. Update `src/utils/csv.ts` to filter relevant columns
3. Create MongoDB collection in `src/mongodb.ts`
4. Seed data in `initializeCollections()`

## Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure MongoDB Atlas with IP whitelist
- [ ] Set strong `MONGODB_URI` credentials
- [ ] Enable HTTPS for all connections
- [ ] Configure rate limiting on API endpoints
- [ ] Set up monitoring and alerting
- [ ] Review and test error handling
- [ ] Audit all temporary file cleanup
- [ ] Document medical disclaimers prominently

## Support & Maintenance

- **Logs:** Check `src/index.ts` for logging configuration
- **Errors:** All errors logged via `ctx.logger.error()`
- **Monitoring:** Integrate with Sentry or similar for production
- **Updates:** Keep MongoDB driver and dependencies current

## License

Proprietary – Clinical Decision Support Tool

---

**Built with NitroStack SDK**  
For questions or issues, contact the development team.
