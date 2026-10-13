# 🛡️ TrustLayer AI — Fintech Transaction Safety & Fraud Prevention Infrastructure

> **NitroStack × Amrita University Hackathon Official Project Submission**  
> *Fintech-grade, privacy-preserving transaction safety infrastructure for P2P marketplaces (OLX, Facebook Marketplace) and Digital Payments.*

---

## 📌 Project Overview & Fintech Alignment

**TrustLayer AI** is a real-time, privacy-first **Fintech transaction copilot** built on the **official NitroStack TypeScript SDK**. Designed specifically for the **Fintech domain**, it acts as a proactive security layer that protects peer-to-peer buyers from online financial fraud, QR payment inversion scams (stealing funds via deceptive UPI codes), off-platform diversion traps, and price manipulation.

### 🌟 Key Innovations Implemented

1. **Intelligent Intervention (P3 Link Interception)**: Intercepts off-platform links (`wa.me`, `t.me`, `bit.ly`, `drive.google.com`) in real-time on marketplace pages, halting navigation and enforcing graduated behavioral friction.
2. **Physical-World Verification (In-Platform P1)**: Automatically injects a challenge code (`TL-8472`) into the marketplace chat. A DOM `MutationObserver` detects when the seller uploads a photo, sending it to the backend for real Tesseract.js OCR text verification.
3. **Privacy-First SHA-256 Data Capture**: Hashes seller phone numbers and emails locally in browser memory (`crypto.subtle.digest`) before network transmission. Real PII never leaves the device.
4. **Live RDAP WHOIS Domain Inspection**: Performs real-time queries to public RDAP WHOIS registries (`rdap.org`) to compute domain age in days dynamically.
5. **Dynamic Real Market Pricing**: Calculates exact percentage price deviations ($\frac{\text{Listed} - \text{Market}}{\text{Market}} \times 100$) dynamically against live web search medians and brand benchmark tables.
6. **Bounded Autonomy Policy Engine**: Verification tools add positive mitigation claims (`possession_verified`), allowing the Policy Engine to recalculate risk scores without violating architectural autonomy boundaries.
7. **Disk-Backed Persistent Storage**: Persists `TrustContext` objects and scammer hashes to `data/trust_contexts.json`, enabling cross-session seller reputation tracking across server restarts.

---

## 🏗️ Architecture

```
                               ┌────────────────────────────────────────────────┐
                               │             BROWSER EXTENSION                  │
                               │  - content.js (DOM Scraper, Link Interceptor)   │
                               │  - popup.js (Safety Coach UI, Glassmorphism)   │
                               └───────────────────────┬────────────────────────┘
                                                       │
                                                       ▼ REST API (Port 3000)
                               ┌────────────────────────────────────────────────┐
                               │           NITROSTACK HTTP TRANSPORT            │
                               │               (src/api-router.ts)              │
                               └───────────────────────┬────────────────────────┘
                                                       │
                               ┌───────────────────────┴────────────────────────┐
                               │            NITROSTACK DI SERVICES              │
                               ├────────────────────────────────────────────────┤
                               │ ├── ListingService     (Market Price Anomaly)  │
                               │ ├── IdentityService    (RDAP WHOIS Domain)     │
                               │ ├── ConversationService (Multilingual Scam Script)│
                               │ ├── PaymentService     (QR Inversion Check)    │
                               │ ├── ContextService     (Disk Persistence DB)   │
                               │ └── PolicyService      (Multiplicative Fusion) │
                               └────────────────────────────────────────────────┘
```

---

## 💻 Environment Setup & Prerequisites

Ensure your machine has:
* **Node.js**: v18.0.0 or higher (Latest LTS recommended)
* **npm** or **pnpm**
* **Git**
* **Google Chrome** (for testing the unpacked Extension)

---

## 🚀 Installation & Quick Start

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-org/trustlayer-ai.git
cd trustlayer-ai
npm install
```

### 2. Configure Environment Variables
Copy the `.env.example` file to create your `.env`:
```bash
cp .env.example .env
```
*(Optional: Add `OPENAI_API_KEY=your_key_here`. If unprovided, the system uses deterministic heuristic fallback engines automatically).*

### 3. Start Development Server
```bash
npm run dev
```
The server will initialize the NitroStack engine and bind REST API endpoints to `http://localhost:3000`.

---

## 🧩 Loading the Chrome Extension

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (top-right toggle switch).
3. Click **Load unpacked** (top-left button).
4. Select the directory:
   ```text
   trustlayer-ai/frontend/extension
   ```
5. The **TrustLayer AI** shield icon will appear in your Chrome toolbar!

---

## 🧪 Testing & Demonstration Guide

### Option A: Testing on Real OLX (`olx.in`)
1. Open any real listing or chat page on `https://www.olx.in`.
2. Click the floating cyan TrustLayer shield button in the bottom-right corner (or click the extension icon in your toolbar).
3. Watch as TrustLayer AI scrapes the listing on-demand, calculates market deviation, inspects domains, and renders the Safety Coach Overlay.

### Option B: Testing via Mock Marketplace Testbed
1. Open `mock-marketplace/index.html` in Chrome.
2. Select a test scenario from the top bar (e.g. `scenario2_suspicious`).
3. Click the extension icon to view the **VERIFY** orange alert banner.
4. Click **"Inject Request into Chat"** to watch the challenge message typed into chat.
5. Click **"Simulate Seller Uploading Photo"** to trigger DOM `MutationObserver` detection and Tesseract.js OCR verification!

---

## 📜 Official Scripts

* `npm run dev`: Starts the NitroStack dev server on port 3000.
* `npm run build`: Compiles TypeScript to production bundle in `dist/`.
* `npm start`: Runs production server bundle.
* `npm run test:p2`: Runs the test suite verifying all 6 core scam detection test cases.

---

## ⚖️ License & Track Compliance

Built strictly in compliance with the **NitroStack × Amrita University Hackathon Guidelines**, utilizing the official `@nitrostack/core` TypeScript SDK.
