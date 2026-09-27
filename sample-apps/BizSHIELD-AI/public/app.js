/**
 * BizShield AI — Frontend Application Controller (White & Teal Theme)
 * 
 * Manages the Netflix cinematic splash screen transition, real server-backed
 * email OTP verification, mandatory onboarding gateway wizard,
 * MSME B2B connection network, dynamic SVG charts, tax calculators, and AI chat.
 */

// Global State
let activeBusinessId = null;
let activeBusinessData = null;
let modalAssets = []; // Temporary assets schedule for onboarding form
let allBusinesses = []; // List of all businesses registered in database
let editingBusinessId = null; // Track if we are editing an existing business profile

// UI Selectors
const activeBizName = document.getElementById('active-biz-name');
const viewTitle = document.getElementById('view-title');

// Onboarding Gateway Form Selectors
const onboardGateway = document.getElementById('onboard-gateway');
const onboardGatewayForm = document.getElementById('onboard-gateway-form');
const btnAddAsset = document.getElementById('btn-add-asset');
const assetClassInput = document.getElementById('asset-class-input');
const assetValInput = document.getElementById('asset-val-input');
const assetFloorInput = document.getElementById('asset-floor-input');
const modalAssetsTbody = document.getElementById('modal-assets-tbody');

// GPS Geolocation Selector
const btnGps = document.getElementById('btn-gps');

// Tax Calculator Selectors
const btnCalculateTax = document.getElementById('btn-calculate-tax');

// Profile Switcher Sidebar Button
const btnChangeProfile = document.getElementById('btn-change-profile');

// ---------------------------------------------------------------------------
// Toast Notification System
// ---------------------------------------------------------------------------
function showNotification(title, message) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '99999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.style.background = '#ffffff';
  toast.style.borderLeft = '4px solid #006d77';
  toast.style.boxShadow = '0 10px 30px rgba(0, 44, 45, 0.12)';
  toast.style.borderRadius = '6px';
  toast.style.padding = '12px 20px';
  toast.style.minWidth = '280px';
  toast.style.fontFamily = 'Inter, sans-serif';
  toast.style.animation = 'fadeIn 0.3s ease';
  
  toast.innerHTML = `
    <div style="font-weight:700; color:#006d77; font-size:13px; text-transform:uppercase; letter-spacing:0.5px;">${title}</div>
    <div style="font-size:12px; color:#2d3748; margin-top:4px;">${message}</div>
  `;

  container.appendChild(toast);

  // Remove toast after 7 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s ease';
    setTimeout(() => toast.remove(), 500);
  }, 7000);
}

// ---------------------------------------------------------------------------
// Cinematic Intro Splash & Email/Code Verification (Enforcing 1234)
// ---------------------------------------------------------------------------
function initSplashAndVerification() {
  const splash = document.getElementById('splash-screen');
  const authScreen = document.getElementById('auth-screen');
  const emailStep = document.getElementById('email-step');
  const codeStep = document.getElementById('code-step');
  const authEmail = document.getElementById('auth-email');
  const authCode = document.getElementById('auth-code');
  const btnSendCode = document.getElementById('btn-send-code');
  const btnVerifyCode = document.getElementById('btn-verify-code');
  const btnBackEmail = document.getElementById('btn-back-email');
  const emailDisplay = document.getElementById('auth-email-display');
  const termsModal = document.getElementById('terms-modal');
  const btnAcceptTerms = document.getElementById('btn-accept-terms');
  const btnDeclineTerms = document.getElementById('btn-decline-terms');
  const appContainer = document.getElementById('app-container');

  const transitionToAuth = () => {
    splash.classList.add('hide');
    authScreen.classList.remove('hide');
  };

  // Skip Splash Screen on click
  splash.addEventListener('click', transitionToAuth);

  // Netflix Splash Screen Timer (2.2s zoom/fade)
  setTimeout(() => {
    if (!splash.classList.contains('hide')) {
      splash.style.opacity = '0';
      setTimeout(transitionToAuth, 800); // Allow fade opacity transition
    }
  }, 2200);

  // Email input -> Code entry step (requests a real OTP from the server)
  btnSendCode.addEventListener('click', async () => {
    const email = authEmail.value.trim();
    if (!email || !email.includes('@')) {
      alert("Please enter a valid email address.");
      return;
    }

    const originalLabel = btnSendCode.textContent;
    btnSendCode.disabled = true;
    btnSendCode.textContent = 'Sending...';

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Could not send verification code. Please try again.");
        return;
      }

      emailDisplay.textContent = email;
      emailStep.classList.add('hide');
      codeStep.classList.remove('hide');
      authCode.value = '';
      authCode.focus();

      if (data.devMode) {
        // No SMTP configured on the server - show the code directly so local/dev testing works.
        showNotification("Dev Mode (no email configured)", `SMTP isn't set up on this server, so here's your code directly: <strong>${data.devOtp}</strong>`);
      } else {
        showNotification("Verification Code Sent", `We emailed a 4-digit code to <strong>${email}</strong>. It expires in 5 minutes.`);
      }
    } catch (err) {
      alert("Network failure. Please ensure the backend is running and try again.");
    } finally {
      btnSendCode.disabled = false;
      btnSendCode.textContent = originalLabel;
    }
  });

  // Back to email input
  btnBackEmail.addEventListener('click', () => {
    codeStep.classList.add('hide');
    emailStep.classList.remove('hide');
  });

  // Verify code step - checked against the real OTP on the server
  btnVerifyCode.addEventListener('click', async () => {
    const email = authEmail.value.trim();
    const code = authCode.value.trim();
    if (!code) {
      alert("Please enter the 4-digit code.");
      return;
    }

    const originalLabel = btnVerifyCode.textContent;
    btnVerifyCode.disabled = true;
    btnVerifyCode.textContent = 'Verifying...';

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      const data = await res.json();

      if (!res.ok || !data.verified) {
        alert(data.error || "Incorrect verification code.");
        return;
      }

      // Launch terms and conditions acceptance
      termsModal.classList.add('active');
    } catch (err) {
      alert("Network failure. Please ensure the backend is running and try again.");
    } finally {
      btnVerifyCode.disabled = false;
      btnVerifyCode.textContent = originalLabel;
    }
  });

  // Terms Acceptance -> Mandatory Onboarding Gateway
  btnAcceptTerms.addEventListener('click', () => {
    termsModal.classList.remove('active');
    authScreen.classList.add('hide');
    
    // Check if we already have an active profile saved in localStorage
    const savedId = localStorage.getItem('bizshield_active_id');
    if (savedId) {
      // Direct access allowed if profile exists
      appContainer.classList.remove('hide');
      loadBusinesses(savedId);
    } else {
      // Must onboard first
      onboardGateway.classList.remove('hide');
    }
  });

  btnDeclineTerms.addEventListener('click', () => {
    alert("You must accept the Terms and Conditions to access the BizShield AI Platform.");
  });
}

// ---------------------------------------------------------------------------
// Page Initialization & Tab Management
// ---------------------------------------------------------------------------
function initAll() {
  initSplashAndVerification();
  initTabs();
  initOnboardingGateway();
  initDisasterSelector();
  initLossSlider();
  initChat();
  initGpsLocation();
  initTaxCalculator();
  initProfileSwitcher();
}

// Fail-safe ready-state verification
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAll);
} else {
  initAll();
}

function initTabs() {
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanels = document.querySelectorAll('.tab-panel');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = item.getAttribute('data-tab');

      // Toggle active classes
      navItems.forEach(nav => nav.classList.remove('active'));
      tabPanels.forEach(panel => panel.classList.remove('active'));

      item.classList.add('active');
      const targetPanel = document.getElementById(`tab-${tabId}`);
      if (targetPanel) targetPanel.classList.add('active');

      // Update title
      viewTitle.textContent = item.textContent.trim().substring(2);
    });
  });
}

// ---------------------------------------------------------------------------
// HTML5 Geolocation GPS Capture
// ---------------------------------------------------------------------------
function initGpsLocation() {
  if (btnGps) {
    btnGps.addEventListener('click', () => {
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
      }
      btnGps.textContent = "📍 Locating...";
      btnGps.disabled = true;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          document.getElementById('reg-lat').value = position.coords.latitude.toFixed(4);
          document.getElementById('reg-lng').value = position.coords.longitude.toFixed(4);
          btnGps.textContent = "📍 GPS Locate";
          btnGps.disabled = false;
          alert("GPS Coordinates populated successfully!");
        },
        (error) => {
          btnGps.textContent = "📍 GPS Locate";
          btnGps.disabled = false;
          alert("Error obtaining GPS coordinates: " + error.message + ". Standard default values will be applied.");
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });
  }
}

// ---------------------------------------------------------------------------
// Onboarding Form Reset & Quick-Fill Profiles Examples
// ---------------------------------------------------------------------------
window.clearProfileForm = function() {
  document.getElementById('reg-name').value = '';
  document.getElementById('reg-owner').value = '';
  document.getElementById('reg-category').value = 'textile_retail';
  document.getElementById('reg-entity').value = 'proprietorship';
  document.getElementById('reg-investment').value = '4500000';
  document.getElementById('reg-turnover').value = '8400000';
  document.getElementById('reg-employees').value = '6';
  document.getElementById('reg-years').value = '7';
  document.getElementById('reg-lat').value = '19.1136';
  document.getElementById('reg-lng').value = '72.8697';
  document.getElementById('reg-floor').value = '0';
  document.getElementById('reg-state').value = 'Maharashtra';

  document.getElementById('fin-cash').value = '460000';
  document.getElementById('fin-burn').value = '195000';
  document.getElementById('fin-cogs').value = '5040000';
  document.getElementById('fin-opex').value = '1900000';
  document.getElementById('fin-ebitda').value = '1100000';
  document.getElementById('fin-benchmark').value = '0.14';
  document.getElementById('fin-debt-interest').value = '180000';
  document.getElementById('fin-debt-principal').value = '240000';
  document.getElementById('fin-cust-share').value = '0.22';
  document.getElementById('fin-dio').value = '58';
  document.getElementById('fin-dso').value = '9';
  document.getElementById('fin-dpo').value = '21';

  modalAssets = [];
  renderModalAssetsTable();

  editingBusinessId = null;
  document.getElementById('btn-submit-gateway').textContent = "🚀 Submit & Launch Analytics Dashboard";
  
  showNotification("Form Cleared", "Ready to onboard a new business profile.");
};

window.quickFillProfile = function(key) {
  const profiles = {
    priya: {
      name: "Priya Textiles",
      owner: "Priya Sharma",
      category: "textile_retail",
      entity: "proprietorship",
      investment: 4200000,
      turnover: 8400000,
      employees: 6,
      years: 7,
      lat: 19.1136,
      lng: 72.8697,
      floor: 0,
      state: "Maharashtra",
      cash: 460000,
      burn: 195000,
      cogs: 5040000,
      opex: 1900000,
      ebitda: 1100000,
      benchmark: 0.14,
      interest: 180000,
      principal: 240000,
      share: 0.22,
      dio: 58,
      dso: 9,
      dpo: 21,
      assets: [
        { asset_class: "textiles_paper", declared_value_inr: 3400000, floor_level: 0, peak_season_multiplier: 1.6 },
        { asset_class: "furniture_fixtures", declared_value_inr: 3500000, floor_level: 0, peak_season_multiplier: 1.0 },
        { asset_class: "electronics", declared_value_inr: 1200000, floor_level: 1, peak_season_multiplier: 1.0 }
      ]
    },
    arjun: {
      name: "Arjun Gadgets",
      owner: "Arjun Mehta",
      category: "electronics_retail",
      entity: "pvt_ltd",
      investment: 32000000,
      turnover: 62000000,
      employees: 11,
      years: 4,
      lat: 19.0760,
      lng: 72.8777,
      floor: 0,
      state: "Maharashtra",
      cash: 3400000,
      burn: 980000,
      cogs: 44000000,
      opex: 9500000,
      ebitda: 8500000,
      benchmark: 0.11,
      interest: 540000,
      principal: 900000,
      share: 0.38,
      dio: 72,
      dso: 14,
      dpo: 35,
      assets: [
        { asset_class: "electronics", declared_value_inr: 18000000, floor_level: 0, peak_season_multiplier: 1.0 },
        { asset_class: "heavy_machinery", declared_value_inr: 8000000, floor_level: 0, peak_season_multiplier: 1.0 },
        { asset_class: "furniture_fixtures", declared_value_inr: 2500000, floor_level: 0, peak_season_multiplier: 1.0 }
      ]
    },
    kavita: {
      name: "Kavita Cafe",
      owner: "Kavita Rao",
      category: "cafe",
      entity: "partnership",
      investment: 1800000,
      turnover: 4600000,
      employees: 5,
      years: 3,
      lat: 12.9716,
      lng: 77.5946,
      floor: 0,
      state: "Karnataka",
      cash: 190000,
      burn: 145000,
      cogs: 2530000,
      opex: 1350000,
      ebitda: 520000,
      benchmark: 0.16,
      interest: 60000,
      principal: 80000,
      share: 0.12,
      dio: 12,
      dso: 4,
      dpo: 18,
      assets: [
        { asset_class: "perishable_food", declared_value_inr: 220000, floor_level: 0, peak_season_multiplier: 1.4 },
        { asset_class: "furniture_fixtures", declared_value_inr: 400000, floor_level: 0, peak_season_multiplier: 1.0 },
        { asset_class: "packaged_fmcg", declared_value_inr: 90000, floor_level: 0, peak_season_multiplier: 1.1 }
      ]
    }
  };

  const p = profiles[key];
  if (!p) return;

  editingBusinessId = null; // Clear edit tag when loading a template
  document.getElementById('btn-submit-gateway').textContent = "🚀 Submit & Launch Analytics Dashboard";

  document.getElementById('reg-name').value = p.name;
  document.getElementById('reg-owner').value = p.owner;
  document.getElementById('reg-category').value = p.category;
  document.getElementById('reg-entity').value = p.entity;
  document.getElementById('reg-investment').value = p.investment;
  document.getElementById('reg-turnover').value = p.turnover;
  document.getElementById('reg-employees').value = p.employees;
  document.getElementById('reg-years').value = p.years;
  document.getElementById('reg-lat').value = p.lat;
  document.getElementById('reg-lng').value = p.lng;
  document.getElementById('reg-floor').value = p.floor;
  document.getElementById('reg-state').value = p.state;

  document.getElementById('fin-cash').value = p.cash;
  document.getElementById('fin-burn').value = p.burn;
  document.getElementById('fin-cogs').value = p.cogs;
  document.getElementById('fin-opex').value = p.opex;
  document.getElementById('fin-ebitda').value = p.ebitda;
  document.getElementById('fin-benchmark').value = p.benchmark;
  document.getElementById('fin-debt-interest').value = p.interest;
  document.getElementById('fin-debt-principal').value = p.principal;
  document.getElementById('fin-cust-share').value = p.share;
  document.getElementById('fin-dio').value = p.dio;
  document.getElementById('fin-dso').value = p.dso;
  document.getElementById('fin-dpo').value = p.dpo;

  modalAssets = [...p.assets];
  renderModalAssetsTable();

  showNotification("Demo profile filled!", `Successfully populated inputs for ${p.name}.`);
};

// ---------------------------------------------------------------------------
// Business Onboarding Gateway
// ---------------------------------------------------------------------------
function initOnboardingGateway() {
  // Add asset helper
  btnAddAsset.addEventListener('click', () => {
    const assetClass = assetClassInput.value;
    const value = parseFloat(assetValInput.value);
    const floor = parseInt(assetFloorInput.value);

    if (isNaN(value) || value <= 0) {
      alert("Please enter a valid asset value.");
      return;
    }

    const multiplier = assetClass === 'textiles_paper' ? 1.6 : (assetClass === 'perishable_food' ? 1.4 : 1.0);
    modalAssets.push({
      asset_class: assetClass,
      declared_value_inr: value,
      floor_level: floor,
      peak_season_multiplier: multiplier
    });

    assetValInput.value = '';
    renderModalAssetsTable();
  });

  // Handle gateway submit
  onboardGatewayForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const owner = document.getElementById('reg-owner').value;
    const category = document.getElementById('reg-category').value;
    const entity = document.getElementById('reg-entity').value;
    const investment = parseFloat(document.getElementById('reg-investment').value);
    const turnover = parseFloat(document.getElementById('reg-turnover').value);
    const employees = parseInt(document.getElementById('reg-employees').value);
    const years = parseInt(document.getElementById('reg-years').value);
    const lat = parseFloat(document.getElementById('reg-lat').value);
    const lng = parseFloat(document.getElementById('reg-lng').value);
    const floor = parseInt(document.getElementById('reg-floor').value);
    const state = document.getElementById('reg-state').value;

    const payload = {
      name,
      owner,
      business_category: category,
      entity_type: entity,
      investment_inr: investment,
      annual_turnover_inr: turnover,
      employee_count: employees,
      years_in_operation: years,
      latitude: lat,
      longitude: lng,
      floor_level: floor,
      state,
      assets: modalAssets,
      financial: {
        cash_inr: parseFloat(document.getElementById('fin-cash').value),
        avg_monthly_burn_inr: parseFloat(document.getElementById('fin-burn').value),
        revenue_inr: turnover,
        cogs_inr: parseFloat(document.getElementById('fin-cogs').value),
        opex_inr: parseFloat(document.getElementById('fin-opex').value),
        dio_days: parseInt(document.getElementById('fin-dio').value),
        dso_days: parseInt(document.getElementById('fin-dso').value),
        dpo_days: parseInt(document.getElementById('fin-dpo').value),
        top_customer_share: parseFloat(document.getElementById('fin-cust-share').value),
        ebitda_inr: parseFloat(document.getElementById('fin-ebitda').value),
        interest_inr: parseFloat(document.getElementById('fin-debt-interest').value),
        principal_inr: parseFloat(document.getElementById('fin-debt-principal').value),
        sector_benchmark_margin: parseFloat(document.getElementById('fin-benchmark').value)
      }
    };

    // If editing profile, supply ID parameter to update
    if (editingBusinessId) {
      payload.id = editingBusinessId;
    }

    try {
      const res = await fetch('/api/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.error) {
        alert("Error onboarding: " + data.error);
        return;
      }

      // Hide onboarding wizard, show dashboard app
      onboardGateway.classList.add('hide');
      document.getElementById('app-container').classList.remove('hide');
      
      localStorage.setItem('bizshield_active_id', data.id);
      editingBusinessId = null; // Clear edit tag
      document.getElementById('btn-submit-gateway').textContent = "🚀 Submit & Launch Analytics Dashboard"; // reset button text

      await loadBusinesses(data.id);
      showNotification("Profile Saved", `${data.name} profile successfully updated!`);
    } catch (err) {
      console.error(err);
      alert("Network error onboarding business context.");
    }
  });
}

function renderModalAssetsTable() {
  modalAssetsTbody.innerHTML = '';
  modalAssets.forEach((asset, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><code>${asset.asset_class}</code></td>
      <td>₹${asset.declared_value_inr.toLocaleString('en-IN')}</td>
      <td>Floor ${asset.floor_level}</td>
      <td><button type="button" class="btn btn-danger" style="padding:4px 8px; font-size:10px;" onclick="removeModalAsset(${idx})">Remove</button></td>
    `;
    modalAssetsTbody.appendChild(tr);
  });
}

window.removeModalAsset = function(idx) {
  modalAssets.splice(idx, 1);
  renderModalAssetsTable();
};

function initProfileSwitcher() {
  if (btnChangeProfile) {
    btnChangeProfile.addEventListener('click', () => {
      // Re-open full-screen gateway to change or re-register
      document.getElementById('app-container').classList.add('hide');
      onboardGateway.classList.remove('hide');
      
      // Set values if active profile exists (incorporating safe fallbacks)
      if (activeBusinessData) {
        const biz = activeBusinessData.business;
        editingBusinessId = biz.id; // Declare we are editing the existing profile

        // Change submit button text
        document.getElementById('btn-submit-gateway').textContent = "💾 Save Profile Changes";

        document.getElementById('reg-name').value = biz.name || "";
        document.getElementById('reg-owner').value = biz.owner || "";
        document.getElementById('reg-category').value = biz.business_category || "generic_retail";
        document.getElementById('reg-entity').value = biz.entity_type || "proprietorship";
        document.getElementById('reg-investment').value = biz.investment_inr || 0;
        document.getElementById('reg-turnover').value = biz.annual_turnover_inr || 0;
        document.getElementById('reg-employees').value = biz.employee_count || 1;
        document.getElementById('reg-years').value = biz.years_in_operation || 0;
        document.getElementById('reg-lat').value = biz.latitude || 19.0760;
        document.getElementById('reg-lng').value = biz.longitude || 72.8777;
        document.getElementById('reg-floor').value = biz.floor_level !== undefined ? biz.floor_level : 0;
        document.getElementById('reg-state').value = biz.state || "";

        const fin = biz.financial || {};
        document.getElementById('fin-cash').value = fin.cash_inr || 0;
        document.getElementById('fin-burn').value = fin.avg_monthly_burn_inr || 0;
        document.getElementById('fin-cogs').value = fin.cogs_inr || 0;
        document.getElementById('fin-opex').value = fin.opex_inr || 0;
        document.getElementById('fin-ebitda').value = fin.ebitda_inr || 0;
        document.getElementById('fin-benchmark').value = fin.sector_benchmark_margin || 0.12;
        document.getElementById('fin-debt-interest').value = fin.interest_inr || 0;
        document.getElementById('fin-debt-principal').value = fin.principal_inr || 0;
        document.getElementById('fin-cust-share').value = fin.top_customer_share || 0.15;
        document.getElementById('fin-dio').value = fin.dio_days || 30;
        document.getElementById('fin-dso').value = fin.dso_days || 10;
        document.getElementById('fin-dpo').value = fin.dpo_days || 20;

        modalAssets = biz.assets ? [...biz.assets] : [];
        renderModalAssetsTable();
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Business Core Data Loading
// ---------------------------------------------------------------------------
async function loadBusinesses(selectId) {
  try {
    const res = await fetch('/api/businesses');
    const data = await res.json();
    allBusinesses = data.businesses;

    // Don't trust a stored/requested ID blindly - it may point at a business
    // that no longer exists on the server (reset data, redeploy, deleted profile, etc).
    let resolvedId = selectId;
    if (resolvedId && !data.businesses.some(b => b.id === resolvedId)) {
      console.warn(`Saved business ID "${resolvedId}" no longer exists on the server. Falling back to default.`);
      localStorage.removeItem('bizshield_active_id');
      resolvedId = null;
      showNotification("Profile Reset", "Your previously saved business profile could not be found (the server data may have been reset). Switched to a default profile — you can re-onboard your business anytime from the sidebar.");
    }

    activeBusinessId = resolvedId || (data.businesses[0] && data.businesses[0].id);
    if (activeBusinessId && !resolvedId) {
      localStorage.setItem('bizshield_active_id', activeBusinessId);
    }

    const activeBizObj = data.businesses.find(b => b.id === activeBusinessId);
    activeBizName.textContent = activeBizObj ? activeBizObj.name : "Active Business";

    if (activeBusinessId) loadAnalysis(activeBusinessId);
  } catch (err) {
    console.error("Error loading businesses list:", err);
  }
}

async function loadAnalysis(id) {
  try {
    const res = await fetch(`/api/analyze/${id}`);
    const data = await res.json();
    
    activeBusinessData = data;
    
    // Pre-populate tax calculator inputs based on selected business data
    const biz = data.business;
    document.getElementById('tax-revenue').value = biz.annual_turnover_inr;
    document.getElementById('tax-cogs').value = biz.financial.cogs_inr;
    document.getElementById('tax-opex').value = biz.financial.opex_inr;
    document.getElementById('tax-interest').value = biz.financial.interest_inr;
    document.getElementById('tax-entity').value = biz.entity_type || 'proprietorship';
    calculateTaxes(); // run tax calculation immediately on change
    
    // Update tabs
    renderDashboard(data);
    renderMarket(data.market_intelligence);
    renderRiskAndInsurance(data);
    renderSchemes(data.government_schemes);
    renderFinancialHealth(data.financial_health);
    renderCompliance(data.compliance);
    renderSupplyChain(data.supply_chain);
    renderWeather(data.weather);
    renderMSMENetwork(); // Update the B2B connect network list
    triggerDisasterAction(data.business.id); // emergency support
  } catch (err) {
    console.error("Error fetching analysis data:", err);
  }
}

// ---------------------------------------------------------------------------
// Interactive MSME Collaboration Network Tab
// ---------------------------------------------------------------------------
function renderMSMENetwork() {
  const container = document.getElementById('network-businesses-container');
  const searchInput = document.getElementById('network-search');
  if (!container || !searchInput) return;
  
  const drawList = () => {
    container.innerHTML = '';
    const query = searchInput.value.toLowerCase();
    
    // Filter out our active business and match search terms
    const others = allBusinesses.filter(b => b.id !== activeBusinessId);
    const filtered = others.filter(b => 
      b.name.toLowerCase().includes(query) || 
      b.state.toLowerCase().includes(query) || 
      b.business_category.toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
      container.innerHTML = `<div class="profile-row" style="justify-content:center; color:var(--neutral-600); width:100%;">No businesses match your search.</div>`;
      return;
    }

    filtered.forEach(b => {
      // Calculate a B2B Synergy collaboration match score
      let synergy = 65;
      if (b.state === activeBusinessData.business.state) synergy += 20; // local proximity bonus
      if (b.business_category === activeBusinessData.business.business_category) synergy += 10; // category bonus
      
      const card = document.createElement('div');
      card.className = 'network-card';
      card.innerHTML = `
        <div>
          <h3>${b.name}</h3>
          <span class="loc">${b.owner} | ${b.state}</span>
          <p class="details">Category: <strong>${b.business_category.replace(/_/g, ' ').toUpperCase()}</strong></p>
          <p class="details">MSME Tier: <span class="badge badge-informational">${b.udyam_category.toUpperCase()}</span></p>
          <span class="badge-match">⚡ Synergy Score: ${synergy}%</span>
        </div>
        <div class="network-actions">
          <button class="btn btn-secondary" style="font-size:10px; padding:6px 12px; flex:1;" onclick="collabMessage('${b.name}', 'message')">✉ Chat</button>
          <button class="btn btn-primary" style="font-size:10px; padding:6px 12px; flex:1;" onclick="collabMessage('${b.name}', 'collab')">🤝 Collab</button>
        </div>
      `;
      container.appendChild(card);
    });
  };

  searchInput.oninput = drawList;
  drawList();
}

window.collabMessage = function(targetName, actionType) {
  const activeName = activeBusinessData?.business.name || "Your Business";
  if (actionType === 'message') {
    alert(`✉ B2B Chat Request Sent!\n\nAn encrypted channel request has been sent to ${targetName} from ${activeName}. You will receive a notification once they accept.`);
  } else {
    alert(`🤝 Logistics Collaboration Proposed!\n\n${activeName} has proposed a joint supply-transit consolidation request with ${targetName}. Combining shipping logistics can reduce fuel footprint and cargo charges by an estimated 14.5%!`);
  }
};

// ---------------------------------------------------------------------------
// MSME Tax Calculations
// ---------------------------------------------------------------------------
function calculateTaxes() {
  const revenue = parseFloat(document.getElementById('tax-revenue').value) || 0;
  const cogs = parseFloat(document.getElementById('tax-cogs').value) || 0;
  const opex = parseFloat(document.getElementById('tax-opex').value) || 0;
  const interest = parseFloat(document.getElementById('tax-interest').value) || 0;
  const slab = parseFloat(document.getElementById('tax-gst-slab').value) || 0.18;
  const entity = document.getElementById('tax-entity').value;

  const gstOutward = revenue * slab;
  const gstItc = cogs * slab * 0.65;
  const netGst = Math.max(0, gstOutward - gstItc);

  const pbt = Math.max(0, revenue - cogs - opex - interest);

  let tax = 0;
  if (entity === 'pvt_ltd') {
    tax = pbt * 0.2517; // Flat 22% corporate + cess
  } else if (entity === 'partnership') {
    tax = pbt * 0.312; // Flat 30% partnership + cess
  } else {
    // Individual Slabs New tax regime rebate
    const income = pbt;
    if (income <= 700000) {
      tax = 0;
    } else {
      if (income > 1500000) {
        tax += (income - 1500000) * 0.30;
        tax += (1500000 - 1200000) * 0.20;
        tax += (1200000 - 1000000) * 0.15;
        tax += (1000000 - 700000) * 0.10;
        tax += (700000 - 300000) * 0.05;
      } else if (income > 1200000) {
        tax += (income - 1200000) * 0.20;
        tax += (1200000 - 1000000) * 0.15;
        tax += (1000000 - 700000) * 0.10;
        tax += (700000 - 300000) * 0.05;
      } else if (income > 1000000) {
        tax += (income - 1000000) * 0.15;
        tax += (1000000 - 700000) * 0.10;
        tax += (700000 - 300000) * 0.05;
      } else if (income > 700000) {
        tax += (income - 700000) * 0.10;
        tax += (700000 - 300000) * 0.05;
      }
      tax = tax * 1.04;
    }
  }

  const pat = Math.max(0, pbt - tax);
  const margin = revenue > 0 ? (pat / revenue) * 100 : 0;

  document.getElementById('tax-out-gross').textContent = `₹${Math.round(revenue).toLocaleString('en-IN')}`;
  document.getElementById('tax-out-gst-out').textContent = `₹${Math.round(gstOutward).toLocaleString('en-IN')}`;
  document.getElementById('tax-out-gst-itc').textContent = `₹${Math.round(gstItc).toLocaleString('en-IN')}`;
  document.getElementById('tax-out-gst-net').textContent = `₹${Math.round(netGst).toLocaleString('en-IN')}`;
  document.getElementById('tax-out-pbt').textContent = `₹${Math.round(pbt).toLocaleString('en-IN')}`;
  document.getElementById('tax-out-inc-tax').textContent = `₹${Math.round(tax).toLocaleString('en-IN')}`;
  document.getElementById('tax-out-pat').textContent = `₹${Math.round(pat).toLocaleString('en-IN')}`;
  document.getElementById('tax-out-margin').textContent = `${margin.toFixed(1)}%`;
}

function initTaxCalculator() {
  const btnCalculateTax = document.getElementById('btn-calculate-tax');
  if (btnCalculateTax) {
    btnCalculateTax.addEventListener('click', () => {
      calculateTaxes();
      showNotification("Tax Calculation", "MSME tax liabilities successfully updated.");
    });
  }
}

// ---------------------------------------------------------------------------
// Tab Renderers
// ---------------------------------------------------------------------------

function renderDashboard(data) {
  document.getElementById('dash-market-score').textContent = `${data.market_intelligence.opportunity_score}/100`;
  document.getElementById('dash-market-label').textContent = data.market_intelligence.dominant_archetype.replace('_', ' ').toUpperCase();

  document.getElementById('dash-financial-score').textContent = `${data.financial_health.overall_score}/100`;
  document.getElementById('dash-financial-label').textContent = data.financial_health.health_band.toUpperCase();
  
  const flbl = document.getElementById('dash-financial-label');
  flbl.className = 'score-label ' + (data.financial_health.health_band === 'healthy' ? 'badge-success' : (data.financial_health.health_band === 'fair' ? 'badge-warning' : 'badge-danger'));

  document.getElementById('dash-risk-score').textContent = `₹${data.expected_loss.expected_annual_loss_lakhs}L`;
  
  const overdueCount = data.compliance.summary.overdue;
  const criticalCount = data.compliance.summary.critical;
  document.getElementById('dash-compliance-score').textContent = `${overdueCount + criticalCount}`;
  document.getElementById('dash-compliance-label').textContent = overdueCount > 0 ? "Overdue tasks pending" : "Urgent items this week";

  const cr = data.cross_risk;
  const container = document.getElementById('cross-risk-insight-container');
  const text = document.getElementById('cross-risk-text');

  text.textContent = cr.insight;
  if (cr.would_go_below_zero) {
    container.className = "section-card cross-risk-card critical-alert";
  } else {
    container.className = "section-card cross-risk-card stable-alert";
  }

  const metricsBox = document.getElementById('dashboard-metrics');
  metricsBox.innerHTML = `
    <div class="metric-item">
      <div class="metric-title">Cash Runway</div>
      <div class="metric-value">${data.financial_health.metrics.cash_runway.value_months} mos</div>
      <div class="metric-signal badge-${data.financial_health.metrics.cash_runway.signal}">${data.financial_health.metrics.cash_runway.signal}</div>
    </div>
    <div class="metric-item">
      <div class="metric-title">Operating Margin</div>
      <div class="metric-value">${(data.financial_health.metrics.operating_margin.value * 100).toFixed(1)}%</div>
      <div class="metric-signal badge-${data.financial_health.metrics.operating_margin.signal === 'above_benchmark' ? 'success' : 'warning'}">${data.financial_health.metrics.operating_margin.signal.replace('_', ' ')}</div>
    </div>
    <div class="metric-item">
      <div class="metric-title">Working Capital Cycle</div>
      <div class="metric-value">${data.financial_health.metrics.working_capital_cycle.value_days} days</div>
      <div class="metric-signal badge-${data.financial_health.metrics.working_capital_cycle.signal === 'favourable' ? 'success' : (data.financial_health.metrics.working_capital_cycle.signal === 'normal' ? 'warning' : 'danger')}">${data.financial_health.metrics.working_capital_cycle.signal}</div>
    </div>
    <div class="metric-item">
      <div class="metric-title">Debt Coverage (DSCR)</div>
      <div class="metric-value">${data.financial_health.metrics.debt_service_coverage.dscr}x</div>
      <div class="metric-signal badge-${data.financial_health.metrics.debt_service_coverage.signal === 'comfortable' ? 'success' : 'warning'}">${data.financial_health.metrics.debt_service_coverage.signal}</div>
    </div>
  `;
}

function renderMarket(mi) {
  document.getElementById('market-archetype').textContent = mi.dominant_archetype.replace('_', ' ').toUpperCase();
  document.getElementById('market-saturation').textContent = `${mi.saturation_index} (${mi.saturation_index > 1.0 ? 'Oversupplied' : (mi.saturation_index < 0.6 ? 'Opportunity Gap' : 'Balanced')})`;
  document.getElementById('market-footfall').textContent = `${mi.capturable_footfall.capturable_footfall_weekly.toLocaleString()} / wk`;
  document.getElementById('market-pricing').textContent = `₹${mi.recommended_pricing.low} - ₹${mi.recommended_pricing.high}`;
  document.getElementById('market-pricing-conf').textContent = `${mi.recommended_pricing.confidence.toUpperCase()} CONFIDENCE`;

  const catchmentList = document.getElementById('market-catchments');
  catchmentList.innerHTML = '';
  for (const [key, details] of Object.entries(mi.catchments)) {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="label">${details.label}:</span>
      <span class="value highlighted-text">${details.poi_count} POIs</span>
    `;
    catchmentList.appendChild(li);
  }

  drawActivityCurveChart(mi.hourly_curve_168, mi.peak_summary);

  const tbody = document.querySelector('#market-generators tbody');
  tbody.innerHTML = '';
  mi.top_generators.forEach(g => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${g.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</strong></td>
      <td>${g.distance_m} m</td>
      <td>${g.footprint_sqm} sqm</td>
      <td><span class="highlighted-text">${(g.weight * 10).toFixed(2)}%</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function drawActivityCurveChart(curve, peak) {
  const container = document.getElementById('activity-chart-container');
  if (!container) return;
  container.innerHTML = '';

  const w = container.clientWidth || 600;
  const h = 240;
  const paddingLeft = 40;
  const paddingRight = 10;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartW = w - paddingLeft - paddingRight;
  const chartH = h - paddingTop - paddingBottom;

  const maxVal = Math.max(...curve);
  const minVal = Math.min(...curve);

  const points = curve.map((val, idx) => {
    const x = paddingLeft + (idx / 167) * chartW;
    const y = h - paddingBottom - ((val - minVal) / (maxVal - minVal || 1)) * chartH;
    return { x, y, val, idx };
  });

  let pathD = `M ${points[0].x} ${points[0].y} `;
  for (let i = 1; i < points.length; i++) {
    pathD += `L ${points[i].x} ${points[i].y} `;
  }

  let areaD = pathD + `L ${points[points.length - 1].x} ${h - paddingBottom} L ${points[0].x} ${h - paddingBottom} Z`;

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  let gridX = '';
  let labelsX = '';
  for (let d = 0; d < 7; d++) {
    const x = paddingLeft + (d / 7) * chartW;
    gridX += `<line x1="${x}" y1="${paddingTop}" x2="${x}" y2="${h - paddingBottom}" stroke="rgba(0,109,119,0.06)" />`;
    labelsX += `<text x="${x + (chartW / 14)}" y="${h - 10}" text-anchor="middle" font-size="9" fill="#4b5563">${dayNames[d]}</text>`;
  }

  const peakIdx = (["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(peak.peak_day) * 24) + peak.peak_hour;
  const peakPoint = points[peakIdx] || points[0];
  const peakDot = `<circle cx="${peakPoint.x}" cy="${peakPoint.y}" r="6" fill="#ca6702" stroke="#fff" stroke-width="1.5" />
                   <text x="${peakPoint.x}" y="${peakPoint.y - 12}" text-anchor="middle" font-size="10" font-weight="700" fill="#002c2d">Peak: ${peak.peak_day} ${peak.peak_window}</text>`;

  const svg = `
    <svg width="${w}" height="${h}" style="overflow:visible;">
      <defs>
        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#006d77" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="#006d77" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      ${gridX}
      <line x1="${paddingLeft}" y1="${h - paddingBottom}" x2="${w - paddingRight}" y2="${h - paddingBottom}" stroke="rgba(0,109,119,0.12)" />
      
      <path d="${areaD}" fill="url(#area-grad)" />
      <path d="${pathD}" fill="none" stroke="#006d77" stroke-width="2" />
      
      ${peakDot}
      ${labelsX}
    </svg>
  `;
  container.innerHTML = svg;

  document.getElementById('activity-chart-insight').innerHTML = `
    Your business experiences peak weekly demand on <strong>${peak.peak_day}</strong> during the hour <strong>${peak.peak_window}</strong>.
    Weekend footfall volume is <strong>${Math.round(peak.weekend_to_weekday_ratio * 100)}%</strong> of typical weekdays.
  `;
}

function renderRiskAndInsurance(data) {
  const tbody = document.querySelector('#risk-asset-table tbody');
  tbody.innerHTML = '';
  data.business.assets.forEach(a => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${a.asset_class.replace(/_/g, ' ').toUpperCase()}</strong></td>
      <td>₹${a.declared_value_inr.toLocaleString('en-IN')}</td>
      <td>Floor ${a.floor_level !== undefined ? a.floor_level : data.business.floor_level}</td>
      <td>${a.peak_season_multiplier}x</td>
    `;
    tbody.appendChild(tr);
  });

  const container = document.getElementById('insurance-advisor-list');
  container.innerHTML = '';
  data.insurance_recommendations.comparisons.forEach(c => {
    const card = document.createElement('div');
    card.className = 'insurance-card';
    card.innerHTML = `
      <div class="ins-details">
        <h3>${c.product_name}</h3>
        <p>Recommended Cover: <strong>₹${c.recommended_sum_insured_inr.toLocaleString('en-IN')}</strong></p>
        <span style="font-size:11px; color:#006d77;">🛒 Buy via PolicyBazaar Match Partner</span>
      </div>
      <div class="ins-verdict">
        <span class="badge badge-${c.decision_signal}">${c.decision_signal.replace(/_/g, ' ')}</span>
        <div style="font-size:11px; margin-top:4px;">Est. Premium: <strong>₹${c.indicative_premium_low_inr.toLocaleString('en-IN')} - ₹${c.indicative_premium_high_inr.toLocaleString('en-IN')}/yr</strong></div>
        <p style="font-size:11px; color: var(--neutral-600); font-style:italic; margin-top:2px;">${c.recommendation}</p>
        <a href="https://www.policybazaar.com/sme-insurance/" target="_blank" class="btn btn-secondary" style="font-size:10px; padding:4px 8px; margin-top:8px; display:inline-block;">Get Quotes ↗</a>
      </div>
    `;
    container.appendChild(card);
  });

  document.getElementById('insurance-disclaimer').textContent = data.insurance_recommendations.disclaimer;
}

function initLossSlider() {
  const slider = document.getElementById('flood-simulator-slider');
  const sliderVal = document.getElementById('flood-slider-value');
  const simCost = document.getElementById('simulated-damage-cost');

  const updateSim = () => {
    const depth = parseInt(slider.value);
    sliderVal.textContent = `${depth} cm`;

    if (!activeBusinessData) return;
    
    let totalLoss = 0.0;
    const biz = activeBusinessData.business;

    biz.assets.forEach(asset => {
      const asset_floor = asset.floor_level !== undefined && asset.floor_level !== null ? asset.floor_level : biz.floor_level;
      const floorFactor = asset_floor <= 0 ? 1.0 : (asset_floor === 1 ? 0.55 : (asset_floor === 2 ? 0.15 : 0.0));
      const exposure = asset.declared_value_inr * asset.peak_season_multiplier * floorFactor;
      
      const table = DAMAGE_FUNCTIONS[asset.asset_class] || DAMAGE_FUNCTIONS.generic_inventory;
      let vuln = 0.0;
      if (depth > 0) {
        if (depth >= 100) {
          vuln = table[100] || 1.0;
        } else {
          let lower = 30, upper = 60;
          if (depth >= 30 && depth <= 60) { lower = 30; upper = 60; }
          else if (depth > 60 && depth < 100) { lower = 60; upper = 100; }
          const f_lo = table[lower] || 0.0;
          const f_hi = table[upper] || 0.0;
          
          if (depth < lower) {
            vuln = f_lo * (depth / lower);
          } else {
            const frac = (depth - lower) / (upper - lower);
            vuln = f_lo + (f_hi - f_lo) * frac;
          }
        }
      }

      totalLoss += exposure * vuln;
    });

    simCost.textContent = `₹${Math.round(totalLoss).toLocaleString('en-IN')}`;
  };

  slider.addEventListener('input', updateSim);
  window.triggerLossSliderUpdate = updateSim;
}

const DAMAGE_FUNCTIONS = {
  textiles_paper: { 30: 0.55, 60: 0.90, 100: 1.00 },
  packaged_fmcg: { 30: 0.20, 60: 0.55, 100: 0.85 },
  heavy_machinery: { 30: 0.05, 60: 0.25, 100: 0.60 },
  electronics: { 30: 0.70, 60: 0.95, 100: 1.00 },
  furniture_fixtures: { 30: 0.30, 60: 0.60, 100: 0.90 },
  perishable_food: { 30: 0.65, 60: 0.95, 100: 1.00 },
  generic_inventory: { 30: 0.40, 60: 0.70, 100: 0.95 }
};

let activeSchemeTier = 'eligible';
let activeSchemeList = null;

function renderSchemes(schemes) {
  activeSchemeList = schemes;
  const searchInput = document.getElementById('scheme-search');

  const tabBtns = document.querySelectorAll('.scheme-tab-btn');
  tabBtns.forEach(btn => {
    btn.onclick = () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeSchemeTier = btn.getAttribute('data-scheme-tier');
      renderSchemeListFiltered();
    };
  });

  searchInput.oninput = () => {
    renderSchemeListFiltered();
  };

  renderSchemeListFiltered();
}

function renderSchemeListFiltered() {
  if (!activeSchemeList) return;
  const container = document.getElementById('scheme-results-container');
  const searchVal = document.getElementById('scheme-search').value.toLowerCase();
  
  container.innerHTML = '';
  const schemes = activeSchemeList[activeSchemeTier] || [];

  const filtered = schemes.filter(s => {
    return s.name.toLowerCase().includes(searchVal) ||
           s.summary.toLowerCase().includes(searchVal) ||
           s.focus_area.toLowerCase().includes(searchVal) ||
           s.benefit.toLowerCase().includes(searchVal) ||
           s.documents.some(d => d.toLowerCase().includes(searchVal));
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="profile-row" style="justify-content:center; color:var(--neutral-600);">No schemes match your criteria.</div>`;
    return;
  }

  filtered.forEach((s, idx) => {
    const card = document.createElement('div');
    card.className = 'scheme-card';
    card.innerHTML = `
      <div class="scheme-card-header">
        <div>
          <h3>${s.name}</h3>
          <span class="focus">${s.focus_area || s.ministry}</span>
        </div>
        <span class="badge badge-worth_considering">${s.confidence.toUpperCase()} MATCH</span>
      </div>
      <p style="font-size: 13px; color: var(--neutral-700);">${s.summary}</p>
      <div class="scheme-benefit-box">
        <strong>Direct Benefit:</strong> ${s.benefit}
      </div>
      
      <div class="scheme-details-drawer" id="drawer-${activeSchemeTier}-${idx}">
        <h4>Documents Required</h4>
        <ul class="doc-list">
          ${s.documents.map(d => `<li>${d}</li>`).join('')}
        </ul>
        <h4>How To Apply</h4>
        <p class="apply-text">${s.how_to_apply}</p>
        <a href="${s.source_url}" target="_blank" class="btn btn-secondary" style="font-size:11px; padding:6px 12px;">Official Government Portal ↗</a>
      </div>

      <div class="scheme-card-actions">
        <button class="btn btn-primary" style="font-size:11px; padding:6px 12px;" onclick="toggleSchemeDrawer('${activeSchemeTier}-${idx}', this)">Learn More / Requirements</button>
      </div>
    `;
    container.appendChild(card);
  });
}

window.toggleSchemeDrawer = function(id, btn) {
  const drawer = document.getElementById(`drawer-${id}`);
  if (drawer.style.display === 'block') {
    drawer.style.display = 'none';
    btn.textContent = 'Learn More / Requirements';
  } else {
    drawer.style.display = 'block';
    btn.textContent = 'Collapse Details';
  }
};

function renderFinancialHealth(fh) {
  const runway = fh.metrics.cash_runway.value_months;
  const gaugeText = document.getElementById('runway-gauge-text');
  const fill = document.getElementById('runway-gauge-fill');
  
  gaugeText.textContent = runway.toFixed(1);
  
  const maxRunway = 6;
  const fraction = Math.min(runway, maxRunway) / maxRunway;
  const dashoffset = 125.6 - (fraction * 125.6);
  fill.style.strokeDashoffset = dashoffset;
  
  const runwaySignal = fh.metrics.cash_runway.signal;
  let signalClass = 'badge-success';
  if (runwaySignal === 'critical') signalClass = 'badge-danger';
  else if (runwaySignal === 'weak') signalClass = 'badge-warning';
  
  document.getElementById('runway-verdict').innerHTML = `
    Status: <span class="badge ${signalClass}">${runwaySignal.toUpperCase()}</span>
    <br><span style="font-size:12px; color:var(--neutral-600);">Burn Rate: ₹${fh.snapshot.avg_monthly_burn_inr.toLocaleString('en-IN')}/mo</span>
  `;

  const yourMargin = fh.metrics.operating_margin.value;
  const benchMargin = fh.metrics.operating_margin.sector_benchmark;
  
  document.getElementById('fin-your-margin').textContent = `${(yourMargin * 100).toFixed(1)}%`;
  document.getElementById('fin-your-margin-bar').style.width = `${Math.max(yourMargin * 100, 0)}%`;

  document.getElementById('fin-bench-margin').textContent = `${(benchMargin * 100).toFixed(1)}%`;
  document.getElementById('fin-bench-margin-bar').style.width = `${Math.max(benchMargin * 100, 0)}%`;

  document.getElementById('fin-wcc-days').textContent = `${fh.metrics.working_capital_cycle.value_days} days (${fh.metrics.working_capital_cycle.signal})`;
  document.getElementById('fin-wcc-days').className = 'value ' + (fh.metrics.working_capital_cycle.signal === 'favourable' ? 'badge-success' : 'badge-warning');

  document.getElementById('fin-dscr-ratio').textContent = `${fh.metrics.debt_service_coverage.dscr}x (${fh.metrics.debt_service_coverage.signal})`;
  document.getElementById('fin-dscr-ratio').className = 'value ' + (fh.metrics.debt_service_coverage.signal === 'comfortable' ? 'badge-success' : 'badge-warning');

  document.getElementById('fin-top-customer').textContent = `${(fh.metrics.revenue_concentration.top_customer_share * 100).toFixed(1)}% (${fh.metrics.revenue_concentration.signal})`;
  document.getElementById('fin-top-customer').className = 'value ' + (fh.metrics.revenue_concentration.signal === 'diversified' ? 'badge-success' : 'badge-warning');

  const suggestionsBox = document.getElementById('financial-suggestions');
  suggestionsBox.innerHTML = '';
  
  if (runway < 3) {
    suggestionsBox.innerHTML += `<li>⚠️ <strong>Critical safety stock alert:</strong> Cash runway is below 3 months. Stagger high-cost vendor repayments and review options to accelerate GSTR credit processing.</li>`;
  }
  if (yourMargin < benchMargin) {
    suggestionsBox.innerHTML += `<li>📉 <strong>Margin compression alert:</strong> Your operating margin is below the sector average. Audit supplier prices and evaluate product pricing margins using our ticket sizes recommendations.</li>`;
  }
  if (fh.metrics.working_capital_cycle.value_days > 45) {
    suggestionsBox.innerHTML += `<li>💸 <strong>Working Capital Trapped:</strong> Cash is trapped in inventory. Negotiate extended Payable terms (DPO) and restrict credits to top customers.</li>`;
  }
  if (fh.metrics.revenue_concentration.top_customer_share > 0.3) {
    suggestionsBox.innerHTML += `<li>👤 <strong>Client concentration risk:</strong> Over 30% of sales come from one client. Focus onboarding efforts on secondary local client pools.</li>`;
  }

  if (suggestionsBox.innerHTML === '') {
    suggestionsBox.innerHTML = `<li class="success-suggestion">🎉 <strong>Excellent financial health!</strong> All key cash-flow metrics exceed industry benchmarks. Keep monitoring risks.</li>`;
  }
}

function renderCompliance(comp) {
  const tableBody = document.querySelector('#compliance-calendar-table tbody');
  tableBody.innerHTML = '';

  const banner = document.getElementById('compliance-insight-banner');
  banner.textContent = comp.insight;
  banner.className = 'compliance-status-banner ' + comp.priority;

  comp.items.forEach(i => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${i.title}</strong></td>
      <td>${i.category}</td>
      <td><code>${i.due_date}</code></td>
      <td><span class="${i.urgency === 'overdue' || i.urgency === 'critical' ? 'badge-danger' : 'badge-warning'}">${i.days_until_due} days</span></td>
      <td>${i.authority}</td>
      <td><span class="badge badge-${i.urgency}">${i.urgency.toUpperCase()}</span></td>
    `;
    tableBody.appendChild(tr);
  });
}

function renderSupplyChain(sc) {
  const band = document.getElementById('supply-chain-risk-band');
  const text = document.getElementById('supply-chain-overall-insight');
  const container = document.getElementById('suppliers-risk-container');

  band.textContent = `${sc.risk_band.toUpperCase()} RISK`;
  band.className = `badge badge-${sc.risk_band === 'high' ? 'strong_priority' : (sc.risk_band === 'moderate' ? 'warning' : 'worth_considering')}`;
  
  const weatherLabel = activeBusinessData?.weather?.current?.condition_label || '';
  const isWet = weatherLabel.toLowerCase().includes('rain') || weatherLabel.toLowerCase().includes('shower') || weatherLabel.toLowerCase().includes('storm');
  
  if (isWet) {
    text.innerHTML = `⚠️ <strong>Weather Alert Overlap:</strong> Active precipitation (${weatherLabel.toLowerCase()}) registered in the logistics corridor. Surat/Shenzhen cargo transits are experiencing 1-2 day delays.<br>${sc.insight}`;
  } else {
    text.textContent = sc.insight;
  }

  container.innerHTML = '';
  sc.suppliers.forEach(s => {
    const card = document.createElement('div');
    card.className = 'supplier-card' + (s.at_risk ? ' critical' : '');
    
    let warningHtml = "";
    if (isWet && (s.region.includes("Surat") || s.region.includes("Shenzhen"))) {
      warningHtml = `<span class="badge badge-strong_priority" style="margin-left:8px;">🌧️ Logistics Delay</span>`;
    }

    card.innerHTML = `
      <div class="supplier-card-header">
        <div>
          <h3>${s.supplier_name} ${warningHtml}</h3>
          <span class="loc">${s.region} (${Math.round(s.share_of_supply * 100)}% supply)</span>
        </div>
        <span class="badge ${s.at_risk ? 'badge-strong_priority' : 'badge-worth_considering'}">${Math.round(s.composite_risk * 100)}% RISK</span>
      </div>
      <p style="font-size:12px; color:var(--neutral-700);">Material: <strong>${s.material}</strong></p>
      <div class="profile-row" style="font-size:11px; padding:6px 0;">
        <span>Lead Time: ${s.lead_time_days} days</span>
        <span>Reorder Point: ${s.reorder_point_days} days</span>
      </div>
      <div class="supplier-rec-box">
        <strong>Precautionary Steps:</strong> ${s.recommendations.join(' ')}
      </div>
    `;
    container.appendChild(card);
  });

  drawSupplyChainMap(sc.suppliers);
}

function drawSupplyChainMap(suppliers) {
  const container = document.getElementById('supply-chain-map-container');
  if (!container) return;
  container.innerHTML = '';

  const w = container.clientWidth || 550;
  const h = 300;

  let nodes = '';
  let routes = '';
  let labels = '';

  const isBangalore = activeBusinessData?.business.state === 'Karnataka';
  const destX = isBangalore ? w * 0.7 : w * 0.55;
  const destY = isBangalore ? h * 0.75 : h * 0.6;
  const destName = isBangalore ? "Bangalore Hub" : "Mumbai Outlet";

  nodes += `<circle cx="${destX}" cy="${destY}" r="9" class="map-node" />`;
  labels += `<text x="${destX}" y="${destY + 20}" text-anchor="middle" font-weight="700" class="map-text" fill="#002c2d">${destName}</text>`;

  suppliers.forEach((s, idx) => {
    let x = w * 0.2;
    let y = h * 0.3;
    if (s.region.includes("Surat")) { x = w * 0.45; y = h * 0.25; }
    else if (s.region.includes("Ahmedabad")) { x = w * 0.25; y = h * 0.15; }
    else if (s.region.includes("Shenzhen")) { x = w * 0.15; y = h * 0.2; }
    else if (s.region.includes("Mumbai")) { x = destX - 45; y = destY - 20; }

    const isHigh = s.composite_risk > 0.4;
    const nodeClass = isHigh ? 'map-node-danger' : 'map-node';
    
    routes += `<path d="M ${x} ${y} Q ${(x+destX)/2} ${(y+destY)/2 - 30} ${destX} ${destY}" class="map-route" stroke="${isHigh ? '#d90429' : '#0a9396'}" />`;
    nodes += `<circle cx="${x}" cy="${y}" r="6" class="${nodeClass}" />`;
    labels += `<text x="${x}" y="${y - 10}" text-anchor="middle" font-size="9" class="map-text" fill="#1f2937">${s.supplier_name}</text>`;
  });

  const svg = `
    <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" style="background-color:#f0f6f6; border-radius:10px;">
      <path d="M 0 ${h*0.8} Q ${w*0.3} ${h*0.5} ${w} ${h*0.9} L ${w} ${h} L 0 ${h} Z" fill="#e0f2f1" opacity="0.4" />
      ${routes}
      ${nodes}
      ${labels}

      <g transform="translate(15, 15)">
        <rect width="120" height="50" rx="5" class="map-legend-box" fill="#ffffff" stroke="rgba(0,109,119,0.06)" />
        <circle cx="15" cy="15" r="4" fill="#d90429" />
        <text x="25" y="18" font-size="9" fill="#4b5563">High Risk Supplier</text>
        <circle cx="15" cy="35" r="4" fill="#0a9396" />
        <text x="25" y="38" font-size="9" fill="#4b5563">Stable Sourcing</text>
      </g>
    </svg>
  `;
  container.innerHTML = svg;
}

function renderWeather(w) {
  document.getElementById('weather-risk-level-badge').textContent = `${w.overall_risk.toUpperCase()} RISK`;
  document.getElementById('weather-risk-level-badge').className = `badge badge-${w.overall_risk === 'high' ? 'strong_priority' : (w.overall_risk === 'moderate' ? 'warning' : 'worth_considering')}`;

  document.getElementById('weather-current-icon').textContent = w.current.icon;
  document.getElementById('weather-current-temp').textContent = `${w.current.temp_c}°C`;
  document.getElementById('weather-current-desc').textContent = w.current.condition_label;
  document.getElementById('weather-current-stats').textContent = `Humidity: ${w.current.humidity_pct}% | Wind: ${w.current.wind_kmph} km/h`;

  document.getElementById('weather-weekly-summary').innerHTML = `
    <strong>Operational Verdict:</strong> ${w.overall_summary}
    <br><span style="font-size:12px; color: var(--neutral-700);">Modelled weekly financial impact proxy: <strong>₹${w.estimated_weekly_impact_inr.toLocaleString('en-IN')}</strong> sales loss.</span>
  `;

  const grid = document.getElementById('weather-forecast-container');
  grid.innerHTML = '';
  w.forecast.forEach(f => {
    const card = document.createElement('div');
    card.className = `forecast-card ${f.risk_level === 'high' ? 'risk-high' : ''}`;
    card.innerHTML = `
      <div class="day">${f.day_name.substring(0, 3)}</div>
      <div class="icon">${f.icon}</div>
      <div class="temp">${f.temp_c}°C</div>
      <div class="label" title="${f.condition_label}">${f.condition_label}</div>
    `;
    grid.appendChild(card);
  });
}

function initDisasterSelector() {
  const select = document.getElementById('emergency-disaster-select');
  if (select) {
    select.onchange = () => {
      if (activeBusinessId) triggerDisasterAction(activeBusinessId);
    };
  }
}

async function triggerDisasterAction(id) {
  const disasterType = document.getElementById('emergency-disaster-select').value;
  try {
    const res = await fetch(`/api/analyze/${id}`);
    const data = await res.json();
    
    const playbookData = getLocalPlaybook(disasterType, data);
    
    const actUl = document.getElementById('emergency-actions');
    actUl.innerHTML = '';
    playbookData.actions.forEach(a => {
      actUl.innerHTML += `<li>${a}</li>`;
    });

    const clUl = document.getElementById('emergency-claims');
    clUl.innerHTML = '';
    playbookData.claims.forEach(c => {
      clUl.innerHTML += `<li>${c}</li>`;
    });

    const asUl = document.getElementById('emergency-assistance');
    asUl.innerHTML = '';
    playbookData.assistance.forEach(a => {
      asUl.innerHTML += `<li>${a}</li>`;
    });

    const helpBox = document.getElementById('emergency-helplines');
    helpBox.innerHTML = '';
    playbookData.helplines.forEach(h => {
      const parts = h.split(':');
      helpBox.innerHTML += `
        <div class="helpline-card">
          <div class="name">${parts[0]}</div>
          <div class="num">${parts[1] || ''}</div>
        </div>
      `;
    });

  } catch (err) {
    console.error("Error setting emergency playbook:", err);
  }
}

function getLocalPlaybook(type, data) {
  const templates = {
    flood: {
      actions: [
        "Ensure personal safety — evacuate if water level is rising rapidly",
        "Move inventory and machinery to upper floors if safe to do so",
        "Turn off electrical mains to prevent short-circuit damage",
        "Document damage with photographs and video before cleanup",
        "Contact your insurer within 24-48 hours to initiate claim"
      ],
      claims: [
        "Shopkeepers Package Policy — covers flood damage to stock and premises",
        "Fire & Allied Perils policy — check if flood extension is active",
        "Required: stock register records, purchase bills, damage photos"
      ],
      assistance: [
        "State Disaster Relief Fund (SDRF) ex-gratia",
        "SIDBI emergency rehabilitation scheme",
        "Extension of GST compliance filings in affected zones"
      ],
      helplines: ["NDMA:1078", "State Control:112", "OMBUDSMAN:155255"]
    },
    cyclone: {
      actions: [
        "Secure loose storefront signage and structural frames",
        "Keep perishable inventory in well-insulated zones away from glass",
        "Backup billing terminals and digital registers to secure servers",
        "Charge backup lights and emergency devices"
      ],
      claims: [
        "Property structural insurance policy coverage",
        "Cargo transit or stock insurance coverage details",
        "Submit IMD meteorological warning records with claims file"
      ],
      assistance: [
        "National Disaster Response Fund (NDRF) support",
        "State subsidized reconstruction advances"
      ],
      helplines: ["NDMA:1078", "IMD Cyclone:011-24611338"]
    },
    fire: {
      actions: [
        "Evacuate personnel immediately to assembly area",
        "Call Fire Brigade (101) and cut off power mains if possible",
        "Do not re-enter premises until declared safe by authorities",
        "Isolate and preserve origin point evidence"
      ],
      claims: [
        "Fire & Allied Perils Policy — primary cover for fire damage",
        "Shopkeepers Package — includes fire cover for stock and assets",
        "Business Interruption clause to cover loss of profit during rebuild",
        "Submit Fire Brigade report, FIR, and claim forms within 7 days"
      ],
      assistance: [
        "Commercial rehabilitation credits",
        "State ex-gratia compensation schemes"
      ],
      helplines: ["Fire Station:101", "Police Control:100"]
    },
    earthquake: {
      actions: [
        "Drop, cover, and hold under sturdy counters during tremors",
        "Once shaking stops, evacuate to open ground",
        "Have building structure safety checked before re-opening",
        "Document cracks and wall fissures with photographs"
      ],
      claims: [
        "Earthquake extension endorsement — check policy schedule",
        "Engineering structural assessment valuation sheets"
      ],
      assistance: [
        "NDRF rehabilitation packages",
        "MSME emergency structural relief"
      ],
      helplines: ["NDMA:1078", "NDRF:9711077111"]
    },
    heatwave: {
      actions: [
        "Run compressor checks on refrigerator cabinets",
        "Shift staff schedules to avoid peak noon heat (12-3 PM)",
        "Provide chilled mineral water and hydration salts for staff",
        "Pre-cool retail counters before peak afternoon hours"
      ],
      claims: [
        "Machinery breakdown policy for compressor burnouts",
        "Stock deterioration endorsement for perishable items"
      ],
      assistance: [
        "Commercial tariff cooling waivers where applicable",
        "State heat action framework support"
      ],
      helplines: ["Medical:108", "Control Room:112"]
    }
  };

  return templates[type] || templates.flood;
}

// ---------------------------------------------------------------------------
// AI Chat Assistant Interface
// ---------------------------------------------------------------------------
function initChat() {
  const chatInput = document.getElementById('chat-input-text');
  const sendBtn = document.getElementById('chat-send-btn');
  const chatHistory = document.getElementById('chat-history-box');
  const settingsKeyInput = document.getElementById('settings-gemini-key');

  if (settingsKeyInput) {
    const savedKey = localStorage.getItem('bizshield_gemini_key') || '';
    settingsKeyInput.value = savedKey;
    settingsKeyInput.onchange = () => {
      localStorage.setItem('bizshield_gemini_key', settingsKeyInput.value.trim());
      showNotification("🔑 API Key Saved", "Gemini API key updated in local storage.");
    };
  }

  const sendMessage = async () => {
    const text = chatInput.value.trim();
    if (!text) return;

    appendMessage(text, 'user');
    chatInput.value = '';

    const loaderId = appendLoader();

    try {
      const headers = { 'Content-Type': 'application/json' };
      const savedKey = localStorage.getItem('bizshield_gemini_key');
      if (savedKey) {
        headers['x-gemini-key'] = savedKey;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ question: text, businessId: activeBusinessId })
      });
      const data = await res.json();
      removeLoader(loaderId);

      if (data.error) {
        appendMessage("Sorry, I encountered an error: " + data.error, 'bot');
      } else {
        typewriterMessage(data.answer, 'bot');
      }
    } catch (err) {
      removeLoader(loaderId);
      appendMessage("Network failure. Please ensure the backend is running.", 'bot');
    }
  };

  if (sendBtn) sendBtn.addEventListener('click', sendMessage);
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  const bubbles = document.querySelectorAll('.prompt-bubble');
  bubbles.forEach(b => {
    b.onclick = () => {
      chatInput.value = b.getAttribute('data-prompt');
      sendMessage();
    };
  });
}

function appendMessage(text, sender) {
  const chatHistory = document.getElementById('chat-history-box');
  const div = document.createElement('div');
  div.className = `chat-message ${sender}`;
  div.innerHTML = parseMarkdown(text);
  chatHistory.appendChild(div);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function typewriterMessage(text, sender) {
  const chatHistory = document.getElementById('chat-history-box');
  const div = document.createElement('div');
  div.className = `chat-message ${sender}`;
  chatHistory.appendChild(div);

  const htmlContent = parseMarkdown(text);
  div.innerHTML = htmlContent;
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function appendLoader() {
  const chatHistory = document.getElementById('chat-history-box');
  const div = document.createElement('div');
  const id = 'loader-' + Date.now();
  div.id = id;
  div.className = 'chat-message bot';
  div.innerHTML = `<span style="font-style:italic; color:var(--neutral-400);">BizShield is evaluating tools...</span>`;
  chatHistory.appendChild(div);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  return id;
}

function removeLoader(id) {
  const loader = document.getElementById(id);
  if (loader) loader.remove();
}

function parseMarkdown(text) {
  let html = text
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/\n/g, '<br>');
  
  if (html.includes('<li>')) {
    html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
  }
  return html;
}
