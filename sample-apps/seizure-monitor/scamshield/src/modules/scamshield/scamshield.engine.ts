export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ScamAnalysis {
  risk_level: RiskLevel;
  risk_score: number;
  scam_type: string;
  credentials_detected: string[];
  detected_tactics: string[];
  urls_detected: string[];
  safe_action: string;
  explanation: string;
}

export function analyseScamMessage(text: string): ScamAnalysis {

  const message = String(text || '');
  const lower = message.toLowerCase();

  let score = 0;

  const credentials: string[] = [];
  const tactics: string[] = [];

  // ============================================================
  // CREDENTIAL DETECTION
  // ============================================================

  if (
    /\botp\b|one[- ]time password|verification code|security code/i.test(
      lower
    )
  ) {
    credentials.push('OTP / verification code');
    tactics.push('Sensitive credential request');

    score += 50;
  }

  if (
    /\bupi pin\b|\bpin\b/i.test(lower)
  ) {
    credentials.push('UPI PIN / PIN');

    if (!tactics.includes('Sensitive credential request')) {
      tactics.push('Sensitive credential request');
    }

    score += 50;
  }

  if (
    /\bcvv\b|\bcvc\b/i.test(lower)
  ) {
    credentials.push('CVV');

    if (!tactics.includes('Sensitive credential request')) {
      tactics.push('Sensitive credential request');
    }

    score += 50;
  }

  if (
    /\bpassword\b|\bpasscode\b/i.test(lower)
  ) {
    credentials.push('Password');

    if (!tactics.includes('Sensitive credential request')) {
      tactics.push('Sensitive credential request');
    }

    score += 50;
  }


  // ============================================================
  // URGENCY
  // ============================================================

  if (
    /urgent|urgently|immediately|today|right now|act now|hurry|within \d+|expires/i.test(
      lower
    )
  ) {
    tactics.push('Urgency / time pressure');

    score += 15;
  }


  // ============================================================
  // ACCOUNT / LEGAL THREATS
  // ============================================================

  if (
    /blocked|suspended|closed|deactivated|freeze|frozen|restricted|legal action|arrest/i.test(
      lower
    )
  ) {
    tactics.push('Threat / fear pressure');

    score += 20;
  }


  // ============================================================
  // BANK / AUTHORITY IMPERSONATION
  // ============================================================

  if (
    /\bbank\b|\bsbi\b|\bhdfc\b|\bicici\b|axis bank|\brbi\b|customer care|support team|police|government|income tax/i.test(
      lower
    )
  ) {
    tactics.push('Possible trusted-organisation impersonation');

    score += 15;
  }


  // ============================================================
  // PRIZE / LOTTERY
  // ============================================================

  if (
    /congratulations|winner|won|lottery|prize|reward|lucky draw/i.test(
      lower
    )
  ) {
    tactics.push('Unexpected prize / reward');

    score += 25;
  }


  // ============================================================
  // ADVANCE FEE
  // ============================================================

  if (
    /processing fee|registration fee|release fee|advance fee|pay.*fee/i.test(
      lower
    )
  ) {
    tactics.push('Advance payment request');

    score += 30;
  }


  // ============================================================
  // REFUND / CASHBACK
  // ============================================================

  if (
    /refund|cashback|reimbursement|money back/i.test(
      lower
    )
  ) {
    tactics.push('Refund / cashback lure');

    score += 15;
  }


  // ============================================================
  // MONEY TRANSFER
  // ============================================================

  if (
    /send money|transfer money|make payment|pay now|upi payment|gpay|google pay|phonepe|paytm/i.test(
      lower
    )
  ) {
    tactics.push('Money transfer request');

    score += 25;
  }


  // ============================================================
  // SECRECY
  // ============================================================

  if (
    /don't tell|do not tell|keep this secret|confidential|keep this private/i.test(
      lower
    )
  ) {
    tactics.push('Isolation / secrecy pressure');

    score += 20;
  }


  // ============================================================
  // URL EXTRACTION
  // ============================================================

  const urlRegex =
    /https?:\/\/[^\s<>"']+/gi;

  const urlMatches =
    message.match(urlRegex) || [];

  const urls =
    [...new Set(urlMatches)];

  if (urls.length > 0) {

    tactics.push('External link included');

    score += 10;
  }


  // ============================================================
  // LINK PRESSURE
  // ============================================================

  if (
    /click.*link|open.*link|tap.*link|visit.*link/i.test(
      lower
    )
  ) {
    tactics.push('Request to open a link');

    score += 15;
  }


  // ============================================================
  // PHONE / CALL PRESSURE
  // ============================================================

  if (
    /call immediately|call now|contact this number|call this number/i.test(
      lower
    )
  ) {
    tactics.push('Request to contact provided number');

    score += 10;
  }


  // Maximum 100
  score = Math.min(score, 100);


  // ============================================================
  // RISK LEVEL
  // ============================================================

  let riskLevel: RiskLevel = 'LOW';

  if (score >= 70) {

    riskLevel = 'CRITICAL';

  } else if (score >= 45) {

    riskLevel = 'HIGH';

  } else if (score >= 20) {

    riskLevel = 'MEDIUM';
  }


  // ============================================================
  // SCAM TYPE
  // ============================================================

  let scamType =
    'No clear scam category';

  if (credentials.length > 0) {

    scamType =
      'Credential theft / phishing';

  } else if (
    tactics.includes('Unexpected prize / reward') &&
    tactics.includes('Advance payment request')
  ) {

    scamType =
      'Prize / advance-fee scam';

  } else if (
    tactics.includes('Refund / cashback lure')
  ) {

    scamType =
      'Refund / cashback scam';

  } else if (
    tactics.includes('Possible trusted-organisation impersonation') &&
    tactics.includes('Threat / fear pressure')
  ) {

    scamType =
      'Impersonation / threat scam';

  } else if (
    tactics.includes('Money transfer request')
  ) {

    scamType =
      'Suspicious payment request';

  } else if (
    urls.length > 0
  ) {

    scamType =
      'Possible phishing message';
  }


  // ============================================================
  // SAFE ACTION
  // ============================================================

  let safeAction =
    'VERIFY_BEFORE_ACTION';

  if (credentials.length > 0) {

    safeAction =
      'DO_NOT_SHARE_CREDENTIALS';

  } else if (
    tactics.includes('Money transfer request') ||
    tactics.includes('Advance payment request')
  ) {

    safeAction =
      'DO_NOT_PAY';

  } else if (
    riskLevel === 'CRITICAL' ||
    riskLevel === 'HIGH'
  ) {

    safeAction =
      'STOP_AND_VERIFY';
  }


  // ============================================================
  // EXPLANATION
  // ============================================================

  let explanation =
    'No strong scam pattern was detected. Still verify unknown senders before taking important financial actions.';

  if (riskLevel === 'CRITICAL') {

    explanation =
      'This message contains multiple strong scam indicators. Do not follow the instructions until you independently verify the sender through an official channel.';

  } else if (riskLevel === 'HIGH') {

    explanation =
      'This message contains several scam warning signs. Stop and verify the sender independently before taking action.';

  } else if (riskLevel === 'MEDIUM') {

    explanation =
      'This message contains suspicious behaviour. Verify the sender before clicking links, calling numbers or making payments.';
  }


  return {
    risk_level: riskLevel,
    risk_score: score,
    scam_type: scamType,
    credentials_detected: credentials,
    detected_tactics: [...new Set(tactics)],
    urls_detected: urls,
    safe_action: safeAction,
    explanation
  };
}