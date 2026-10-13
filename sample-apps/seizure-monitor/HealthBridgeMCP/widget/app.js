/**
 * HealthBridge — app.js
 * Patient Timeline Widget
 *
 * Architecture:
 *  - Loads patients from data/patients.json (or live MCP resource)
 *  - Renders visit timeline with per-hospital colour coding
 *  - On new visit submit: orchestrates 4 MCP tool calls in sequence
 *  - Renders safety flags, medicine availability, and follow-up urgency inline
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  // When MCP server is running on HTTP/SSE mode (python server.py --http)
  // set USE_MCP_API to true and configure MCP_BASE_URL.
  // Otherwise the widget loads from static JSON for standalone demo.
  USE_MCP_API: false,
  MCP_BASE_URL: 'http://localhost:8080',
  PATIENTS_JSON: '../data/patients.json',
};

const HOSPITAL_NAMES = {
  'HOSP-A': 'City General Hospital',
  'HOSP-B': 'Sunrise Medical Centre',
  'HOSP-C': 'Green Valley Clinic',
  'HOSP-D': 'Lakeside Pharmacy & Hospital',
};

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

const state = {
  patients: [],        // array of patient objects
  patientMap: {},      // patientId → patient
  selectedPatientId: null,
  lastSafetyResult: null,
  lastFollowupResult: null,
  lastAvailResults: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// DOM refs
// ─────────────────────────────────────────────────────────────────────────────

const $  = (id) => document.getElementById(id);
const qs = (sel, ctx = document) => ctx.querySelector(sel);
const qa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso || iso === 'unknown') return '—';
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function getHospitalName(id) {
  return HOSPITAL_NAMES[id] || id;
}

function toast(msg, type = 'info', duration = 3500) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  $('toast-container').appendChild(el);
  setTimeout(() => el.remove(), duration);
}

function showLoading(msg = 'Processing…') {
  $('loading-text').textContent = msg;
  $('loading-overlay').classList.remove('hidden');
}
function hideLoading() {
  $('loading-overlay').classList.add('hidden');
}

function setSubmitLoading(on) {
  $('submit-text').classList.toggle('hidden', on);
  $('submit-spinner').classList.toggle('hidden', !on);
  $('btn-submit-visit').disabled = on;
}

// ─────────────────────────────────────────────────────────────────────────────
// Data Loading
// ─────────────────────────────────────────────────────────────────────────────

async function loadPatients() {
  try {
    let patients;
    if (CONFIG.USE_MCP_API) {
      const res = await callMCPResource('healthbridge://patients/all');
      patients = JSON.parse(res.contents[0].text);
    } else {
      const res = await fetch(CONFIG.PATIENTS_JSON);
      if (!res.ok) throw new Error('Failed to fetch patients.json');
      patients = await res.json();
    }

    state.patients = patients;
    state.patientMap = {};
    patients.forEach(p => { state.patientMap[p.patientId] = p; });

    renderPatientList(patients);
  } catch (err) {
    $('patient-list').innerHTML = `<div style="padding:16px;color:var(--text-muted);font-size:0.8rem;">
      Failed to load patients.<br><small>${err.message}</small></div>`;
    toast('Could not load patient data', 'error', 5000);
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// MCP API calls (used when USE_MCP_API=true)
// ─────────────────────────────────────────────────────────────────────────────

async function callMCPTool(name, args) {
  const res = await fetch(`${CONFIG.MCP_BASE_URL}/tools/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ arguments: args }),
  });
  if (!res.ok) throw new Error(`Tool ${name} returned ${res.status}`);
  const data = await res.json();
  // FastMCP returns content array; parse first text element
  if (data.content && data.content[0]) {
    return JSON.parse(data.content[0].text);
  }
  return data;
}

async function callMCPResource(uri) {
  const res = await fetch(`${CONFIG.MCP_BASE_URL}/resources/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uri }),
  });
  if (!res.ok) throw new Error(`Resource read failed: ${res.status}`);
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Patient List Rendering
// ─────────────────────────────────────────────────────────────────────────────

function renderPatientList(patients) {
  const list = $('patient-list');
  if (!patients.length) {
    list.innerHTML = '<div style="padding:16px;color:var(--text-muted);font-size:0.8rem;">No patients found.</div>';
    return;
  }

  list.innerHTML = patients.map(p => {
    const allergyBadge = p.knownAllergies && p.knownAllergies.length
      ? `<span class="patient-item-allergy">⚠ ${p.knownAllergies.length} allerg${p.knownAllergies.length > 1 ? 'ies' : 'y'}</span>`
      : '';
    return `
      <div class="patient-item" id="pi-${p.patientId}" data-id="${p.patientId}" role="button" tabindex="0">
        <div class="patient-avatar-sm">${initials(p.name)}</div>
        <div class="patient-item-info">
          <div class="patient-item-name">${p.name}</div>
          <div class="patient-item-meta">
            <span>${p.patientId}</span>
            <span>·</span>
            <span>${(p.visits || []).length} visit${(p.visits || []).length !== 1 ? 's' : ''}</span>
            ${allergyBadge}
          </div>
        </div>
      </div>`;
  }).join('');

  qa('.patient-item', list).forEach(el => {
    el.addEventListener('click', () => selectPatient(el.dataset.id));
    el.addEventListener('keydown', e => { if (e.key === 'Enter') selectPatient(el.dataset.id); });
  });
}

function filterPatientList(query) {
  const q = query.toLowerCase();
  qa('.patient-item').forEach(el => {
    const name = el.querySelector('.patient-item-name').textContent.toLowerCase();
    const id = el.dataset.id.toLowerCase();
    el.style.display = (name.includes(q) || id.includes(q)) ? '' : 'none';
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Patient Selection & Timeline Rendering
// ─────────────────────────────────────────────────────────────────────────────

function selectPatient(patientId) {
  state.selectedPatientId = patientId;
  state.lastSafetyResult = null;
  state.lastFollowupResult = null;
  state.lastAvailResults = [];

  // Auto-switch to timeline tab when a patient is selected
  if (typeof switchTab === 'function') switchTab('timeline');

  // Update sidebar active state
  qa('.patient-item').forEach(el => el.classList.remove('active'));
  const item = $(`pi-${patientId}`);
  if (item) item.classList.add('active');

  const patient = state.patientMap[patientId];
  if (!patient) return;


  // Show patient header
  $('empty-state').classList.add('hidden');
  const header = $('patient-header');
  header.classList.remove('hidden');

  $('patient-avatar').textContent = initials(patient.name);
  $('patient-name').textContent = patient.name;
  $('patient-id-badge').textContent = patient.patientId;
  $('patient-dob').textContent = `DOB: ${formatDate(patient.dateOfBirth)}`;

  const allergyTags = $('patient-allergies');
  if (patient.knownAllergies && patient.knownAllergies.length) {
    allergyTags.innerHTML = patient.knownAllergies
      .map(a => `<span class="allergy-tag">⚠ ${a}</span>`)
      .join('');
    $('patient-allergies-wrap').classList.remove('hidden');
  } else {
    $('patient-allergies-wrap').classList.add('hidden');
  }

  // Hide risk banner until a safety check runs
  const banner = $('risk-banner');
  banner.className = 'risk-banner hidden';

  // Render timeline
  const timeline = $('timeline');
  timeline.classList.remove('hidden');

  const sorted = [...(patient.visits || [])].sort((a, b) =>
    new Date(b.date) - new Date(a.date));

  if (!sorted.length) {
    timeline.innerHTML = `<div style="padding:20px;color:var(--text-muted);font-size:0.85rem;">No visits recorded yet. Use "Log New Visit" to add one.</div>`;
    return;
  }

  timeline.innerHTML = sorted.map((v, idx) =>
    renderVisitCard(v, idx, {})
  ).join('');

  // Re-attach note toggle
  attachNoteToggles(timeline);
}

function renderVisitCard(visit, idx, opts = {}) {
  const {
    flags = [],
    availability = [],
    followup = null,
    isNew = false,
  } = opts;

  const delay = idx * 60;
  const hospitalClass = visit.hospitalId || 'HOSP-X';

  const medsHtml = (visit.prescribedMedicines || []).map(m =>
    `<div class="med-item"><span class="med-name-txt">${m.name}</span><span class="med-dosage-txt">${m.dosage}</span></div>`
  ).join('') || '<span style="color:var(--text-muted);font-size:0.8rem;">None recorded</span>';

  const testsHtml = (visit.testsOrdered || []).length
    ? visit.testsOrdered.map(t => `<span class="test-item">${t}</span>`).join('')
    : '<span style="color:var(--text-muted);font-size:0.8rem;">—</span>';

  const allergiesHtml = (visit.allergiesNoted || []).length
    ? visit.allergiesNoted.map(a => `<span class="allergy-noted-item">⚠ ${a}</span>`).join('')
    : '';

  const flagsHtml = flags.length ? `
    <div class="flags-section">
      ${flags.map((f, fi) => renderFlag(f, fi)).join('')}
    </div>` : '';

  const availHtml = availability.length ? `
    <div class="availability-section">
      <div class="visit-section-label">Medicine Availability</div>
      <div class="availability-grid">
        ${availability.map(a => renderAvailability(a)).join('')}
      </div>
    </div>` : '';

  const followupHtml = followup ? renderFollowup(followup) : '';

  return `
    <div class="visit-card${isNew ? ' new-visit' : ''}" id="vc-${visit.visitId}"
         style="animation-delay:${delay}ms">
      <div class="visit-card-header">
        <span class="hospital-badge ${hospitalClass}">${visit.hospitalName || getHospitalName(visit.hospitalId)}</span>
        <span class="visit-date">${formatDate(visit.date)}</span>
        <span class="visit-doctor">· ${visit.doctorName || '—'}</span>
        <span class="visit-visit-id">${visit.visitId}</span>
      </div>
      <div class="visit-card-body">
        <div class="visit-diagnosis">${visit.diagnosis}</div>
        <div class="visit-grid">
          <div>
            <div class="visit-section-label">Prescribed Medicines</div>
            ${medsHtml}
          </div>
          <div>
            <div class="visit-section-label">Tests Ordered</div>
            ${testsHtml}
            ${allergiesHtml ? `<div style="margin-top:8px;"><div class="visit-section-label">Allergies Noted</div>${allergiesHtml}</div>` : ''}
          </div>
        </div>
        ${visit.notes ? `
        <div class="visit-notes collapsed" title="Click to expand notes">
          ${visit.notes}
        </div>` : ''}
        ${flagsHtml}
        ${availHtml}
        ${followupHtml}
      </div>
    </div>`;
}

function renderFlag(conflict, delay = 0) {
  const typeMap = {
    drug_interaction: { cls: 'drug-interaction', icon: '⚠️', label: 'Drug Interaction' },
    allergy:          { cls: 'allergy',           icon: '🚨', label: 'Allergy Alert' },
    duplicate_test:   { cls: 'duplicate-test',    icon: '🔁', label: 'Duplicate Test' },
  };
  const meta = typeMap[conflict.type] || { cls: 'drug-interaction', icon: '⚠️', label: conflict.type };
  return `
    <div class="flag-item ${meta.cls}" style="animation-delay:${delay * 80}ms">
      <span class="flag-icon">${meta.icon}</span>
      <div class="flag-content">
        <div class="flag-title">${meta.label}: ${conflict.detail}</div>
        <div class="flag-source">
          Source: <span>${conflict.sourceHospital}</span> on <span>${formatDate(conflict.sourceDate)}</span>
        </div>
      </div>
    </div>`;
}

function renderAvailability(item) {
  if (item.action === 'dispense') {
    return `<span class="avail-item dispense">🟢 ${item.medicine} — In Stock</span>`;
  } else if (item.action === 'reroute') {
    return `<span class="avail-item reroute">🔀 ${item.medicine} — Available at ${item.rerouteFacility}</span>`;
  } else {
    return `<span class="avail-item replenish">🔴 ${item.medicine} — Out of Stock · Replenishment Requested</span>`;
  }
}

function renderFollowup(fu) {
  const notifyHtml = fu.doctorNotified
    ? `<div class="followup-notify">📧 Doctor notified</div>` : '';
  return `
    <div class="followup-section">
      <span class="urgency-badge ${fu.urgencyTier}">${fu.urgencyTier}</span>
      <div class="followup-meta">
        <div class="followup-days">Follow-up in ${fu.recommendedFollowupDays} day${fu.recommendedFollowupDays !== 1 ? 's' : ''}</div>
        <div class="followup-reason">${fu.reason}</div>
        ${notifyHtml}
      </div>
    </div>`;
}

function attachNoteToggles(ctx = document) {
  qa('.visit-notes', ctx).forEach(el => {
    el.addEventListener('click', () => el.classList.toggle('collapsed'));
  });
}

function showRiskBanner(riskLevel) {
  const banner = $('risk-banner');
  const map = {
    high:    { cls: 'high',    text: '⚠️ HIGH RISK — review conflicts below' },
    caution: { cls: 'caution', text: '⚡ CAUTION — review flagged items below' },
    none:    { cls: 'none',    text: '✅ No conflicts detected' },
  };
  const m = map[riskLevel] || map.none;
  banner.className = `risk-banner ${m.cls}`;
  $('risk-banner-text').textContent = m.text;
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────────────────────

function openModal() {
  if (!state.selectedPatientId) {
    toast('Select a patient first', 'error');
    return;
  }
  $('f-patient-id').value = state.selectedPatientId;
  $('f-hospital-id').value = '';
  $('f-doctor-name').value = '';
  $('f-severity').value = '';
  $('f-diagnosis').value = '';
  $('f-allergies').value = '';
  $('f-notes').value = '';
  $('form-error').classList.add('hidden');
  resetMedicineRows();
  $('modal-overlay').classList.remove('hidden');
  $('f-hospital-id').focus();
}

function closeModal() {
  $('modal-overlay').classList.add('hidden');
}

function resetMedicineRows() {
  $('medicines-list').innerHTML = `
    <div class="medicine-row" data-index="0">
      <input type="text" class="form-input med-name" placeholder="Medicine name" required />
      <input type="text" class="form-input med-dosage" placeholder="Dosage (e.g. 500mg twice daily)" required />
      <button type="button" class="btn btn-icon btn-remove-med" title="Remove">✕</button>
    </div>`;
  attachRemoveListeners();
}

function addMedicineRow() {
  const list = $('medicines-list');
  const idx = list.children.length;
  const row = document.createElement('div');
  row.className = 'medicine-row';
  row.dataset.index = idx;
  row.innerHTML = `
    <input type="text" class="form-input med-name" placeholder="Medicine name" required />
    <input type="text" class="form-input med-dosage" placeholder="Dosage" required />
    <button type="button" class="btn btn-icon btn-remove-med" title="Remove">✕</button>`;
  list.appendChild(row);
  attachRemoveListeners();
  row.querySelector('.med-name').focus();
}

function attachRemoveListeners() {
  qa('.btn-remove-med').forEach(btn => {
    btn.onclick = () => {
      const rows = qa('.medicine-row');
      if (rows.length > 1) btn.closest('.medicine-row').remove();
    };
  });
}

function getMedicinesFromForm() {
  return qa('.medicine-row').map(row => ({
    name:   row.querySelector('.med-name').value.trim(),
    dosage: row.querySelector('.med-dosage').value.trim(),
  })).filter(m => m.name && m.dosage);
}

function validateForm() {
  const errors = [];
  if (!$('f-hospital-id').value) errors.push('Hospital is required.');
  if (!$('f-doctor-name').value.trim()) errors.push('Doctor name is required.');
  if (!$('f-diagnosis').value.trim()) errors.push('Diagnosis is required.');
  if (!$('f-severity').value) errors.push('Severity is required.');
  const meds = getMedicinesFromForm();
  if (!meds.length) errors.push('At least one medicine with name and dosage is required.');
  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// Visit Submission — Tool Orchestration
// ─────────────────────────────────────────────────────────────────────────────

async function submitVisit() {
  const errors = validateForm();
  if (errors.length) {
    const errEl = $('form-error');
    errEl.textContent = errors.join(' ');
    errEl.classList.remove('hidden');
    return;
  }
  $('form-error').classList.add('hidden');

  const patientId  = $('f-patient-id').value;
  const hospitalId = $('f-hospital-id').value;
  const doctorName = $('f-doctor-name').value.trim();
  const diagnosis  = $('f-diagnosis').value.trim();
  const severity   = $('f-severity').value;
  const meds       = getMedicinesFromForm();
  const allergies  = $('f-allergies').value.split(',').map(s => s.trim()).filter(Boolean);
  const notes      = $('f-notes').value.trim();

  setSubmitLoading(true);

  try {
    // ── Step 1: log_patient_visit ──────────────────────────────────
    showLoading('Step 1/4 — Logging visit…');
    let visitResult;
    if (CONFIG.USE_MCP_API) {
      visitResult = await callMCPTool('log_patient_visit', {
        patientId, hospitalId, doctorName, diagnosis,
        prescribedMedicines: meds,
        allergiesNoted: allergies,
        notes,
      });
    } else {
      visitResult = simulateLogVisit(patientId, hospitalId, doctorName, diagnosis, meds, allergies, notes);
    }

    if (visitResult.error) throw new Error(visitResult.message || visitResult.messages?.join(' '));

    toast(`Visit ${visitResult.visitId} recorded${visitResult.firstVisitAtThisHospital ? ' (first visit at this hospital)' : ''}`, 'success');
    closeModal();

    // ── Step 2: cross_hospital_safety_check ───────────────────────
    showLoading('Step 2/4 — Running cross-hospital safety check…');
    let safetyResult;
    if (CONFIG.USE_MCP_API) {
      safetyResult = await callMCPTool('cross_hospital_safety_check', {
        patientId,
        newPrescription: meds,
      });
    } else {
      safetyResult = simulateSafetyCheck(patientId, meds);
    }

    state.lastSafetyResult = safetyResult;
    showRiskBanner(safetyResult.riskLevel || 'none');
    if (safetyResult.conflicts?.length) {
      toast(`⚠ ${safetyResult.conflicts.length} conflict(s) detected — ${safetyResult.riskLevel} risk`, 'error', 5000);
    }

    // ── Step 3: medicine_availability_check (per medicine) ────────
    showLoading('Step 3/4 — Checking medicine availability…');
    const availResults = [];
    for (const med of meds) {
      let avail;
      if (CONFIG.USE_MCP_API) {
        avail = await callMCPTool('medicine_availability_check', {
          hospitalId, medicine: med.name, quantity: 1,
        });
      } else {
        avail = simulateAvailability(hospitalId, med.name);
      }
      availResults.push({ ...avail, medicine: med.name });
    }
    state.lastAvailResults = availResults;

    // ── Step 4: followup_scheduler ────────────────────────────────
    showLoading('Step 4/4 — Scheduling follow-up…');
    let fuResult;
    if (CONFIG.USE_MCP_API) {
      fuResult = await callMCPTool('followup_scheduler', { patientId, diagnosis, severity });
    } else {
      fuResult = simulateFollowup(patientId, diagnosis, severity, safetyResult.riskLevel);
    }
    state.lastFollowupResult = fuResult;

    hideLoading();
    toast('All checks complete. Timeline updated.', 'success');

    // ── Rebuild timeline with new visit at top ────────────────────
    addVisitToTimeline(
      patientId, hospitalId, doctorName, diagnosis, meds, allergies, notes,
      visitResult.visitId,
      safetyResult.conflicts || [],
      availResults,
      fuResult,
    );

  } catch (err) {
    hideLoading();
    const errEl = $('form-error');
    errEl.textContent = `Error: ${err.message}`;
    errEl.classList.remove('hidden');
    $('modal-overlay').classList.remove('hidden');
    toast(`Failed: ${err.message}`, 'error', 6000);
  } finally {
    setSubmitLoading(false);
  }
}

function addVisitToTimeline(
  patientId, hospitalId, doctorName, diagnosis,
  meds, allergies, notes, visitId,
  flags, availability, followup,
) {
  const patient = state.patientMap[patientId];

  // Add to in-memory patient store (for subsequent tool calls)
  const newVisit = {
    visitId,
    hospitalId,
    hospitalName: getHospitalName(hospitalId),
    doctorName,
    date: new Date().toISOString().slice(0, 10),
    diagnosis,
    prescribedMedicines: meds,
    testsOrdered: [],
    allergiesNoted: allergies,
    notes,
  };
  if (patient) {
    if (!patient.visits) patient.visits = [];
    patient.visits.push(newVisit);
    if (allergies.length) {
      const existing = new Set((patient.knownAllergies || []).map(a => a.toLowerCase()));
      allergies.forEach(a => {
        if (!existing.has(a.toLowerCase())) {
          patient.knownAllergies = patient.knownAllergies || [];
          patient.knownAllergies.push(a.toLowerCase());
          existing.add(a.toLowerCase());
        }
      });
      // Re-render allergy tags
      const allergyTags = $('patient-allergies');
      allergyTags.innerHTML = patient.knownAllergies
        .map(a => `<span class="allergy-tag">⚠ ${a}</span>`).join('');
      $('patient-allergies-wrap').classList.remove('hidden');
    }
  }

  // Prepend new visit card to timeline
  const timeline = $('timeline');
  const placeholder = timeline.querySelector('[data-empty]');
  if (placeholder) placeholder.remove();

  const html = renderVisitCard(newVisit, 0, { flags, availability, followup, isNew: true });
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  const card = wrapper.firstElementChild;
  timeline.prepend(card);
  attachNoteToggles(card);
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulation (no server — static JSON mode)
// ─────────────────────────────────────────────────────────────────────────────

let _visitCounters = {};

function simulateLogVisit(patientId, hospitalId, doctorName, diagnosis, meds, allergies, notes) {
  const patient = state.patientMap[patientId];
  const count = patient ? (patient.visits || []).length : 0;
  _visitCounters[patientId] = _visitCounters[patientId] || count;
  _visitCounters[patientId]++;
  const visitId = `VIS-${patientId}-${String(_visitCounters[patientId]).padStart(3, '0')}`;
  const priorHospIds = new Set((patient?.visits || []).map(v => v.hospitalId));
  return {
    visitId,
    recordedToHistory: true,
    firstVisitAtThisHospital: !priorHospIds.has(hospitalId),
  };
}

// Drug interaction reference (mirrors drug_interactions.json)
const DRUG_INTERACTIONS = [
  { pair: ['warfarin', 'aspirin'],              severity: 'high',    detail: 'Concurrent use increases risk of major bleeding events.' },
  { pair: ['metformin', 'contrast dye'],         severity: 'caution', detail: 'Metformin should be temporarily withheld before iodinated contrast.' },
  { pair: ['lisinopril', 'potassium supplements'], severity: 'caution', detail: 'ACE inhibitors increase potassium retention; concurrent supplementation may cause hyperkalemia.' },
  { pair: ['simvastatin', 'amiodarone'],          severity: 'high',    detail: 'Increased risk of rhabdomyolysis.' },
  { pair: ['ciprofloxacin', 'theophylline'],      severity: 'high',    detail: 'Ciprofloxacin inhibits CYP1A2 metabolism of theophylline.' },
  { pair: ['methotrexate', 'ibuprofen'],          severity: 'high',    detail: 'NSAIDs reduce methotrexate renal clearance.' },
  { pair: ['clopidogrel', 'omeprazole'],          severity: 'caution', detail: 'Omeprazole inhibits CYP2C19, reducing clopidogrel activation.' },
];
const ALLERGY_MAPS = {
  penicillin: { contraindicated: ['amoxicillin', 'ampicillin', 'penicillin v', 'flucloxacillin'], detail: 'Cross-reactivity within penicillin-class antibiotics.' },
  sulfa:      { contraindicated: ['sulfamethoxazole', 'sulfasalazine'], detail: 'Sulfonamide allergy contraindicates sulfa-based antibiotics.' },
  aspirin:    { contraindicated: ['aspirin', 'ibuprofen', 'naproxen', 'diclofenac'], detail: 'NSAID cross-sensitivity; avoid all NSAIDs with aspirin allergy.' },
};

// Facility stock (mirrors facility_stock.json)
const FACILITY_STOCK = {
  'HOSP-A': { name: 'City General Hospital',        stock: { warfarin: 50, aspirin: 200, metformin: 100, lisinopril: 150, amoxicillin: 80, atorvastatin: 0, ibuprofen: 120, paracetamol: 300 } },
  'HOSP-B': { name: 'Sunrise Medical Centre',       stock: { warfarin: 30, aspirin: 150, metformin: 0,   lisinopril: 0,   amoxicillin: 60, atorvastatin: 0, ibuprofen: 90,  paracetamol: 250 } },
  'HOSP-C': { name: 'Green Valley Clinic',          stock: { warfarin: 0,  aspirin: 100, metformin: 200, lisinopril: 75,  amoxicillin: 0,  atorvastatin: 0, ibuprofen: 60,  paracetamol: 180 } },
  'HOSP-D': { name: 'Lakeside Pharmacy & Hospital', stock: { warfarin: 20, aspirin: 80,  metformin: 50,  lisinopril: 40,  amoxicillin: 100,atorvastatin: 0, ibuprofen: 0,   paracetamol: 200 } },
};

function simulateSafetyCheck(patientId, newPrescription) {
  const patient = state.patientMap[patientId];
  if (!patient) return { conflicts: [], riskLevel: 'none' };

  const newMeds = newPrescription.map(m => m.name.toLowerCase().trim());
  const conflicts = [];

  // Existing meds map
  const existingMeds = {};
  (patient.visits || []).forEach(v => {
    (v.prescribedMedicines || []).forEach(m => {
      existingMeds[m.name.toLowerCase().trim()] = v;
    });
  });

  // Drug interactions
  newMeds.forEach(nm => {
    Object.keys(existingMeds).forEach(em => {
      DRUG_INTERACTIONS.forEach(di => {
        const pair = di.pair;
        if ((pair[0] === nm && pair[1] === em) || (pair[1] === nm && pair[0] === em)) {
          conflicts.push({
            type: 'drug_interaction',
            sourceHospital: existingMeds[em].hospitalName,
            sourceDate: existingMeds[em].date,
            detail: di.detail,
            _severity: di.severity,
          });
        }
      });
    });
  });

  // Allergy conflicts
  const allergySource = {};
  (patient.visits || []).forEach(v => {
    (v.allergiesNoted || []).forEach(a => {
      const al = a.toLowerCase().trim();
      if (!allergySource[al]) allergySource[al] = v;
    });
  });
  const known = (patient.knownAllergies || []).map(a => a.toLowerCase().trim());
  newMeds.forEach(nm => {
    known.forEach(al => {
      const mapping = ALLERGY_MAPS[al];
      if (mapping && mapping.contraindicated.includes(nm)) {
        const src = allergySource[al] || {};
        conflicts.push({
          type: 'allergy',
          sourceHospital: src.hospitalName || 'Unknown',
          sourceDate: src.date || 'Unknown',
          detail: mapping.detail,
          _severity: 'high',
        });
      }
    });
  });

  // Duplicate tests
  const testVisits = [];
  (patient.visits || []).forEach(v => {
    (v.testsOrdered || []).forEach(t => {
      testVisits.push({ test: t.toLowerCase(), hosp: v.hospitalName, date: v.date });
    });
  });
  const seen = new Set();
  for (let i = 0; i < testVisits.length; i++) {
    for (let j = i + 1; j < testVisits.length; j++) {
      if (testVisits[i].test !== testVisits[j].test) continue;
      if (testVisits[i].hosp === testVisits[j].hosp) continue;
      const da = new Date(testVisits[i].date), db = new Date(testVisits[j].date);
      const delta = Math.abs((db - da) / 86400000);
      if (delta <= 14) {
        const key = `${testVisits[i].test}-${testVisits[i].date}`;
        if (!seen.has(key)) {
          seen.add(key);
          const [earlier, later] = da <= db ? [testVisits[i], testVisits[j]] : [testVisits[j], testVisits[i]];
          conflicts.push({
            type: 'duplicate_test',
            sourceHospital: earlier.hosp,
            sourceDate: earlier.date,
            detail: `Test '${testVisits[i].test.replace(/\b\w/g, c => c.toUpperCase())}' also ordered at ${later.hosp} on ${later.date}, within ${Math.round(delta)} days.`,
            _severity: 'caution',
          });
        }
      }
    }
  }

  let riskLevel = 'none';
  conflicts.forEach(c => {
    if (c._severity === 'high') riskLevel = 'high';
    else if (c._severity === 'caution' && riskLevel !== 'high') riskLevel = 'caution';
  });

  const clean = conflicts.map(({ _severity, ...rest }) => rest);
  return { conflicts: clean, riskLevel };
}

const _stockState = JSON.parse(JSON.stringify(FACILITY_STOCK));

function simulateAvailability(hospitalId, medicine) {
  const med = medicine.toLowerCase().trim();
  const local = _stockState[hospitalId];
  if (!local) return { availableLocally: false, action: 'replenish_requested', rerouteFacility: null, notificationSent: true };

  const localQty = local.stock[med] ?? 0;
  if (localQty >= 1) {
    local.stock[med] = localQty - 1;
    return { availableLocally: true, action: 'dispense', rerouteFacility: null, notificationSent: false };
  }

  const others = Object.keys(_stockState).filter(h => h !== hospitalId).sort();
  for (const hid of others) {
    const qty = _stockState[hid].stock[med] ?? 0;
    if (qty >= 1) {
      return { availableLocally: false, action: 'reroute', rerouteFacility: _stockState[hid].name, notificationSent: true };
    }
  }

  return { availableLocally: false, action: 'replenish_requested', rerouteFacility: null, notificationSent: true };
}

function simulateFollowup(patientId, diagnosis, severity, sessionRisk = 'none') {
  const BASE = { mild: ['Routine', 30, false], moderate: ['Soon', 7, true], severe: ['Urgent', 3, true] };
  const ESCALATION = { Routine: ['Soon', 14], Soon: ['Urgent', 3], Urgent: ['Urgent', 3] };

  let [tier, days, notified] = BASE[severity.toLowerCase()] || BASE.mild;
  const reasonParts = [`Severity is ${severity.toLowerCase()} (${diagnosis}).`];

  const patient = state.patientMap[patientId];
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 90);
  let recurringVisit = null;
  (patient?.visits || []).forEach(v => {
    const vd = new Date(v.date);
    if (vd >= cutoff && v.diagnosis?.toLowerCase() === diagnosis.toLowerCase()) {
      if (!recurringVisit || vd > new Date(recurringVisit.date)) recurringVisit = v;
    }
  });

  let escalatedByRecurrence = false;
  if (recurringVisit) {
    const old = tier;
    [tier, days] = ESCALATION[tier];
    notified = true;
    escalatedByRecurrence = true;
    reasonParts.push(`Same diagnosis ('${diagnosis}') was recorded at ${recurringVisit.hospitalName} on ${recurringVisit.date}, within 90 days — escalated from ${old} to ${tier}.`);
  }

  if (sessionRisk === 'high') {
    const old = tier;
    [tier, days] = ESCALATION[tier];
    notified = true;
    reasonParts.push(`Cross-hospital safety check flagged HIGH risk — escalated from ${old} to ${tier}.`);
  }

  if (!escalatedByRecurrence && sessionRisk !== 'high') {
    if (severity === 'severe') reasonParts.push(`Urgent follow-up within ${days} days. Doctor notified.`);
    else if (severity === 'moderate') reasonParts.push(`Follow-up within ${days} days recommended. Doctor notified.`);
    else reasonParts.push(`Routine follow-up in ${days} days.`);
  }

  return { urgencyTier: tier, recommendedFollowupDays: days, doctorNotified: notified, reason: reasonParts.join(' ') };
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Wiring
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Load patients
  loadPatients();

  // Patient search
  $('patient-search').addEventListener('input', e => filterPatientList(e.target.value));

  // Refresh button
  $('btn-refresh-patients').addEventListener('click', loadPatients);

  // Open modal
  $('btn-new-visit').addEventListener('click', openModal);

  // Close modal
  $('btn-modal-close').addEventListener('click', closeModal);
  $('btn-cancel-visit').addEventListener('click', closeModal);
  $('modal-overlay').addEventListener('click', e => { if (e.target === $('modal-overlay')) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // Add medicine row
  $('btn-add-medicine').addEventListener('click', addMedicineRow);

  // Submit form
  $('btn-submit-visit').addEventListener('click', submitVisit);
  $('form-new-visit').addEventListener('submit', e => { e.preventDefault(); submitVisit(); });

  // Initial remove listeners
  attachRemoveListeners();
});
