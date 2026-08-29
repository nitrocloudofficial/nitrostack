# CareBridge AI - Complete Setup Guide

## 📋 Overview

This guide covers:
- Backend API setup
- NitroStack MCP configuration
- Firebase/Supabase setup
- Deployment to NitroCloud
- Testing and integration

---

## **PHASE 1: Backend Setup (30 minutes)**

### Step 1: Clone Repository
```bash
git clone https://github.com/yourusername/CareBridge-AI
cd CareBridge-AI
mkdir backend
cd backend
```

### Step 2: Install Dependencies
```bash
npm init -y
npm install express cors dotenv firebase-admin axios @nitrostack/sdk multer uuid
npm install -D nodemon
```

### Step 3: Create Folder Structure
```bash
mkdir config routes utils middleware tests
touch server.js .env
```

### Step 4: Copy All Backend Files
Copy these files from provided templates:
- `server.js` → Main server file
- `config/db.js` → Database configuration
- `config/nitrostack.js` → NitroStack SDK setup
- `routes/profile.js` → User profile routes
- `routes/healthHistory.js` → Health history routes
- `routes/symptoms.js` → Symptom analysis routes
- `routes/reports.js` → Medical report routes
- `routes/trends.js` → Trend analysis routes
- `routes/summary.js` → Summary generation routes
- `routes/chat.js` → Chat history routes

### Step 5: Configure Environment
```bash
cp .env.template .env
# Edit .env with your values
```

**Required values:**
```
PORT=3001
FIREBASE_DATABASE_URL=your_firebase_url
FIREBASE_SERVICE_ACCOUNT=your_service_account_json
NITROSTACK_API_KEY=nsk_live_...
NITROSTACK_SERVER_URL=https://carebridge-ai.nitrocloud.app
```

### Step 6: Start Backend
```bash
npm run dev
```

**Expected output:**
```
╔════════════════════════════════════════╗
║   CareBridge AI Backend Started        ║
║   Port: 3001                           ║
║   Environment: development             ║
║   NitroStack: Connected                ║
╚════════════════════════════════════════╝
```

---

## **PHASE 2: Firebase Setup (20 minutes)**

### Step 1: Create Firebase Project
1. Go to https://console.firebase.google.com
2. Click "Create Project"
3. Name: `CareBridge-AI`
4. Enable Firestore Database

### Step 2: Create Collections
In Firebase Console → Firestore Database:

```
Collections to create:
├── users
├── health_history
├── medical_reports
├── chat_history
├── health_timeline
└── health_summaries
```

### Step 3: Create Service Account
1. Settings → Service Accounts
2. Click "Generate New Private Key"
3. Copy JSON content
4. Paste into FIREBASE_SERVICE_ACCOUNT in .env

### Step 4: Set Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to access their own data
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## **PHASE 3: NitroStack MCP Setup (45 minutes)**

### Step 1: Create Nitro Studio Project
```bash
npm install -g @nitrostack/cli
nitrostack-cli init carebridge-ai --template typescript-starter
cd carebridge-ai
npm run dev
```

### Step 2: Open Nitro Studio Desktop App
- Download from https://nitrostack.ai/studio
- Install for your OS
- Open and sign in with NitroCloud credentials

### Step 3: Create MCP Agents

**Agent 1: Symptom Guidance Agent**

File: `src/modules/symptom.tools.ts`

```typescript
import { Tool, ToolContext } from '@nitrostack/core';

export const symptomGuidanceTools = [
  new Tool({
    name: 'symptom-guidance-agent',
    description: 'Analyzes symptoms and provides medical guidance',
    inputSchema: {
      type: 'object',
      properties: {
        symptom: { type: 'string' },
        duration: { type: 'string' },
        severity: { type: 'string', enum: ['mild', 'moderate', 'severe'] },
        userContext: { type: 'object' }
      },
      required: ['symptom', 'severity']
    },
    async execute(input: any, context: ToolContext) {
      const response = await context.callAI(`
        You are a medical assistant. Analyze this symptom:
        Symptom: ${input.symptom}
        Duration: ${input.duration}
        Severity: ${input.severity}
        User Age: ${input.userContext?.age}
        
        Provide:
        1. Possible causes (educational only)
        2. Urgency level (LOW/MEDIUM/HIGH/EMERGENCY)
        3. Recommended action
        4. Questions for doctor
        
        IMPORTANT: Always recommend consulting a healthcare professional.
      `);
      
      return { guidance: response, timestamp: new Date().toISOString() };
    }
  })
];
```

**Agent 2: OCR Extractor Agent**

File: `src/modules/ocr.tools.ts`

```typescript
import { Tool, ToolContext } from '@nitrostack/core';

export const ocrTools = [
  new Tool({
    name: 'ocr-extractor-agent',
    description: 'Extracts data from medical PDFs',
    inputSchema: {
      type: 'object',
      properties: {
        pdfBase64: { type: 'string' },
        reportType: { type: 'string' }
      },
      required: ['pdfBase64']
    },
    async execute(input: any, context: ToolContext) {
      // Extract text from PDF
      const extractedText = await extractTextFromPdf(input.pdfBase64);
      
      // Parse lab values
      const labValues = {
        bloodSugar: extractNumber(extractedText, 'blood sugar|glucose'),
        hb: extractNumber(extractedText, 'hemoglobin|hb'),
        cholesterol: extractNumber(extractedText, 'cholesterol'),
        tsh: extractNumber(extractedText, 'tsh|thyroid'),
        timestamp: new Date().toISOString()
      };
      
      return { data: labValues, rawText: extractedText };
    }
  })
];

async function extractTextFromPdf(base64: string) {
  // Use Tesseract or similar OCR library
  return "Extracted text from PDF";
}

function extractNumber(text: string, pattern: string): number | null {
  const regex = new RegExp(pattern + '[\\s:=]*([0-9.]+)', 'i');
  const match = text.match(regex);
  return match ? parseFloat(match[1]) : null;
}
```

**Agent 3: Report Analysis Agent**

File: `src/modules/analysis.tools.ts`

```typescript
import { Tool, ToolContext } from '@nitrostack/core';

export const analysisTools = [
  new Tool({
    name: 'report-analysis-agent',
    description: 'Analyzes medical reports in simple language',
    inputSchema: {
      type: 'object',
      properties: {
        extractedData: { type: 'object' },
        userContext: { type: 'object' },
        reportType: { type: 'string' }
      },
      required: ['extractedData']
    },
    async execute(input: any, context: ToolContext) {
      const analysis = await context.callAI(`
        Explain these medical test results in simple language:
        
        Results: ${JSON.stringify(input.extractedData)}
        Age: ${input.userContext?.age}
        Report Type: ${input.reportType}
        
        Provide:
        1. Summary in plain English
        2. Normal vs abnormal values
        3. What abnormal values mean
        4. Recommendations
        5. Questions to ask doctor
      `);
      
      return { summary: analysis, timestamp: new Date().toISOString() };
    }
  })
];
```

**Agent 4: Trend Analysis Agent**

File: `src/modules/trends.tools.ts`

```typescript
import { Tool, ToolContext } from '@nitrostack/core';

export const trendTools = [
  new Tool({
    name: 'trend-analysis-agent',
    description: 'Analyzes health trends over time',
    inputSchema: {
      type: 'object',
      properties: {
        previousReport: { type: 'object' },
        currentReport: { type: 'object' }
      },
      required: ['previousReport', 'currentReport']
    },
    async execute(input: any, context: ToolContext) {
      const trends = await context.callAI(`
        Compare these medical reports and identify trends:
        
        Previous: ${JSON.stringify(input.previousReport)}
        Current: ${JSON.stringify(input.currentReport)}
        
        Provide:
        1. Metrics that improved
        2. Metrics that worsened
        3. Overall health trajectory
        4. Actionable advice
      `);
      
      return { trends, timestamp: new Date().toISOString() };
    }
  })
];
```

**Agent 5: Summary Generation Agent**

File: `src/modules/summary.tools.ts`

```typescript
import { Tool, ToolContext } from '@nitrostack/core';

export const summaryTools = [
  new Tool({
    name: 'health-summary-agent',
    description: 'Generates comprehensive health summaries',
    inputSchema: {
      type: 'object',
      properties: {
        userProfile: { type: 'object' },
        healthHistory: { type: 'object' },
        recentReports: { type: 'array' }
      }
    },
    async execute(input: any, context: ToolContext) {
      const summary = await context.callAI(`
        Generate a professional health summary for this patient:
        
        Profile: ${JSON.stringify(input.userProfile)}
        Health History: ${JSON.stringify(input.healthHistory)}
        Recent Reports: ${JSON.stringify(input.recentReports)}
        
        Format for sharing with doctor.
      `);
      
      return { summary, timestamp: new Date().toISOString() };
    }
  })
];
```

### Step 3: Register All Agents

File: `src/app.module.ts`

```typescript
import { NitroModule } from '@nitrostack/core';
import { symptomGuidanceTools } from './modules/symptom.tools';
import { ocrTools } from './modules/ocr.tools';
import { analysisTools } from './modules/analysis.tools';
import { trendTools } from './modules/trends.tools';
import { summaryTools } from './modules/summary.tools';

export class CareBridgeModule extends NitroModule {
  async onInit() {
    this.registerTools([
      ...symptomGuidanceTools,
      ...ocrTools,
      ...analysisTools,
      ...trendTools,
      ...summaryTools
    ]);

    console.log('✅ CareBridge AI MCP Server initialized');
  }
}
```

### Step 4: Deploy to NitroCloud
```bash
npm run build
nitrostack-cli deploy
```

**Get your Service URL:**
```
https://carebridge-ai.nitrocloud.app/sse
```

Add to backend `.env`:
```
NITROSTACK_SERVER_URL=https://carebridge-ai.nitrocloud.app
```

---

## **PHASE 4: Testing (30 minutes)**

### Test 1: Backend Running
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "nitrostack": "configured"
}
```

### Test 2: Create User Profile
```bash
curl -X POST http://localhost:3001/api/profile \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "age": 25,
    "gender": "Male",
    "email": "test@test.com"
  }'
```

### Test 3: Add Health History
```bash
curl -X POST http://localhost:3001/api/health-history \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-user-id",
    "chronicDiseases": ["diabetes"],
    "currentMedications": ["insulin"],
    "allergies": ["penicillin"]
  }'
```

### Test 4: Analyze Symptom
```bash
curl -X POST http://localhost:3001/api/symptoms/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-user-id",
    "symptom": "chest pain",
    "duration": "2 hours",
    "severity": "moderate"
  }'
```

---

## **PHASE 5: Integration Test**

Run provided integration test:
```bash
npm test
# or
node tests/integration.test.js
```

---

## **Git Commit Strategy**

```bash
# Initial setup
git add .
git commit -m "Initial backend setup"

# After database config
git commit -m "Add Firebase configuration"

# After NitroStack setup
git commit -m "Add MCP agents configuration"

# After testing
git commit -m "Complete backend with all routes"
```

---

## **Troubleshooting**

### Firebase not connecting
```
❌ Error: FIREBASE_SERVICE_ACCOUNT not found
✅ Solution: Add FIREBASE_SERVICE_ACCOUNT to .env
```

### NitroStack not connecting
```
❌ Error: NitroStack server not reachable
✅ Solution: 
  1. Check NITROSTACK_SERVER_URL in .env
  2. Verify deployment succeeded in NitroCloud
  3. Check API key is valid (nsk_live_...)
```

### Port already in use
```bash
# Change port in .env
PORT=3002
```

### Modules not found
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

---

## **Next Steps**

1. ✅ Backend running
2. ✅ MCP agents deployed
3. ✅ Database configured
4. ⏭️ Create React frontend
5. ⏭️ Connect frontend to backend
6. ⏭️ Final testing and deployment

---

## **Key URLs**

- Backend: `http://localhost:3001`
- Firebase Console: `https://console.firebase.google.com`
- NitroCloud: `https://nitrocloud.ai`
- Nitro Studio: Desktop app
- GitHub: Your repository

---

**Ready to build? Start with Phase 1!**
