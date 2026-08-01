// TrustLayer AI — Extension Configuration
const TRUSTLAYER_CONFIG = {
  // Backend Base API URL
  BACKEND_BASE: (typeof window !== "undefined" && window.TRUSTLAYER_API_BASE)
    ? window.TRUSTLAYER_API_BASE
    : "http://localhost:3000",

  ENDPOINTS: {
    ANALYZE: "/api/analyze",
    VERIFY_UPLOAD: "/api/verify-upload",
    TRANSACTION: "/api/transaction"
  },

  // Fallback to offline mock responses if backend is unreachable
  ENABLE_MOCK_FALLBACK: false,

  // Debug logging
  DEBUG: false
};

// Expose globally for browser extension content script and popup
if (typeof window !== "undefined") {
  window.TRUSTLAYER_CONFIG = TRUSTLAYER_CONFIG;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = TRUSTLAYER_CONFIG;
}
