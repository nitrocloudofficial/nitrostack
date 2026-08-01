// TrustLayer AI — Centralized Frontend Configuration
// All frontend modules (extension, web portal, camera gauntlet) import or reference
// this config so updating the backend base URL for production is a 1-line edit.

const TRUSTLAYER_CONFIG = {
  // Backend Base API URL — Override via window.TRUSTLAYER_API_BASE if needed.
  // Standard development default: http://localhost:3000
  // Production default: https://api.trustlayer.ai
  BACKEND_BASE: (typeof window !== "undefined" && window.TRUSTLAYER_API_BASE)
    ? window.TRUSTLAYER_API_BASE
    : "http://localhost:3000",

  ENDPOINTS: {
    ANALYZE: "/api/analyze",
    VERIFY_UPLOAD: "/api/verify-upload",
    TRANSACTION: "/api/transaction"
  },

  // Fallback to offline mock responses if backend is unreachable (for robust demo fallback)
  ENABLE_MOCK_FALLBACK: true,

  // Debug logging
  DEBUG: false
};

// Expose globally for classic script tags and extensions
if (typeof window !== "undefined") {
  window.TRUSTLAYER_CONFIG = TRUSTLAYER_CONFIG;
}

// Module export for bundled environments (Next.js / CommonJS / ES Modules)
if (typeof module !== "undefined" && module.exports) {
  module.exports = TRUSTLAYER_CONFIG;
}
