import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Helper to generate variations
function generateVariations(baseItem, count, modifierFn) {
  const variations = [];
  for (let i = 0; i < count; i++) {
    // Deep clone
    const cloned = JSON.parse(JSON.stringify(baseItem));
    variations.push(modifierFn(cloned, i));
  }
  return variations;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomPhone() {
  return `+91-${randomInt(9000000000, 9999999999)}`;
}

// 1. Telecom Critical
const telecomCriticalBase = {
  "call_id": "TEL-9948-AX",
  "target_phone": "+91-9876543210",
  "incoming_caller_id": "+91-11-24368305",
  "claimed_identity": "CBI Anti-Corruption Branch, New Delhi",
  "stir_shaken_verified": false,
  "stir_shaken_attestation": "B",
  "true_origin": "VoIP_Node_Cambodia",
  "origin_ip": "103.82.241.17",
  "origin_geo": {
    "country": "KH",
    "city": "Phnom Penh",
    "isp": "Ezecom Limited",
    "asn": "AS38623"
  },
  "call_duration_minutes": 142,
  "voice_biometrics_flag": "AI_SYNTHESIS_PROBABLE",
  "deepfake_analysis": {
    "ai_synthesis_probability": 0.97,
    "model_version": "VoiceShield-v3",
    "confidence_band": "HIGH",
    "spectral_anomalies": [
      "MISSING_MICRO_TREMOR",
      "UNIFORM_PITCH_VARIANCE",
      "SYNTHETIC_FORMANT_PATTERN",
      "F0_CONTOUR_FLATLINE"
    ],
    "verdict": "AI_GENERATED_VOICE_CONFIRMED"
  },
  "call_metadata": {
    "codec": "G.711_ALAW",
    "jitter_ms": 82,
    "packet_loss_pct": 4.2,
    "srtp_enabled": false,
    "sip_user_agent": "Opal-VoIP/2.1.4"
  },
  "threat_keywords_detected": [
    "arrest_warrant",
    "aadhaar_compromised",
    "money_laundering",
    "supreme_court_order",
    "do_not_tell_anyone"
  ]
};

const telecomCritical = generateVariations(telecomCriticalBase, 30, (item, i) => {
  item.call_id = `TEL-99${48 + i}-AX`;
  item.target_phone = randomPhone();
  item.call_duration_minutes = randomInt(65, 240);
  item.deepfake_analysis.ai_synthesis_probability = randomFloat(0.85, 0.99);
  return item;
});

// 2. Telecom Safe
const telecomSafeBase = {
  "call_id": "TEL-2201-BK",
  "target_phone": "+91-9988776655",
  "incoming_caller_id": "+91-22-66521000",
  "claimed_identity": "HDFC Bank Customer Service, Mumbai",
  "stir_shaken_verified": true,
  "stir_shaken_attestation": "A",
  "true_origin": "PSTN_HDFC_Mumbai_PBX",
  "origin_ip": null,
  "origin_geo": {
    "country": "IN",
    "city": "Mumbai",
    "isp": "HDFC Bank Ltd - Private Network",
    "asn": "AS55410"
  },
  "call_duration_minutes": 8,
  "voice_biometrics_flag": "HUMAN_CONFIRMED",
  "deepfake_analysis": {
    "ai_synthesis_probability": 0.03,
    "model_version": "VoiceShield-v3",
    "confidence_band": "LOW",
    "spectral_anomalies": [],
    "verdict": "HUMAN_VOICE_CONFIRMED"
  },
  "call_metadata": {
    "codec": "G.711_ULAW",
    "jitter_ms": 12,
    "packet_loss_pct": 0.1,
    "srtp_enabled": true,
    "sip_user_agent": "Avaya-OneX/7.2.3"
  },
  "threat_keywords_detected": []
};

const telecomSafe = generateVariations(telecomSafeBase, 30, (item, i) => {
  item.call_id = `TEL-22${10 + i}-BK`;
  item.target_phone = randomPhone();
  item.call_duration_minutes = randomInt(2, 15);
  item.deepfake_analysis.ai_synthesis_probability = randomFloat(0.01, 0.08);
  return item;
});

// 3. Telecom Medium
const telecomMediumBase = {
  "call_id": "TEL-5574-GW",
  "target_phone": "+91-9123456789",
  "incoming_caller_id": "+91-11-23747256",
  "claimed_identity": "SBI Card Services, Delhi",
  "stir_shaken_verified": false,
  "stir_shaken_attestation": "C",
  "true_origin": "VoIP_Gateway_Domestic",
  "origin_ip": "49.36.128.91",
  "origin_geo": {
    "country": "IN",
    "city": "Noida",
    "isp": "Reliance Jio Infocomm",
    "asn": "AS55836"
  },
  "call_duration_minutes": 48,
  "voice_biometrics_flag": "INCONCLUSIVE",
  "deepfake_analysis": {
    "ai_synthesis_probability": 0.52,
    "model_version": "VoiceShield-v3",
    "confidence_band": "INCONCLUSIVE",
    "spectral_anomalies": [
      "SLIGHT_PITCH_REGULARITY",
      "MINOR_FORMANT_SHIFT"
    ],
    "verdict": "INCONCLUSIVE_REQUIRES_MANUAL_REVIEW"
  },
  "call_metadata": {
    "codec": "OPUS",
    "jitter_ms": 45,
    "packet_loss_pct": 1.8,
    "srtp_enabled": true,
    "sip_user_agent": "FreeSWITCH/1.10.7"
  },
  "threat_keywords_detected": [
    "credit_card_block",
    "verify_identity"
  ]
};

const telecomMedium = generateVariations(telecomMediumBase, 30, (item, i) => {
  item.call_id = `TEL-55${74 + i}-GW`;
  item.target_phone = randomPhone();
  item.call_duration_minutes = randomInt(20, 55);
  item.deepfake_analysis.ai_synthesis_probability = randomFloat(0.35, 0.65);
  return item;
});

// 4. Bank Critical
const bankCriticalBase = {
  "transaction_id": "TXN-883-UPI",
  "source_account": {
    "account_id": "ACC-7891-ICICI",
    "account_holder": "REDACTED_VICTIM",
    "bank": "ICICI Bank",
    "branch": "Koramangala, Bengaluru",
    "account_age_days": 2847,
    "kyc_status": "FULL_KYC"
  },
  "destination_account": "ACC-4492-HDFC",
  "destination_details": {
    "bank": "HDFC Bank",
    "branch": "Tilak Nagar, New Delhi",
    "account_age_days": 3,
    "kyc_status": "MINIMUM_EKYC",
    "pan_verified": false,
    "beneficiary_name": "M/S GLOBAL TRADE SOLUTIONS",
    "account_type": "CURRENT",
    "ifsc": "HDFC0001234"
  },
  "velocity_last_24h": {
    "inbound_transfers": 14,
    "outbound_transfers": 14,
    "unique_senders": 12,
    "unique_receivers": 3,
    "current_balance": 0,
    "total_inbound_value": 4250000,
    "total_outbound_value": 4250000
  },
  "attempted_transfer_amount": 500000,
  "transfer_method": "UPI",
  "upi_vpa": "globaltrade@ybl",
  "rbi_flagged_cluster": true,
  "rbi_cluster_id": "RBI-CLU-2026-4492",
  "velocity_score": 0.96,
  "geographic_mismatch": {
    "source_state": "Karnataka",
    "dest_state": "Delhi",
    "ip_login_state": "Haryana",
    "mismatch_severity": "HIGH"
  },
  "device_fingerprint": {
    "device_id": "DEV-ANON-449X",
    "os": "Android 11",
    "app_version": "PhonePe 24.1.0",
    "root_detected": true,
    "vpn_active": true
  }
};

const bankCritical = generateVariations(bankCriticalBase, 30, (item, i) => {
  item.transaction_id = `TXN-${883 + i}-UPI`;
  item.attempted_transfer_amount = randomInt(200000, 900000);
  item.velocity_score = randomFloat(0.85, 0.99);
  return item;
});

// 5. Bank Safe
const bankSafeBase = {
  "transaction_id": "TXN-114-NEFT",
  "source_account": {
    "account_id": "ACC-3301-SBI",
    "account_holder": "REDACTED_SENDER",
    "bank": "State Bank of India",
    "branch": "MG Road, Bengaluru",
    "account_age_days": 3104,
    "kyc_status": "FULL_KYC"
  },
  "destination_account": "ACC-8821-ICICI",
  "destination_details": {
    "bank": "ICICI Bank",
    "branch": "Indiranagar, Bengaluru",
    "account_age_days": 2555,
    "kyc_status": "FULL_KYC",
    "pan_verified": true,
    "beneficiary_name": "RAJESH KUMAR SHARMA",
    "account_type": "SAVINGS",
    "ifsc": "ICIC0001234"
  },
  "velocity_last_24h": {
    "inbound_transfers": 2,
    "outbound_transfers": 1,
    "unique_senders": 1,
    "unique_receivers": 1,
    "current_balance": 185000,
    "total_inbound_value": 35000,
    "total_outbound_value": 12000
  },
  "attempted_transfer_amount": 25000,
  "transfer_method": "NEFT",
  "upi_vpa": null,
  "rbi_flagged_cluster": false,
  "rbi_cluster_id": null,
  "velocity_score": 0.08,
  "geographic_mismatch": {
    "source_state": "Karnataka",
    "dest_state": "Karnataka",
    "ip_login_state": "Karnataka",
    "mismatch_severity": "NONE"
  },
  "device_fingerprint": {
    "device_id": "DEV-IPH-8821K",
    "os": "iOS 18.2",
    "app_version": "iMobile Pay 5.4.0",
    "root_detected": false,
    "vpn_active": false
  }
};

const bankSafe = generateVariations(bankSafeBase, 30, (item, i) => {
  item.transaction_id = `TXN-${114 + i}-NEFT`;
  item.attempted_transfer_amount = randomInt(5000, 50000);
  item.velocity_score = randomFloat(0.01, 0.15);
  return item;
});

// 6. Bank Medium
const bankMediumBase = {
  "transaction_id": "TXN-667-IMPS",
  "source_account": {
    "account_id": "ACC-5512-PNB",
    "account_holder": "REDACTED_SENDER",
    "bank": "Punjab National Bank",
    "branch": "Connaught Place, Delhi",
    "account_age_days": 1890,
    "kyc_status": "FULL_KYC"
  },
  "destination_account": "ACC-9938-AXIS",
  "destination_details": {
    "bank": "Axis Bank",
    "branch": "Rajouri Garden, Delhi",
    "account_age_days": 18,
    "kyc_status": "PARTIAL_KYC",
    "pan_verified": true,
    "beneficiary_name": "PRIYA ELECTRONICS PVT LTD",
    "account_type": "CURRENT",
    "ifsc": "UTIB0002345"
  },
  "velocity_last_24h": {
    "inbound_transfers": 9,
    "outbound_transfers": 8,
    "unique_senders": 5,
    "unique_receivers": 4,
    "current_balance": 12000,
    "total_inbound_value": 420000,
    "total_outbound_value": 408000
  },
  "attempted_transfer_amount": 175000,
  "transfer_method": "IMPS",
  "upi_vpa": "priyaelec@axisbank",
  "rbi_flagged_cluster": false,
  "rbi_cluster_id": null,
  "velocity_score": 0.62,
  "geographic_mismatch": {
    "source_state": "Delhi",
    "dest_state": "Delhi",
    "ip_login_state": "Uttar Pradesh",
    "mismatch_severity": "LOW"
  },
  "device_fingerprint": {
    "device_id": "DEV-AND-9938P",
    "os": "Android 14",
    "app_version": "Axis Mobile 9.2.1",
    "root_detected": false,
    "vpn_active": false
  }
};

const bankMedium = generateVariations(bankMediumBase, 30, (item, i) => {
  item.transaction_id = `TXN-${667 + i}-IMPS`;
  item.attempted_transfer_amount = randomInt(50000, 250000);
  item.velocity_score = randomFloat(0.40, 0.70);
  return item;
});

// Write files
fs.writeFileSync(path.join(ROOT, 'mocks', 'telecom_event.json'), JSON.stringify(telecomCritical, null, 2));
fs.writeFileSync(path.join(ROOT, 'mocks', 'telecom_event_safe.json'), JSON.stringify(telecomSafe, null, 2));
fs.writeFileSync(path.join(ROOT, 'mocks', 'telecom_event_medium.json'), JSON.stringify(telecomMedium, null, 2));
fs.writeFileSync(path.join(ROOT, 'mocks', 'bank_event.json'), JSON.stringify(bankCritical, null, 2));
fs.writeFileSync(path.join(ROOT, 'mocks', 'bank_event_safe.json'), JSON.stringify(bankSafe, null, 2));
fs.writeFileSync(path.join(ROOT, 'mocks', 'bank_event_medium.json'), JSON.stringify(bankMedium, null, 2));

console.log('Successfully generated 30 instances for each of the 6 mock files.');
