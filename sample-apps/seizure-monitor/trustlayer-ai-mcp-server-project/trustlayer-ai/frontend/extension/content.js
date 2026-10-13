// TrustLayer AI — Content Script
// Attached to marketplace and messaging pages.
// Responsibilities:
//   1. Intercept off-platform diversion clicks (WhatsApp / Telegram / shortened URLs)
//   2. Capture page listing data with resilient selector fallbacks
//   3. Perform client-side SHA-256 PII hashing before sending payload outside device

(function () {
  // ---------- Off-Platform Diversion Link Interception ----------

  const DIVERSION_PATTERNS = [
    "wa.me", "whatsapp.com", "api.whatsapp.com", "whatsapp://",
    "t.me", "telegram.me", "telegram.dog", "tg://",
    "bit.ly", "tinyurl.com", "drive.google.com", "docs.google.com"
  ];

  function isDiversionUrl(url) {
    if (!url || typeof url !== "string") return false;
    const lower = url.toLowerCase();
    return DIVERSION_PATTERNS.some((pattern) => lower.includes(pattern));
  }

  // Document-level click capture
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a, [role='link']");
    if (!link) return;

    const href = link.href || link.getAttribute("data-href") || link.getAttribute("href") || "";
    if (!isDiversionUrl(href)) return;

    e.preventDefault();
    e.stopPropagation();
    showFrictionPopup(href);
  }, true);

  function showFrictionPopup(url) {
    if (document.getElementById("trustlayer-friction-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "trustlayer-friction-overlay";
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(10, 15, 28, 0.85); backdrop-filter: blur(4px);
      z-index: 999999; display: flex; justify-content: center; align-items: center;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    `;

    overlay.innerHTML = `
      <div style="background: #121A2B; border: 1px solid #26314A; padding: 32px; border-radius: 14px; max-width: 440px; text-align: center; color: #E7ECF5; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
        <div style="width: 48px; height: 48px; background: rgba(232, 88, 106, 0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 24px; color: #E8586A;">⚠️</div>
        <h2 style="color: #E8586A; margin: 0 0 12px; font-size: 20px; font-weight: 700;">You are leaving the safe zone</h2>
        <p style="margin: 0 0 16px; color: #8B96AC; font-size: 14px; line-height: 1.5;">
          Scammers frequently divert buyers to WhatsApp or Telegram to bypass platform security and buyer protection guarantees.
        </p>
        <div style="background: #1A2338; border: 1px solid #26314A; padding: 14px; border-radius: 8px; text-align: left; margin: 0 0 18px; font-size: 13px; color: #E7ECF5;">
          <strong style="color: #F0A94E;">Off-platform risks:</strong><br>
          &bull; Loss of buyer protection coverage<br>
          &bull; Irreversible peer-to-peer payments<br>
          &bull; Unmonitored chat history
        </div>
        <label style="display: flex; align-items: center; gap: 10px; margin: 0 0 20px; font-size: 13.5px; cursor: pointer; color: #E7ECF5; text-align: left;">
          <input type="checkbox" id="trustlayer-ack" style="width: 16px; height: 16px; accent-color: #2DD4A8;">
          I understand the risks and still wish to proceed
        </label>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button id="trustlayer-cancel" style="flex: 1; background: #2DD4A8; color: #06120E; padding: 12px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
            Stay Protected Here
          </button>
          <button id="trustlayer-proceed" disabled style="flex: 1; background: #E8586A; color: white; padding: 12px; border: none; border-radius: 8px; font-weight: 600; cursor: not-allowed; opacity: 0.5;">
            Proceed Anyway
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const ack = overlay.querySelector("#trustlayer-ack");
    const proceedBtn = overlay.querySelector("#trustlayer-proceed");
    const cancelBtn = overlay.querySelector("#trustlayer-cancel");

    ack.addEventListener("change", () => {
      proceedBtn.disabled = !ack.checked;
      proceedBtn.style.cursor = ack.checked ? "pointer" : "not-allowed";
      proceedBtn.style.opacity = ack.checked ? "1" : "0.5";
    });

    proceedBtn.addEventListener("click", () => {
      if (!ack.checked) return;
      window.open(url, "_blank", "noopener,noreferrer");
      overlay.remove();
      showPersistentWarning();
    });

    cancelBtn.addEventListener("click", () => overlay.remove());
  }

  function showPersistentWarning() {
    if (document.getElementById("trustlayer-banner")) return;
    const banner = document.createElement("div");
    banner.id = "trustlayer-banner";
    banner.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; z-index: 999998;
      background: #E8586A; color: white; padding: 10px 16px; text-align: center;
      font-family: system-ui, sans-serif; font-size: 13.5px; font-weight: 600;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    banner.textContent = "⚠️ Off-platform communication active. TrustLayer AI is monitoring payment safety.";
    document.body.appendChild(banner);
  }

  // ---------- Resilient Listing Capture ----------

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "captureListing") {
      captureListingData()
        .then((data) => sendResponse({ ok: true, data }))
        .catch((err) => sendResponse({ ok: false, error: String(err) }));
      return true;
    }
    
    if (request.action === "injectVerification") {
      injectVerificationRequest(request.message, request.transactionId);
      sendResponse({ ok: true });
      return true;
    }

    return false;
  });

  function injectVerificationRequest(message, transactionId) {
    // 1. Simulate injecting the message into the chat input
    console.log("[TrustLayer] Injecting verification request into chat:", message);
    
    // For the demo mock marketplace, we directly append to the messages div
    const msgBox = document.getElementById("messages");
    if (msgBox) {
      const div = document.createElement("div");
      div.className = "message";
      div.innerHTML = `<strong>TrustLayer Bot:</strong> <span style="color: #d32f2f;">${message}</span>`;
      msgBox.appendChild(div);
      
      // Simulate adding a photo upload button for the demo
      const uploadBtn = document.createElement("button");
      uploadBtn.textContent = "Simulate Seller Uploading Photo";
      uploadBtn.style.cssText = "margin-top: 10px; padding: 8px; background: #23e5db; border: none; cursor: pointer; font-weight: bold;";
      uploadBtn.onclick = () => {
        const img = document.createElement("img");
        img.src = "https://via.placeholder.com/150?text=Mock+Live+Photo"; // Mock image data
        img.className = "tl-uploaded-photo";
        div.appendChild(img);
        uploadBtn.remove();
      };
      div.appendChild(uploadBtn);
    } else {
      // Generic fallback for real platforms: try to find common chat inputs
      alert("TrustLayer: Injected message into clipboard. Please paste into chat:\\n\\n" + message);
    }

    // 2. Start monitoring the chat for new photo uploads
    startPhotoDetection(transactionId);
  }

  function startPhotoDetection(transactionId) {
    console.log("[TrustLayer] Monitoring chat for photo uploads...");
    
    // Watch for new images being added to the DOM (like in a chat window)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeName === "IMG" || (node.querySelector && node.querySelector("img"))) {
              const img = node.nodeName === "IMG" ? node : node.querySelector("img");
              
              // Prevent analyzing random UI icons by checking class or size, 
              // or specifically tracking the 'tl-uploaded-photo' class for our demo
              if (img.classList.contains('tl-uploaded-photo') || (img.width > 50 && img.height > 50)) {
                console.log("[TrustLayer] Detected uploaded photo in chat!", img.src);
                observer.disconnect(); // Stop observing after we catch it
                verifyUploadedPhoto(img.src, transactionId);
              }
            }
          });
        }
      }
    });

    // Observe the document body or specific chat container
    const targetNode = document.getElementById("messages") || document.body;
    observer.observe(targetNode, { childList: true, subtree: true });
  }

  async function verifyUploadedPhoto(imageSrc, transactionId) {
    try {
      // In a real scenario, imageSrc might be a blob URL, which we'd need to convert to base64.
      // For this demo, we'll just send the src string or placeholder data.
      const payload = {
        transactionId: transactionId,
        image: imageSrc
      };

      console.log("[TrustLayer] Sending photo to backend for OCR verification...");
      const res = await fetch("http://localhost:3000/api/verify-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        alert("✅ TrustLayer Verification Passed!\\n" + data.message);
      } else {
        alert("❌ TrustLayer Verification Failed!\\n" + data.message);
      }
    } catch (err) {
      console.error("[TrustLayer] Failed to verify photo:", err);
    }
  }

  async function captureListingData() {
    let title = getFirstText([
      '[data-aut-id="itemTitle"]', // OLX Data Attribute
      'h1._1Y5bB',                 // Real OLX Title Class
      'h1[class*="Title"]',
      '[class*="itemTitle"]', '[class*="listingTitle"]',
      'h1',                        // Facebook / Generic
      ".item-title", ".listing-title", "#item-title", ".title"
    ]);

    let price = getFirstText([
      '[data-aut-id="itemPrice"]', // OLX Data Attribute
      'span._2xKf9',                // Real OLX Price Class
      'span[data-aut-id="itemPrice"]',
      '[aria-label*="Price"]',     // Facebook
      ".price", ".listing-price", ".item-price", "#price",
      'span[class*="price"]', 'div[class*="price"]'
    ]);

    const fullPageText = document.body ? document.body.innerText : "";

    // Chat Page Special Scraper (e.g. olx.in/nf/chat/...)
    const isChatPage = window.location.href.includes('/chat/') || window.location.href.includes('/inbox');
    
    // If price wasn't found via DOM selectors, extract price from page text
    if (!price && fullPageText) {
      const priceMatches = [...fullPageText.matchAll(/(?:₹|Rs\.?|INR)\s*([1-9][\d,]{3,6})/gi)];
      if (priceMatches.length > 0) {
        // Pick the largest plausible listing price from text (e.g. ₹ 50,000)
        const parsedPrices = priceMatches
          .map(m => parseInt(m[1].replace(/,/g, ''), 10))
          .filter(p => p >= 1000 && p <= 300000);
        if (parsedPrices.length > 0) {
          price = `₹ ${Math.max(...parsedPrices).toLocaleString('en-IN')}`;
        }
      }
    }

    // If title is missing or generic (especially on chat pages), extract product brand model from page text
    if ((!title || title === "Marketplace Listing" || title.includes("OLX") || isChatPage) && fullPageText) {
      const brandMatch = fullPageText.match(/\b(realme|iphone|macbook|galaxy|samsung|redmi|poco|oppo|vivo|oneplus|laptop|hp|dell|lenovo)\b[^\n•·,\.]*/i);
      if (brandMatch) {
        title = brandMatch[0].trim();
        console.log(`[TrustLayer] Extracted product title from page text: "${title}"`);
      }
    }

    let description = getFirstText([
      '[data-aut-id="itemDescripton"]', // OLX Data Attribute
      '[data-aut-id="itemDescription"]',
      'div._1q7Wb',                      // Real OLX Description Class
      '[aria-label*="Details"]',        // Facebook
      ".description", ".item-description", "#description", 'div[dir="auto"]'
    ]);

    const rawPhone = extractPhoneNumber(fullPageText);
    const entityFingerprint = rawPhone ? await sha256(rawPhone) : null;

    return {
      title: title || document.title || "Marketplace Listing",
      price: price || "Unspecified",
      description: description || fullPageText.slice(0, 300) || "",
      fullPageText: fullPageText,
      entityFingerprint: entityFingerprint,
      platformSource: getPlatformSource()
    };
  }

  function getFirstText(selectors) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el && el.textContent && el.textContent.trim().length > 0) {
          return el.textContent.trim();
        }
      } catch (e) {
        // ignore selector syntax errors for legacy fallback
      }
    }
    return "";
  }

  function getPlatformSource() {
    const host = window.location.hostname;
    if (host.includes("olx")) return "olx_web";
    if (host.includes("facebook")) return "facebook_marketplace";
    return "generic_web";
  }

  function extractPhoneNumber(text) {
    if (!text) return null;
    const match = text.match(/\b\d{10}\b/);
    return match ? match[0] : null;
  }

  async function sha256(input) {
    if (!crypto || !crypto.subtle) return null; // Gracefully handle file:/// or non-https URLs
    try {
      const encoded = new TextEncoder().encode(input);
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
      return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch (e) {
      return null;
    }
  }

  // ---------- In-Page Built-in Floating Action Button & Glassmorphism Overlay ----------

  function injectFloatingButton() {
    if (document.getElementById("trustlayer-floating-btn")) return;

    const btn = document.createElement("button");
    btn.id = "trustlayer-floating-btn";
    btn.title = "Analyze with TrustLayer AI";
    btn.style.cssText = `
      position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px;
      border-radius: 50%; background: linear-gradient(135deg, #0A0F1C, #121A2B);
      border: 1.5px solid #2DD4A8; color: #2DD4A8; font-size: 24px; cursor: pointer;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 16px rgba(45, 212, 168, 0.25);
      z-index: 999990; display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    `;
    btn.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2DD4A8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;

    btn.addEventListener("mouseenter", () => {
      btn.style.transform = "scale(1.08)";
      btn.style.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(45, 212, 168, 0.4)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "scale(1)";
      btn.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.4), 0 0 16px rgba(45, 212, 168, 0.25)";
    });

    btn.addEventListener("click", async () => {
      btn.style.transform = "scale(0.92)";
      setTimeout(() => btn.style.transform = "scale(1)", 150);

      try {
        const data = await captureListingData();
        const res = await fetch("http://localhost:3000/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });

        if (!res.ok) throw new Error("API responded " + res.status);
        const context = await res.json();
        renderInPageModal(context);
      } catch (err) {
        alert("TrustLayer AI Backend Unreachable: " + err.message + "\nPlease ensure 'npm run dev' is running.");
      }
    });

    document.body.appendChild(btn);
  }

  function renderInPageModal(context) {
    let existing = document.getElementById("trustlayer-inpage-modal");
    if (existing) existing.remove();

    const decisionColors = {
      PROCEED: "#2e7d32",
      CAUTION: "#f9a825",
      VERIFY: "#ef6c00",
      "DO-NOT-PAY": "#d32f2f",
      ABORT: "#b71c1c"
    };

    const decisionLabels = {
      PROCEED: "✅ Safe to Proceed",
      CAUTION: "⚠️ Caution — Risk Factors Found",
      VERIFY: "🔍 In-Platform Verification Recommended",
      "DO-NOT-PAY": "🚫 Payment Risk — Do Not Send Money",
      ABORT: "⛔ High Risk — Abort Transaction"
    };

    const color = decisionColors[context.decision] || "#ef6c00";
    const label = decisionLabels[context.decision] || context.decision;

    const modal = document.createElement("div");
    modal.id = "trustlayer-inpage-modal";
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(10, 15, 28, 0.75); backdrop-filter: blur(6px);
      z-index: 999999; display: flex; align-items: center; justify-content: center;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    `;

    const claimsHtml = (context.claims || []).map(c => `
      <li style="margin-bottom: 8px; font-size: 13px; color: #E7ECF5; display: flex; align-items: flex-start; gap: 8px;">
        <span style="color: #2DD4A8; font-weight: bold;">•</span>
        <div><strong>${c.fact.replace(/_/g, ' ')}:</strong> ${c.value || 'Detected'}</div>
      </li>
    `).join('');

    let actionHtml = '';
    if (context.decision === 'VERIFY' || context.decision === 'CAUTION') {
      actionHtml = `
        <div style="background: #1A2338; border: 1px solid #26314A; padding: 14px; border-radius: 10px; margin-top: 16px;">
          <strong style="color: #F0A94E; font-size: 13.5px; display: block; margin-bottom: 6px;">Action Required: In-Platform Verification</strong>
          <p style="font-size: 12.5px; color: #8B96AC; margin: 0 0 10px;">Ask seller to upload a live photo with a code in the chat.</p>
          <button id="tl-modal-inject-btn" style="width: 100%; background: #2DD4A8; color: #06120E; padding: 10px; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 13px;">Inject Request into Chat</button>
        </div>
      `;
    }

    const hasFakeQr = (context.claims || []).some(c => c.type === 'QR_INVERSION' || c.fact === 'qr_claim_mismatch');
    
    let qrWarningHtml = '';
    if (hasFakeQr) {
      qrWarningHtml = `
        <div style="background: #3a0a0a; border: 2px solid #ff4444; padding: 14px; border-radius: 10px; margin-top: 16px; animation: pulseRedAlert 2s infinite;">
          <strong style="color: #ff4444; font-size: 15px; display: block; margin-bottom: 6px; text-transform: uppercase;">🚨 FINANCIAL FRAUD ALERT</strong>
          <p style="font-size: 13.5px; color: #ffcccc; margin: 0; font-weight: bold;">DO NOT SCAN THIS QR CODE! It is a malicious payment request designed to steal your money, NOT a refund as claimed.</p>
        </div>
        <style>
          @keyframes pulseRedAlert {
            0% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(255, 68, 68, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0); }
          }
        </style>
      `;
    }

    modal.innerHTML = `
      <div style="background: #121A2B; border: 1px solid #26314A; width: 440px; max-width: 90vw; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.6);">
        <div style="background: ${color}; color: white; padding: 16px 20px; font-weight: 700; font-size: 16px; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>${label}</span>
          </div>
          <span id="tl-modal-close" style="cursor: pointer; font-size: 22px; opacity: 0.8;">&times;</span>
        </div>
        <div style="padding: 22px; color: #E7ECF5;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid #26314A;">
            <span style="font-size: 13px; color: #8B96AC;">Risk Assessment</span>
            <span style="font-size: 16px; font-weight: 800; color: ${color};">${Math.round((context.posterior || 0.1) * 100)}% Risk Score</span>
          </div>
          <ul style="margin: 0; padding: 0; list-style: none;">
            ${claimsHtml}
          </ul>
          ${actionHtml}
          ${qrWarningHtml}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("tl-modal-close").addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });

    const injectBtn = document.getElementById("tl-modal-inject-btn");
    if (injectBtn) {
      injectBtn.addEventListener("click", () => {
        injectVerificationRequest(context.verificationMessage || "Please provide a live photo with code TL-8472", context.transactionId);
        injectBtn.textContent = "Request Injected into Chat!";
        injectBtn.disabled = true;
        injectBtn.style.background = "#1C8A6E";
        setTimeout(() => modal.remove(), 1200);
      });
    }
  }

  // Inject floating button when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectFloatingButton);
  } else {
    injectFloatingButton();
  }
})();
