// TrustLayer AI — Extension Popup Script
// Renders the Safety Coach widget from a Trust Context response object.

const config = window.TRUSTLAYER_CONFIG || {
  BACKEND_BASE: "http://localhost:3000",
  ENDPOINTS: { ANALYZE: "/api/analyze" },
  ENABLE_MOCK_FALLBACK: false
};

const DECISION_CONFIG = {
  PROCEED: {
    color: "#2e7d32",
    label: "✅ Looks safe to proceed",
    friction: "none"
  },
  CAUTION: {
    color: "#f9a825",
    label: "⚠️ Some risk factors found",
    friction: "checklist"
  },
  VERIFY: {
    color: "#ef6c00",
    label: "🔍 Verification recommended",
    friction: "checklist"
  },
  "DO-NOT-PAY": {
    color: "#d32f2f",
    label: "🚫 Do not send payment",
    friction: "checklist"
  },
  ABORT: {
    color: "#b71c1c",
    label: "⛔ High-risk — abort transaction",
    friction: "checklist"
  }
};

async function loadTrustContext() {
  try {
    // 1. Request listing capture from content script on active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let listingData = null;

    let errorMessage = "Failed to read marketplace page. Please refresh the page!";
    if (tab && tab.id) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: "captureListing" });
        if (response) {
          if (response.ok) {
            listingData = response.data;
          } else {
            errorMessage = "Content script error: " + response.error;
          }
        }
      } catch (e) {
        errorMessage = "Connection error: " + e.message;
      }
    }

    if (!listingData) {
      // If we couldn't scrape the page, don't silently pretend it's safe.
      return {
        transactionId: "txn_error",
        decision: "CAUTION",
        posterior: 0.5,
        claims: [{ fact: "system_status", value: errorMessage }]
      };
    }

    // 2. Fetch Trust Context from backend API
    const res = await fetch(`${config.BACKEND_BASE}${config.ENDPOINTS.ANALYZE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(listingData)
    });

    if (!res.ok) throw new Error(`API responded ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      transactionId: "txn_fallback",
      claims: [{ id: "c1", source: "system", fact: "system_status", value: `TrustLayer backend is unreachable: ${err.message}. Ensure the server is running.`, strength: 0.5 }],
      posterior: 0.4,
      decision: "CAUTION"
    };
  }
}

function claimToPlainLanguage(claim) {
  const templates = {
    price_deviation: (c) => `Listed price is ${c.value} relative to market average.`,
    account_age: (c) => `Seller's account is only ${c.value} old.`,
    suspicious_payment_link: (c) => `Payment method flagged: ${c.value}.`,
    known_scammer_fingerprint: (c) => `Contact matches known scam pattern database.`,
    price_normal: (c) => `Listed price is ${c.value}.`
  };
  const fn = templates[claim.fact];
  return fn ? fn(claim) : `${claim.fact.replace(/_/g, " ")}: ${claim.value}`;
}

function renderClaims(claims) {
  const list = document.getElementById("claims");
  list.innerHTML = "";
  (claims || []).forEach((claim) => {
    const li = document.createElement("li");
    li.textContent = claimToPlainLanguage(claim);
    list.appendChild(li);
  });
}

function renderActionArea(decision, context) {
  const area = document.getElementById("action-area");
  area.innerHTML = "";

  const hasFakeQr = (context && context.claims || []).some(c => c.type === 'QR_INVERSION' || c.fact === 'qr_claim_mismatch');
  if (hasFakeQr) {
    const alertBox = document.createElement("div");
    alertBox.style.cssText = "background: #3a0a0a; border: 2px solid #ff4444; padding: 12px; border-radius: 8px; margin-bottom: 12px; animation: pulseRed 2s infinite;";
    alertBox.innerHTML = `
      <strong style="color: #ff4444; font-size: 13.5px; display: block; margin-bottom: 4px; text-transform: uppercase;">🚨 FINANCIAL FRAUD ALERT</strong>
      <p style="font-size: 12px; color: #ffcccc; margin: 0; font-weight: bold; line-height: 1.4;">DO NOT SCAN THIS QR CODE! It is a payment request trying to deduct money from your account, NOT a refund as claimed.</p>
    `;
    area.appendChild(alertBox);
  }

  const cfg = DECISION_CONFIG[decision] || DECISION_CONFIG.PROCEED;

  switch (cfg.friction) {
    case "none":
    case "evidence-banner":
      break;

    case "checklist": {
      const box = document.createElement("div");
      box.style.cssText = "font-size: 13px; color: var(--text); background: var(--surface-raised); padding: 10px; border-radius: 6px; border: 1px solid var(--line);";
      const message = context && context.verificationMessage ? context.verificationMessage : "Please provide a live photo with a code.";
      const txn = context && context.transactionId ? context.transactionId : "txn_123";
      
      box.innerHTML = `
        <strong>Action Required: In-Platform Verification</strong>
        <p style="margin: 4px 0 8px; color: var(--text-muted);">Ask the seller to take a live photo with a random code to prove they possess the item.</p>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button id="injectVerifyBtn" style="width: 100%; background: #2DD4A8; color: #06120E; padding: 8px 10px; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 12px;">Inject Request into Chat</button>
        </div>
      `;
      area.appendChild(box);

      setTimeout(() => {
        const injectBtn = document.getElementById("injectVerifyBtn");
        if (injectBtn) {
          injectBtn.addEventListener("click", async () => {
            injectBtn.textContent = "Injecting...";
            injectBtn.disabled = true;
            try {
              const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
              if (tab && tab.id) {
                chrome.tabs.sendMessage(tab.id, { 
                  action: "injectVerification", 
                  message,
                  transactionId: txn
                });
                injectBtn.textContent = "Request Sent!";
                injectBtn.style.background = "#1C8A6E";
              }
            } catch (e) {
              injectBtn.textContent = "Failed";
            }
          });
        }
      }, 0);
      break;
    }

    case "ack": {
      const btn = document.createElement("button");
      btn.id = "ack-btn";
      btn.textContent = "I understand — do not send payment";
      btn.addEventListener("click", () => {
        btn.textContent = "Acknowledged — High Risk Alert Saved";
        btn.disabled = true;
      });
      area.appendChild(btn);
      break;
    }

    case "confirm-cooldown": {
      const label = document.createElement("label");
      label.style.cssText = "font-size: 12px; color: var(--text-muted); display: block;";
      label.textContent = 'Type "I ACCEPT THE RISK" to override:';
      area.appendChild(label);

      const input = document.createElement("input");
      input.id = "confirm-input";
      input.type = "text";
      input.placeholder = "I ACCEPT THE RISK";
      area.appendChild(input);

      const cooldownNote = document.createElement("div");
      cooldownNote.id = "cooldown-note";
      cooldownNote.textContent = "Override available in 10s...";
      area.appendChild(cooldownNote);

      let seconds = 10;
      const timer = setInterval(() => {
        seconds -= 1;
        if (seconds <= 0) {
          clearInterval(timer);
          cooldownNote.textContent = "Override unlock available.";
        } else {
          cooldownNote.textContent = `Override available in ${seconds}s...`;
        }
      }, 1000);
      break;
    }
  }
}

function renderSafetyCoach(trustContext) {
  const { decision, claims } = trustContext;
  const cfg = DECISION_CONFIG[decision] || DECISION_CONFIG.PROCEED;

  const banner = document.getElementById("banner");
  banner.textContent = cfg.label;
  banner.style.background = cfg.color;

  renderClaims(claims);
  renderActionArea(decision, trustContext);
}

loadTrustContext().then(renderSafetyCoach);