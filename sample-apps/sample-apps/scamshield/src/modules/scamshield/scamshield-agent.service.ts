import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

import {
  scamShieldAnalysis
} from './scamshield-analysis.service.js';

import {
  analyseLinkLocally
} from './link-safety.engine.js';

import {
  bankVerification
} from './bank-verification.service.js';


dotenv.config();


// ============================================================
// GEMINI
//
// IMPORTANT:
//
// Gemini DOES NOT choose ScamShield tools.
//
// ScamShield code decides what security checks run.
//
// Gemini is ONLY used to explain the final evidence.
// ============================================================

const apiKey =
  process.env.GEMINI_API_KEY;


if (!apiKey) {

  throw new Error(
    'GEMINI_API_KEY is missing'
  );
}


const ai =
  new GoogleGenAI({
    apiKey
  });


// ============================================================
// TYPES
// ============================================================

interface ScamShieldEvidence {

  messageAnalysis?: unknown;

  credentialAnalysis?: unknown;

  phoneAnalysis?: unknown;

  urls: string[];

  linkAnalysis: unknown[];

  bankAnalysis?: unknown;

  checksRun: string[];
}


// ============================================================
// DETECTION
// ============================================================

function hasCredentialWords(
  message: string
): boolean {

  return /\b(otp|one[\s-]?time password|pin|upi[\s-]?pin|cvv|password|passcode|verification code|security code)\b/i
    .test(message);
}


function hasPhoneNumber(
  message: string
): boolean {

  const cleaned =
    message.replace(
      /[\s()-]/g,
      ''
    );


  return /(?:\+91|91)?[6-9]\d{9}/
    .test(cleaned);
}


function hasBankName(
  message: string
): boolean {

  return /\b(sbi|state bank of india|hdfc|icici|axis bank|kotak|canara bank|bank of baroda|union bank|indian bank|pnb|punjab national bank)\b/i
    .test(message);
}


// ============================================================
// SECURITY ENGINE
//
// NO GEMINI TOOL SELECTION.
// ============================================================

async function analyseSecurity(
  message: string
): Promise<ScamShieldEvidence> {

  const evidence:
    ScamShieldEvidence = {

      urls: [],

      linkAnalysis: [],

      checksRun: []

    };


  console.log('\n========================================');
  console.log('🛡️ SCAMSHIELD SECURITY ENGINE');
  console.log('========================================');


  // ==========================================================
  // MESSAGE ANALYSIS
  // ==========================================================

  try {

    console.log(
      '\n🧠 analyze_message_intent'
    );


    evidence.messageAnalysis =
      scamShieldAnalysis
        .analyzeMessageIntent(
          message
        );


    evidence.checksRun.push(
      'analyze_message_intent'
    );


    console.log(
      '✅ Message analysis completed'
    );

  } catch (error) {

    console.error(
      '❌ Message analysis failed:',
      error
    );
  }


  // ==========================================================
  // OTP / CREDENTIAL CHECK
  // ==========================================================

  if (
    hasCredentialWords(
      message
    )
  ) {

    try {

      console.log(
        '\n🔐 otp_share_guard'
      );


      evidence.credentialAnalysis =
        scamShieldAnalysis
          .otpShareGuard(
            message
          );


      evidence.checksRun.push(
        'otp_share_guard'
      );


      console.log(
        '✅ Credential guard completed'
      );

    } catch (error) {

      console.error(
        '❌ Credential guard failed:',
        error
      );
    }
  }


  // ==========================================================
  // PHONE CHECK
  // ==========================================================

  if (
    hasPhoneNumber(
      message
    )
  ) {

    try {

      console.log(
        '\n📞 phone_number_risk_check'
      );


      evidence.phoneAnalysis =
        scamShieldAnalysis
          .phoneNumberRiskCheck(
            message
          );


      evidence.checksRun.push(
        'phone_number_risk_check'
      );


      console.log(
        '✅ Phone analysis completed'
      );

    } catch (error) {

      console.error(
        '❌ Phone analysis failed:',
        error
      );
    }
  }


  // ==========================================================
  // URL EXTRACTION
  // ==========================================================

  try {

    evidence.urls =
      scamShieldAnalysis
        .extractUrls(
          message
        );


    console.log(
      '\n🔗 URLs:',
      evidence.urls
    );

  } catch (error) {

    console.error(
      '❌ URL extraction failed:',
      error
    );


    evidence.urls = [];
  }


  // ==========================================================
  // LINK CHECK
  // ==========================================================

  if (
    evidence.urls.length > 0
  ) {

    evidence.checksRun.push(
      'check_link_safety'
    );


    for (
      const url of evidence.urls
    ) {

      try {

        console.log(
          '\n🔎 Checking:',
          url
        );


        const result =
          analyseLinkLocally(
            url
          );


        evidence.linkAnalysis.push(
          result
        );


        console.log(
          '✅ Link analysis completed'
        );

      } catch (error) {

        console.error(
          '❌ Link check failed:',
          error
        );


        evidence.linkAnalysis.push({

          url,

          status:
            'CHECK_FAILED'

        });
      }
    }
  }


  // ==========================================================
  // BANK CHECK
  // ==========================================================

  if (
    hasBankName(
      message
    )
  ) {

    try {

      console.log(
        '\n🏦 verify_bank_identity'
      );


      evidence.bankAnalysis =
        bankVerification
          .verifyMessage(
            message
          );


      evidence.checksRun.push(
        'verify_bank_identity'
      );


      console.log(
        '✅ Bank verification completed'
      );

    } catch (error) {

      console.error(
        '❌ Bank verification failed:',
        error
      );
    }
  }


  console.log('\n========================================');
  console.log('📊 SECURITY EVIDENCE');
  console.log('========================================');


  console.log(
    JSON.stringify(
      evidence,
      null,
      2
    )
  );


  return evidence;
}


// ============================================================
// LOCAL FALLBACK
//
// This works even if Gemini final explanation fails.
// ============================================================

function localResponse(
  evidence: ScamShieldEvidence
): string {

  const credentialRisk =
    evidence.credentialAnalysis !== undefined;


  const linkRisk =
    evidence.urls.length > 0;


  const bankRisk =
    evidence.bankAnalysis !== undefined;


  if (
    credentialRisk &&
    linkRisk &&
    bankRisk
  ) {

    return `🛡️ ScamShield

Risk: CRITICAL

🔎 Why:
• The message contains a bank-related claim.
• It contains a link that should be verified before opening.
• It mentions or requests sensitive authentication information such as an OTP, PIN or verification code.
• This combination is strongly associated with phishing and credential theft.

💡 What you should do:
• DO NOT share the OTP, PIN, UPI PIN, CVV, password or verification code.
• DO NOT open the link.
• Open your bank's official app or website yourself.
• Contact the bank using its official customer-care number.

Verify the sender independently using an official source.`;
  }


  if (
    credentialRisk &&
    linkRisk
  ) {

    return `🛡️ ScamShield

Risk: HIGH

🔎 Why:
• The message contains a link.
• It also mentions sensitive authentication credentials.
• A link combined with an OTP or credential request can indicate phishing.

💡 What you should do:
• DO NOT share OTPs, PINs, passwords or verification codes.
• DO NOT open the link until it has been independently verified.
• Contact the organisation through its official channel.`;
  }


  if (
    credentialRisk
  ) {

    return `🛡️ ScamShield

Risk: HIGH

🔎 Why:
• The message mentions sensitive authentication information such as an OTP, PIN, password or verification code.

💡 What you should do:
• Never share an OTP, PIN, UPI PIN, CVV, password or verification code.
• Verify the request independently before taking any action.`;
  }


  if (
    linkRisk
  ) {

    return `🛡️ ScamShield

Risk: MEDIUM

🔎 Why:
• The message contains a link.
• ScamShield recommends verifying unexpected links before opening them.

💡 What you should do:
• Do not open the link if you do not trust the sender.
• Visit the organisation's official website yourself instead of using the supplied link.`;
  }


  return `🛡️ ScamShield

Risk: LOW

🔎 Why:
• No obvious high-risk OTP, credential or URL indicators were detected.

💡 What you should do:
• Remain cautious if the sender later asks for money or personal information.
• Never share OTPs, PINs, passwords or banking credentials.`;
}


// ============================================================
// GEMINI EXPLANATION
//
// GEMINI DOES NOT CHOOSE TOOLS.
// ============================================================

async function explainEvidence(
  message: string,
  evidence: ScamShieldEvidence
): Promise<string> {

  const response =
    await ai.models.generateContent({

      model:
        'gemini-3.6-flash',

      contents: `
You are ScamShield.

ScamShield's security code has already analysed
the message.

You are NOT allowed to choose tools.

You are NOT allowed to perform new security checks.

Your only task is to explain the evidence supplied
below in simple language.

USER MESSAGE:

${message}


SECURITY EVIDENCE:

${JSON.stringify(
  evidence,
  null,
  2
)}


Choose exactly one risk level:

LOW
MEDIUM
HIGH
CRITICAL


IMPORTANT RULES:

If credentialAnalysis exists, warn the user never
to share OTPs, PINs, UPI PINs, CVVs, passwords,
passcodes or verification codes.

If URLs exist, explain the available link evidence.

If bankAnalysis exists, explain the available
bank-verification evidence.

Do not invent VirusTotal results.

Do not invent Google Safe Browsing results.

Do not invent domain-registration information.

Do not claim a sender is genuine unless the
evidence proves it.

Return only:

🛡️ ScamShield

Risk: [LEVEL]

🔎 Why:
• reason
• reason

💡 What you should do:
• precaution
• precaution

Keep the response concise and suitable for WhatsApp.

Do not mention Gemini, MCP, NitroStack, JSON,
functions or internal implementation.
      `
    });


  const text =
    response.text?.trim();


  if (!text) {

    throw new Error(
      'Empty final AI response'
    );
  }


  return text;
}


// ============================================================
// MAIN FUNCTION
// ============================================================

export async function askScamShieldAI(
  message: string
): Promise<string> {

  const cleanMessage =
    String(
      message || ''
    ).trim();


  if (!cleanMessage) {

    return `🛡️ ScamShield

Please send the suspicious message you want me to analyse.`;
  }


  console.log('\n========================================');
  console.log('🛡️ SCAMSHIELD START');
  console.log('========================================');

  console.log(
    'Message:',
    cleanMessage
  );


  // ==========================================================
  // STEP 1
  // SCAMSHIELD CODE RUNS CHECKS
  // ==========================================================

  const evidence =
    await analyseSecurity(
      cleanMessage
    );


  // ==========================================================
  // STEP 2
  // GEMINI ONLY EXPLAINS
  // ==========================================================

  try {

    console.log(
      '\n🤖 Generating final explanation...'
    );


    const result =
      await explainEvidence(
        cleanMessage,
        evidence
      );


    console.log(
      '\n✅ Explanation generated'
    );


    return result;


  } catch (error) {

    // ========================================================
    // IMPORTANT
    //
    // If Gemini fails, ScamShield DOES NOT fail.
    //
    // It uses deterministic local security results.
    // ========================================================

    console.error(
      '\n⚠️ Final explanation failed:'
    );

    console.error(
      error
    );


    console.log(
      '🛡️ Using local ScamShield response'
    );


    return localResponse(
      evidence
    );
  }
}