# TrustLayer AI — Frontend/Backend Contract Alignment

This document details all API endpoints, request payloads, and response interfaces consumed by Person 3's frontend components (`extension`, `portal`, `seller-gauntlet`). 

---

## 1. Request Payloads Emitted by Frontend

### `POST /api/analyze`
Sent by both the Chrome Extension (`content.js` / `popup.js`) and Web Upload Portal (`frontend/portal/`).

```json
{
  "title": "MacBook Pro 16 M2 Max",
  "price": "₹65,000",
  "description": "Urgent sale due to relocation. Willing to post. Contact whatsapp 9876543210",
  "entityFingerprint": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "platformSource": "olx_web",
  "image": "data:image/png;base64,..." // Optional screenshot base64 in Web Portal
}
```

> **Field Assumptions & Notes:**
> - `entityFingerprint`: Client-side **SHA-256 hash** of phone number/email extracted from text. Raw PII is **never** sent.
> - `platformSource`: String enum e.g. `"olx_web"`, `"facebook_marketplace"`, `"portal_upload"`.
> - `image`: Optional base64 screenshot string when uploaded via the Web Portal.

---

### `POST /api/verify-upload?code={code}`
Sent by the Seller's Camera Gauntlet page (`frontend/seller-gauntlet/page.html`).

```json
{
  "transactionId": "txn_123456",
  "image": "data:image/jpeg;base64,..."
}
```

> **Field Assumptions & Notes:**
> - `code`: Passed in URL query string `?code=XYZ123`.
> - `transactionId`: Extracted from path `/verify/txn_123456`.
> - `image`: Real-time camera canvas snapshot encoded in base64 JPEG.

---

### `GET /api/transaction/:id`
Polled by extension/portal to check for updated decision status after seller verification.

---

## 2. Response Interface Expected by Frontend (`TrustContext`)

```typescript
export interface Claim {
  id: string;
  source: string; // e.g. "listing.priceAnomalyCheck", "identity.sellerAge"
  fact: "price_deviation" | "account_age" | "suspicious_payment_link" | "known_scammer_fingerprint" | "price_normal" | string;
  value: string; // e.g. "-38%", "3 days", "external QR code"
  strength: number; // 0.0 - 1.0
}

export type DecisionState = "PROCEED" | "CAUTION" | "VERIFY" | "DO-NOT-PAY" | "ABORT";

export interface TrustContext {
  transactionId: string;
  decision: DecisionState;
  posterior: number; // Risk score 0.0 - 1.0 (e.g. 0.65 = 65% risk)
  claims: Claim[];
  verificationCode?: string; // Optional code generated if decision == "VERIFY"
  verificationUrl?: string;  // Optional URL generated if decision == "VERIFY"
}
```

---

## 3. Frontend Decision UI Mapping

| Decision State | Banner Color | Plain Language Summary | Action / Friction Level |
|---|---|---|---|
| `PROCEED` | `#2E7D32` (Green) | ✅ Looks safe to proceed | None |
| `CAUTION` | `#F9A825` (Yellow) | ⚠️ Risk factors detected | Informational evidence banner |
| `VERIFY` | `#EF6C00` (Orange) | 🔍 Verification recommended | Checklist + Seller Camera Gauntlet Link |
| `DO-NOT-PAY` | `#D32F2F` (Red) | 🚫 Do not send payment | Explicit "I understand" acknowledgement button |
| `ABORT` | `#B71C1C` (Dark Red) | ⛔ High-risk — abort transaction | 10-second cooldown + typed string override confirmation |

---

## 4. Centralized Backend Base URL

All frontend calls route through `TRUSTLAYER_CONFIG.BACKEND_BASE` (defined in `frontend/config.js`), ensuring production URL swaps require updating a single value across the entire frontend repo.
