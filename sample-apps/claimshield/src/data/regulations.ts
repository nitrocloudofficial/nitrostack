export default {
  "LATE_FILING": {
    "title": "Late Filing of Claim",
    "regulation": "IRDA (Protection of Policyholders Interests) Regulations 2017, Clause 9(1)",
    "description": "Claims must be filed within the stipulated time from date of incident",
    "riskPoints": 40,
    "severity": "CRITICAL",
    "fixable": true,
    "fix": "File a written condonation of delay application to your insurer explaining the reason for delay. Attach supporting evidence."
  },
  "MISSING_FIR": {
    "title": "Missing FIR for Injury Claim",
    "regulation": "Motor Vehicles Act 1988, Section 134",
    "description": "FIR is mandatory for all motor accident claims involving injury or death",
    "riskPoints": 35,
    "severity": "CRITICAL",
    "fixable": true,
    "fix": "File FIR immediately at the nearest police station. Carry: driving licence, RC book, insurance policy copy."
  },
  "POLICY_LAPSED": {
    "title": "Policy Lapsed Before Incident",
    "regulation": "Insurance Act 1938, Section 64VB",
    "description": "No claim is payable if the policy was not active on the date of the incident",
    "riskPoints": 100,
    "severity": "FATAL",
    "fixable": false,
    "fix": "Claim is not viable. If insurer disputes unfairly, file a complaint at IRDA Bima Bharosa portal: https://bimabharosa.irdai.gov.in"
  },
  "MISSING_SURVEYOR": {
    "title": "No Surveyor Appointed for High-Value Claim",
    "regulation": "IRDA (Surveyors and Loss Assessors) Regulations 2015, Regulation 9",
    "description": "Claims above Rs 75,000 require an independent licensed surveyor",
    "riskPoints": 25,
    "severity": "HIGH",
    "fixable": true,
    "fix": "Request your insurer to appoint a licensed surveyor immediately. This is their obligation under IRDA rules."
  },
  "MISSING_DRIVING_LICENCE": {
    "title": "Driving Licence Not Available",
    "regulation": "Motor Vehicles Act 1988, Section 3",
    "description": "Valid driving licence at time of accident is mandatory for motor claims",
    "riskPoints": 30,
    "severity": "CRITICAL",
    "fixable": true,
    "fix": "Obtain a certified copy of your licence from the RTO. Apply at Parivahan portal: https://parivahan.gov.in"
  },
  "NO_CASHLESS_PREAUTH": {
    "title": "Pre-authorization Not Obtained for Cashless Treatment",
    "regulation": "IRDA (Health Insurance) Regulations 2016, Clause 17",
    "description": "Cashless health claims require pre-authorization from insurer before treatment",
    "riskPoints": 45,
    "severity": "CRITICAL",
    "fixable": true,
    "fix": "Contact your insurer's 24-hour helpline immediately for emergency pre-authorization. For planned treatment, apply 72 hours in advance."
  }
}
;