// src/modules/scamshield/scamshield-analysis.service.ts

export interface MessageIntentResult {
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_score: number;
  scam_type: string;
  detected_tactics: string[];
  safe_action: string;
  explanation: string;
}

export interface OtpGuardResult {
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  credential_request_detected: boolean;
  credentials_detected: string[];
  detected_tactics: string[];
  safe_action: string;
  explanation: string;
}

export interface PhoneRiskResult {
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_score: number;
  phone_number_detected: boolean;
  phone_numbers: string[];
  detected_tactics: string[];
  safe_action: string;
  explanation: string;
}


/**
 * Shared ScamShield analysis logic.
 *
 * This service can be used by:
 *
 * - Gemini ScamShield Agent
 * - NitroStack MCP tools
 * - Twilio WhatsApp
 * - Twilio SMS
 */
export class ScamShieldAnalysisService {

  // ============================================================
  // MESSAGE INTENT ANALYSIS
  // ============================================================

  analyzeMessageIntent(
    originalMessage: string
  ): MessageIntentResult {

    const message =
      String(originalMessage || '').toLowerCase();

    const tactics: string[] = [];

    let score = 0;


    // Urgency
    if (
      /urgent|immediately|today|now|right now|act now|hurry|within \d+|expires/i.test(
        message
      )
    ) {
      tactics.push('Urgency / time pressure');
      score += 15;
    }


    // Threat / fear
    if (
      /blocked|suspended|closed|deactivated|freeze|frozen|legal action|police|arrest|restricted/i.test(
        message
      )
    ) {
      tactics.push('Threat / fear pressure');
      score += 20;
    }


    // Prize / lottery
    if (
      /congratulations|winner|won|prize|lottery|reward|gift/i.test(
        message
      )
    ) {
      tactics.push('Prize / reward lure');
      score += 25;
    }


    // Advance fee
    if (
      /processing fee|registration fee|release fee|advance fee|pay.*fee/i.test(
        message
      )
    ) {
      tactics.push('Advance-fee request');
      score += 30;
    }


    // Refund
    if (
      /refund|cashback|reimbursement/i.test(
        message
      )
    ) {
      tactics.push('Refund / cashback lure');
      score += 15;
    }


    // Payment
    if (
      /pay|payment|send money|transfer money|upi|gpay|google pay|phonepe|paytm/i.test(
        message
      )
    ) {
      tactics.push('Payment request');
      score += 20;
    }


    // Credentials
    if (
      /\botp\b|verification code|security code|upi pin|\bpin\b|cvv|password|passcode/i.test(
        message
      )
    ) {
      tactics.push('Sensitive credential request');
      score += 40;
    }


    // Authority impersonation
    if (
      /bank|sbi|hdfc|icici|axis bank|rbi|police|government|income tax|customer care|support team/i.test(
        message
      )
    ) {
      tactics.push(
        'Authority / organisation impersonation'
      );

      score += 15;
    }


    // Secrecy
    if (
      /don't tell|do not tell|secret|confidential|keep this private/i.test(
        message
      )
    ) {
      tactics.push('Isolation / secrecy pressure');
      score += 20;
    }


    // URL
    if (
      /https?:\/\/|www\.|bit\.ly|tinyurl/i.test(
        message
      )
    ) {
      tactics.push('External link');
      score += 10;
    }


    score = Math.min(score, 100);


    // ----------------------------------------------------------
    // Risk
    // ----------------------------------------------------------

    let riskLevel:
      'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
      = 'LOW';


    if (score >= 70) {
      riskLevel = 'CRITICAL';
    } else if (score >= 45) {
      riskLevel = 'HIGH';
    } else if (score >= 20) {
      riskLevel = 'MEDIUM';
    }


    // ----------------------------------------------------------
    // Scam type
    // ----------------------------------------------------------

    let scamType =
      'No clear scam category';


    if (
      tactics.includes('Prize / reward lure') &&
      tactics.includes('Advance-fee request')
    ) {

      scamType =
        'Prize / advance-fee scam';

    } else if (
      tactics.includes('Sensitive credential request')
    ) {

      scamType =
        'Credential theft / phishing';

    } else if (
      tactics.includes('Refund / cashback lure')
    ) {

      scamType =
        'Refund scam';

    } else if (
      tactics.includes(
        'Authority / organisation impersonation'
      ) &&
      tactics.includes('Threat / fear pressure')
    ) {

      scamType =
        'Impersonation / threat scam';

    } else if (
      tactics.includes('Payment request')
    ) {

      scamType =
        'Suspicious payment request';
    }


    // ----------------------------------------------------------
    // Safe action
    // ----------------------------------------------------------

    let safeAction =
      'VERIFY_BEFORE_ACTION';


    if (
      tactics.includes('Sensitive credential request')
    ) {

      safeAction =
        'DO_NOT_SHARE';

    } else if (
      tactics.includes('Payment request') ||
      tactics.includes('Advance-fee request')
    ) {

      safeAction =
        'DO_NOT_PAY';

    } else if (
      riskLevel === 'HIGH' ||
      riskLevel === 'CRITICAL'
    ) {

      safeAction =
        'STOP_AND_VERIFY';
    }


    // ----------------------------------------------------------
    // Explanation
    // ----------------------------------------------------------

    let explanation =
      'No strong scam manipulation pattern was detected. Verify the sender before taking action.';


    if (riskLevel === 'CRITICAL') {

      explanation =
        'This message contains multiple strong scam indicators. Do not send money, reveal credentials, click suspicious links or follow instructions until the sender has been independently verified.';

    } else if (riskLevel === 'HIGH') {

      explanation =
        'This message contains several scam warning signs. Stop and independently verify the request using an official channel.';

    } else if (riskLevel === 'MEDIUM') {

      explanation =
        'This message contains a suspicious pattern. Verify the sender and request before taking action.';
    }


    return {
      risk_level: riskLevel,
      risk_score: score,
      scam_type: scamType,
      detected_tactics: tactics,
      safe_action: safeAction,
      explanation
    };
  }


  // ============================================================
  // OTP / CREDENTIAL GUARD
  // ============================================================

  otpShareGuard(
    originalMessage: string
  ): OtpGuardResult {

    const message =
      String(originalMessage || '').toLowerCase();

    const credentials: string[] = [];
    const tactics: string[] = [];


    if (
      /\botp\b|one[- ]time password|verification code|security code/i.test(
        message
      )
    ) {
      credentials.push(
        'OTP / verification code'
      );
    }


    if (
      /\bupi pin\b|\bpin\b/i.test(message)
    ) {
      credentials.push('PIN');
    }


    if (
      /\bcvv\b|\bcvc\b/i.test(message)
    ) {
      credentials.push('CVV');
    }


    if (
      /\bpassword\b|\bpasscode\b/i.test(message)
    ) {
      credentials.push('Password');
    }


    if (
      /urgent|immediately|today|right now|act now|within \d+|expires/i.test(
        message
      )
    ) {
      tactics.push(
        'Urgency / time pressure'
      );
    }


    if (
      /blocked|suspended|closed|deactivated|freeze|frozen|restricted/i.test(
        message
      )
    ) {
      tactics.push(
        'Threat of account restriction'
      );
    }


    if (
      /bank|sbi|hdfc|icici|axis bank|rbi|customer care|support team/i.test(
        message
      )
    ) {
      tactics.push(
        'Possible financial-authority impersonation'
      );
    }


    if (
      /refund|cashback|prize|lottery|winner|reward/i.test(
        message
      )
    ) {
      tactics.push(
        'Financial incentive'
      );
    }


    if (
      /don't tell|do not tell|secret|confidential|keep this private/i.test(
        message
      )
    ) {
      tactics.push(
        'Isolation / secrecy pressure'
      );
    }


    const credentialRequested =
      credentials.length > 0;


    let riskLevel:
      'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
      = 'LOW';


    if (credentialRequested) {

      riskLevel = 'CRITICAL';

    } else if (tactics.length >= 2) {

      riskLevel = 'HIGH';

    } else if (tactics.length === 1) {

      riskLevel = 'MEDIUM';
    }


    return {

      risk_level:
        riskLevel,

      credential_request_detected:
        credentialRequested,

      credentials_detected:
        credentials,

      detected_tactics:
        tactics,

      safe_action:
        credentialRequested
          ? 'DO_NOT_SHARE'
          : 'VERIFY_BEFORE_ACTION',

      explanation:
        credentialRequested
          ? 'Never reveal OTPs, PINs, CVVs, passwords or verification codes. Independently contact the organisation using an official channel.'
          : 'No explicit authentication credential request was detected.'
    };
  }


  // ============================================================
  // PHONE NUMBER ANALYSIS
  // ============================================================

  phoneNumberRiskCheck(
    originalMessage: string
  ): PhoneRiskResult {

    const message =
      String(originalMessage || '');

    const lower =
      message.toLowerCase();

    const tactics: string[] = [];

    let score = 0;


    const phonePattern =
      /(?:\+91[\s-]?)?[6-9]\d{9}\b/g;


    const matches =
      message.match(phonePattern);


    const phoneNumbers =
      matches
        ? [...new Set(matches)]
        : [];


    const phoneDetected =
      phoneNumbers.length > 0;


    if (phoneDetected) {
      score += 10;
    }


    if (
      /bank|sbi|hdfc|icici|axis bank|rbi|customer care|support team|police|government/i.test(
        lower
      )
    ) {

      tactics.push(
        'Possible bank / authority impersonation'
      );

      score += 20;
    }


    if (
      /urgent|immediately|today|now|right now|act now|within \d+|expires/i.test(
        lower
      )
    ) {

      tactics.push(
        'Urgency / time pressure'
      );

      score += 15;
    }


    if (
      /blocked|suspended|closed|deactivated|freeze|frozen|restricted/i.test(
        lower
      )
    ) {

      tactics.push(
        'Threat of account restriction'
      );

      score += 20;
    }


    if (
      /pay|payment|send money|transfer|upi|gpay|google pay|phonepe|paytm/i.test(
        lower
      )
    ) {

      tactics.push(
        'Payment request'
      );

      score += 20;
    }


    if (
      /\botp\b|verification code|security code|upi pin|\bpin\b|cvv|password|passcode/i.test(
        lower
      )
    ) {

      tactics.push(
        'Sensitive credential request'
      );

      score += 40;
    }


    if (
      /call|contact|phone|whatsapp|message this number|call this number/i.test(
        lower
      )
    ) {

      tactics.push(
        'Request to contact provided number'
      );

      score += 10;
    }


    score =
      Math.min(score, 100);


    let riskLevel:
      'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
      = 'LOW';


    if (score >= 70) {

      riskLevel = 'CRITICAL';

    } else if (score >= 45) {

      riskLevel = 'HIGH';

    } else if (score >= 20) {

      riskLevel = 'MEDIUM';
    }


    let safeAction =
      'VERIFY_NUMBER_INDEPENDENTLY';


    if (
      tactics.includes(
        'Sensitive credential request'
      )
    ) {

      safeAction =
        'DO_NOT_CALL_OR_SHARE_INFORMATION';

    } else if (
      tactics.includes(
        'Payment request'
      )
    ) {

      safeAction =
        'DO_NOT_SEND_MONEY';

    } else if (
      riskLevel === 'CRITICAL' ||
      riskLevel === 'HIGH'
    ) {

      safeAction =
        'DO_NOT_CONTACT_NUMBER';
    }


    return {

      risk_level:
        riskLevel,

      risk_score:
        score,

      phone_number_detected:
        phoneDetected,

      phone_numbers:
        phoneNumbers,

      detected_tactics:
        tactics,

      safe_action:
        safeAction,

      explanation:
        riskLevel === 'CRITICAL'
          ? 'Strong scam indicators were detected. Do not call the provided number, send money or reveal sensitive information.'
          : riskLevel === 'HIGH'
            ? 'Several scam indicators were detected. Verify the phone number through an official source.'
            : riskLevel === 'MEDIUM'
              ? 'Suspicious indicators were detected. Verify the number independently.'
              : 'No strong phone-number scam indicators were detected.'
    };
  }


  // ============================================================
  // EXTRACT URLS
  // ============================================================

  extractUrls(
    message: string
  ): string[] {

    const matches =
      String(message || '').match(
        /https?:\/\/[^\s<>"']+/gi
      );

    return matches
      ? [...new Set(matches)]
      : [];
  }


  // ============================================================
  // EXTRACT PHONE NUMBERS
  // ============================================================

  extractPhoneNumbers(
    message: string
  ): string[] {

    const matches =
      String(message || '').match(
        /(?:\+91[\s-]?)?[6-9]\d{9}\b/g
      );

    return matches
      ? [...new Set(matches)]
      : [];
  }
}


// Shared instance
export const scamShieldAnalysis =
  new ScamShieldAnalysisService();