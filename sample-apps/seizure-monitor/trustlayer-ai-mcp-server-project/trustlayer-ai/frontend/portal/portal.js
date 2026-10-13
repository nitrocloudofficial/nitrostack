// TrustLayer AI — Web Upload Portal Logic
(function () {
  const config = window.TRUSTLAYER_CONFIG || {
    BACKEND_BASE: "http://localhost:3000",
    ENDPOINTS: { ANALYZE: "/api/analyze" },
    ENABLE_MOCK_FALLBACK: false
  };

  let selectedBase64 = null;
  let activeTab = "uploadPane";

  // Elements
  const tabUploadBtn = document.getElementById("tabUploadBtn");
  const tabTextBtn = document.getElementById("tabTextBtn");
  const uploadPane = document.getElementById("uploadPane");
  const textPane = document.getElementById("textPane");
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const filePreview = document.getElementById("filePreview");
  const filePreviewContainer = document.getElementById("filePreviewContainer");
  const fileNameDisplay = document.getElementById("fileName");
  const analyzeBtn = document.getElementById("analyzeBtn");

  const reportCard = document.getElementById("reportCard");
  const reportHeader = document.getElementById("reportHeader");
  const reportTitle = document.getElementById("reportTitle");
  const reportScore = document.getElementById("reportScore");
  const claimsList = document.getElementById("claimsList");
  const portalActionArea = document.getElementById("portalActionArea");

  // Decision UI Configurations
  const DECISION_CONFIG = {
    PROCEED: { color: "#2e7d32", label: "✅ Looks safe to proceed", friction: "none" },
    CAUTION: { color: "#f9a825", label: "⚠️ Some risk factors found", friction: "gauntlet-link" },
    VERIFY: { color: "#ef6c00", label: "🔍 Verification recommended", friction: "gauntlet-link" },
    "DO-NOT-PAY": { color: "#d32f2f", label: "🚫 Do not send payment", friction: "gauntlet-link" },
    ABORT: { color: "#b71c1c", label: "⛔ High-risk — abort transaction", friction: "gauntlet-link" }
  };

  // Tab switching
  [tabUploadBtn, tabTextBtn].forEach((btn) => {
    btn.addEventListener("click", () => {
      tabUploadBtn.classList.remove("active");
      tabTextBtn.classList.remove("active");
      btn.classList.add("active");

      activeTab = btn.dataset.target;
      uploadPane.style.display = activeTab === "uploadPane" ? "block" : "none";
      textPane.style.display = activeTab === "textPane" ? "block" : "none";
    });
  });

  // Dropzone file handling
  dropzone.addEventListener("click", () => fileInput.click());

  ["dragenter", "dragover"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    });
  });

  dropzone.addEventListener("drop", (e) => {
    const files = e.dataTransfer.files;
    if (files && files[0]) handleFileSelect(files[0]);
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) handleFileSelect(e.target.files[0]);
  });

  function handleFileSelect(file) {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG, JPG, WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      selectedBase64 = evt.target.result;
      filePreview.src = selectedBase64;
      fileNameDisplay.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
      filePreviewContainer.style.display = "block";
    };
    reader.readAsDataURL(file);
  }

  // PII extraction & hashing
  function extractPhoneOrEmail(text) {
    const phoneMatch = text.match(/\b\d{10}\b/);
    if (phoneMatch) return phoneMatch[0];
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
    return emailMatch ? emailMatch[0] : null;
  }

  async function sha256(input) {
    const encoded = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // Main Submit Action
  analyzeBtn.addEventListener("click", async () => {
    const title = document.getElementById("inputTitle").value.trim();
    const price = document.getElementById("inputPrice").value.trim();
    const description = document.getElementById("inputDescription").value.trim();

    if (activeTab === "uploadPane" && !selectedBase64) {
      alert("Please select or drop a screenshot file first.");
      return;
    }
    if (activeTab === "textPane" && !title && !description) {
      alert("Please enter a title or description to analyze.");
      return;
    }

    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = `<span class="spinner"></span> Analyzing listing...`;
    reportCard.style.display = "none";

    const piiMatch = extractPhoneOrEmail(description || title);
    const entityFingerprint = piiMatch ? await sha256(piiMatch) : null;

    const payload = {
      title: title || "Marketplace Screenshot Analysis",
      price: price || "Unspecified",
      description: description || "Uploaded via portal",
      entityFingerprint: entityFingerprint,
      platformSource: "portal_upload",
      image: selectedBase64
    };

    try {
      const res = await fetch(`${config.BACKEND_BASE}${config.ENDPOINTS.ANALYZE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const trustContext = await res.json();
      renderReport(trustContext);
    } catch (err) {
      console.warn("Backend API call failed:", err);
      alert("Failed to reach TrustLayer backend. Please ensure the server is running.");
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = "Analyze Listing with TrustLayer";
    }
  });


  function renderReport(context) {
    const { decision, posterior, claims, transactionId, verificationCode } = context;
    const cfg = DECISION_CONFIG[decision] || DECISION_CONFIG.PROCEED;

    reportHeader.style.background = cfg.color;
    reportTitle.textContent = cfg.label;
    reportScore.textContent = `Posterior Risk: ${Math.round((posterior || 0) * 100)}%`;

    claimsList.innerHTML = "";
    (claims || []).forEach((c) => {
      const li = document.createElement("li");
      li.className = "claim-item";
      if (posterior > 0.7) li.classList.add("risk-high");
      else if (posterior > 0.4) li.classList.add("risk-medium");

      const plainText = claimToPlainLanguage(c);
      li.innerHTML = `<strong>${c.fact.replace(/_/g, " ")}:</strong> ${plainText}`;
      claimsList.appendChild(li);
    });

    renderActionArea(decision, transactionId, verificationCode);
    reportCard.style.display = "block";
    reportCard.scrollIntoView({ behavior: "smooth" });
  }

  function claimToPlainLanguage(c) {
    const map = {
      price_deviation: `Listing price is significantly (${c.value}) lower than expected market value.`,
      account_age: `Seller profile is brand new (${c.value}).`,
      suspicious_payment_link: `Payment request detected using non-protected method (${c.value}).`,
      known_scammer_fingerprint: `Contact details match known scam patterns in database.`,
      price_normal: `Price is consistent with recent market sales.`
    };
    return map[c.fact] || `${c.value || ""}`;
  }

  function renderActionArea(decision, txnId, code) {
    portalActionArea.innerHTML = "";
    const cfg = DECISION_CONFIG[decision];

    if (cfg.friction === "gauntlet-link") {
      const box = document.createElement("div");
      box.style.cssText = "background: var(--surface-raised); padding: 16px; border-radius: 8px; border: 1px solid var(--line);";
      const verifyUrl = `${window.location.origin}/seller-gauntlet/page.html?code=${code || "784219"}&txn=${txnId}`;
      box.innerHTML = `
        <strong style="color: var(--warn); display: block; margin-bottom: 6px;">Action Required: Send Verification Link to Seller</strong>
        <p style="font-size: 13px; color: var(--text-muted); margin: 0 0 12px;">
          Ask the seller to take a live photo verification challenge before sending money.
        </p>
        <div style="display: flex; gap: 8px;">
          <input type="text" value="${verifyUrl}" readonly style="font-family: monospace; font-size: 12px;" />
          <button id="copyUrlBtn" style="background: var(--trust); color: #000; font-weight: 600; border: none; border-radius: 6px; padding: 0 14px; cursor: pointer; white-space: nowrap;">Copy Link</button>
        </div>
      `;
      portalActionArea.appendChild(box);

      setTimeout(() => {
        const copyBtn = document.getElementById("copyUrlBtn");
        if (copyBtn) {
          copyBtn.addEventListener("click", () => {
            navigator.clipboard.writeText(verifyUrl);
            copyBtn.textContent = "Copied!";
            setTimeout(() => (copyBtn.textContent = "Copy Link"), 2000);
          });
        }
      }, 0);
    } else if (cfg.friction === "ack") {
      const btn = document.createElement("button");
      btn.className = "btn-submit";
      btn.style.background = "#d32f2f";
      btn.style.color = "white";
      btn.textContent = "I understand the risks — Do NOT proceed with payment";
      btn.addEventListener("click", () => {
        btn.textContent = "Acknowledged — High Risk Fraud Alert Saved";
        btn.disabled = true;
      });
      portalActionArea.appendChild(btn);
    } else if (cfg.friction === "cooldown-typed") {
      const box = document.createElement("div");
      box.innerHTML = `
        <div style="background: #b71c1c; color: white; padding: 12px; border-radius: 8px; font-size: 13px; margin-bottom: 10px;">
          <strong>CRITICAL RISK DETECTED:</strong> This listing matches a high-confidence scam.
        </div>
      `;
      portalActionArea.appendChild(box);
    }
  }
})();
