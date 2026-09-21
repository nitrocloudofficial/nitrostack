# 🏥 Clinical Copilot MCP Server

An AI-powered medical copilot server built on the **Model Context Protocol (MCP)** using **NitroStack SDK**, **MongoDB Atlas**, **Supabase Storage**, **Pinecone Vector DB**, **Google Gemini 2.5 Flash**, and **Groq Llama 3.3 70B**.

The Clinical Copilot server provides medical professionals and AI assistants with automated document OCR, structured patient information extraction, chronological timeline sequencing, real-time clinical trial matching, and automated specialist referral PDF generation.

---

## 🌟 Key Features & Capabilities

- 📄 **Medical Document Processing & OCR**: Dual-stage PDF parsing engine utilizing `pdf-parse` with automatic zlib stream decompression fallback to handle complex clinical reports without failure.
- 🧬 **LLM Information Extraction**: Extracts patient profile data, diagnoses, active medications, lab values, and clinical summaries using **Google Gemini 2.5 Flash** (Primary) with automatic fallback to **Groq Llama 3.3 70B**.
- 📅 **Chronological Timeline Sequencing**: Automatically converts unstructured clinical discharge summaries into structured, time-stamped medical history events.
- 🎯 **Clinical Trials Matching**: Real-time integration with **ClinicalTrials.gov API v2** combined with LLM-powered patient eligibility scoring and inclusion/exclusion analysis.
- 📋 **Specialist Referral PDF Generation**: Automated synthesis of trial referral rationale into downloadable PDF documents stored in **Supabase Storage**.
- 🔍 **Vector Search & RAG**: Upserts clinical text embeddings into **Pinecone Vector Database** for semantic search and clinical retrieval.

---

## 🛠️ MCP Tools Overview

The server exposes 6 primary Model Context Protocol (MCP) tools:

| MCP Tool Name | Description | Key Parameters |
| :--- | :--- | :--- |
| `authenticate_user` | Authenticates users (`register` / `login`) and returns session JWT tokens. | `action`, `account`, `password`, `role` |
| `upload_medical_report` | Decodes base64 medical files/PDFs, uploads to Supabase Storage, and registers metadata in MongoDB. | `patientId`, `reportType`, `file`, `mimeType` |
| `extract_patient_information` | Runs OCR on uploaded reports and uses LLMs to extract structured patient data into MongoDB and Pinecone. | `patientId`, `reportId` |
| `update_medical_timeline` | Synthesizes chronological medical timeline events from processed patient reports. | `patientId` |
| `search_clinical_trials` | Matches patient profiles against ClinicalTrials.gov with LLM eligibility scoring. | `patientId`, `disease`, `location` |
| `generate_referral_letter` | Generates a clinical referral rationale and PDF stored in Supabase Storage. | `patientId`, `trialId` |

---

## 🏗️ Architecture & Technology Stack

- **Framework**: [NitroStack SDK](https://nitrostack.ai/) (TypeScript + Zod validation)
- **Database**: MongoDB Atlas (`users`, `patients`, `reports`, `timelines`, `referrals`, `trials`)
- **File Storage**: Supabase Storage (`medical-reports` bucket)
- **Vector Search**: Pinecone Index (`clinical-copilot`)
- **Primary LLM**: Google Gemini 2.5 Flash (`gemini-2.5-flash`)
- **Secondary LLM**: Groq Llama 3.3 70B (`llama-3.3-70b-versatile`)
- **PDF Engine**: `pdf-parse` + Custom PDFKit Document Generator

---

## 🚀 Quick Start & Installation

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- MongoDB Atlas cluster URI
- Supabase Project URL & Keys
- Google Gemini API Key / Groq API Key

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-username/Clinical_Copliot_MCP.git
cd Clinical_Copliot_MCP
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory by copying the template:

```bash
cp .env.example .env
```

Fill in your API credentials in `.env`:

```env
# Database Configuration (MongoDB Atlas)
MONGODB_URI="mongodb+srv://<username>:<password>@cluster.mongodb.net/"
DATABASE_NAME=clinical_copilot

# Supabase Storage & Auth Configuration
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
SUPABASE_STORAGE_BUCKET=medical-reports

# LLM Providers Configuration
GEMINI_API_KEY="your-gemini-api-key"
GROK_API_KEY="gsk_your_groq_api_key"

# Vector Database (Pinecone)
PINECONE_API_KEY="your-pinecone-api-key"
PINECONE_INDEX=clinical-copilot
```

### 3. Run Development Server

```bash
npm run dev
```

### 4. Run Automated End-to-End Tool Suite

Execute the integrated test suite that validates all 6 MCP tools against a test PDF report (`04_Discharge_Summary.pdf`):

```bash
npm run test:tools
```

### 5. Clear / Purge Database Data

To purge all collections from MongoDB Atlas and wipe uploaded files from Supabase Storage:

```bash
npm run clean:data
```

---

## ⚙️ MCP Client Configuration

Add the Clinical Copilot MCP server to your preferred MCP client (Claude Desktop, Cursor, or Windsurf):

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "clinical-copilot": {
      "command": "node",
      "args": [
        "C:/path/to/Clinical_Copliot_MCP/dist/index.js"
      ],
      "env": {
        "MONGODB_URI": "mongodb+srv://...",
        "DATABASE_NAME": "clinical_copilot",
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-key",
        "GEMINI_API_KEY": "your-key",
        "GROK_API_KEY": "your-key"
      }
    }
  }
}
```

---

## 📜 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more details.
