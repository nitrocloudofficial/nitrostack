// frontend/extension/mock-trust-context.js
// Mock Trust Context responses — one per decision state.
// Swap MOCK_RESPONSE's value to test each UI state until the real
// backend endpoint (trust-context.interface.ts) is confirmed at Hour 6.

const MOCK_RESPONSES = {
  PROCEED: {
    transactionId: "txn_mock_proceed",
    claims: [
      { id: "c1", source: "listing.priceCheck", fact: "price_normal", value: "within market range", strength: 0.9 }
    ],
    posterior: 0.12,
    decision: "PROCEED"
  },
  CAUTION: {
    transactionId: "txn_mock_caution",
    claims: [
      { id: "c1", source: "listing.priceAnomalyCheck", fact: "price_deviation", value: "-38%", strength: 0.65 }
    ],
    posterior: 0.42,
    decision: "CAUTION"
  },
  VERIFY: {
    transactionId: "txn_mock_verify",
    claims: [
      { id: "c1", source: "listing.priceAnomalyCheck", fact: "price_deviation", value: "-38%", strength: 0.85 },
      { id: "c2", source: "identity.sellerAge", fact: "account_age", value: "3 days", strength: 0.7 }
    ],
    posterior: 0.65,
    decision: "VERIFY"
  },
  DO_NOT_PAY: {
    transactionId: "txn_mock_donotpay",
    claims: [
      { id: "c1", source: "payment.linkCheck", fact: "suspicious_payment_link", value: "external QR code", strength: 0.88 }
    ],
    posterior: 0.81,
    decision: "DO-NOT-PAY"
  },
  ABORT: {
    transactionId: "txn_mock_abort",
    claims: [
      { id: "c1", source: "identity.blacklistCheck", fact: "known_scammer_fingerprint", value: "matched", strength: 0.97 }
    ],
    posterior: 0.95,
    decision: "ABORT"
  }
  
};

// Change this line to test different states in the popup:
const MOCK_RESPONSE = MOCK_RESPONSES.CAUTION;