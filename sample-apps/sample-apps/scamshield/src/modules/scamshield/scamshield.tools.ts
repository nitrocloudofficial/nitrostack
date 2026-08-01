import {
  ToolDecorator as Tool,
  ExecutionContext,
  z
} from '@nitrostack/core';

import {
  bankVerification
} from './bank-verification.service.js';

/**
 * ScamShield MCP Tools
 *
 * Tools:
 * 1. otp_share_guard
 * 2. analyze_message_intent
 * 3. check_link_safety
 * 4. phone_number_risk_check
 * 5. verify_bank_identity
 */

export class ScamShieldTools {

  // ============================================================
  // 1. OTP SHARE GUARD
  // ============================================================

  @Tool({
    name: 'otp_share_guard',

    description:
      'Detects requests to reveal sensitive authentication credentials such as OTPs, UPI PINs, CVVs, passwords and verification codes. Returns an explainable fraud-risk warning.',

    inputSchema: z.object({
      message: z
        .string()
        .describe('Suspicious message received by the user')
    }),

    examples: {
      request: {
        message:
          'Your bank account will be blocked today. Send the OTP immediately to verify your account.'
      },

      response: {
        risk_level: 'CRITICAL',
        credential_request_detected: true,
        credentials_detected: [
          'OTP / verification code'
        ],
        detected_tactics: [
          'Urgency / time pressure',
          'Threat of account restriction',
          'Possible financial-authority impersonation'
        ],
        safe_action: 'DO_NOT_SHARE',
        explanation:
          'Never reveal OTPs, PINs, CVVs, passwords or verification codes to another person.'
      }
    }
  })

  async otpShareGuard(
    input: any,
    ctx: ExecutionContext
  ) {

    const message =
      String(input.message || '')
        .toLowerCase();

    const credentials: string[] = [];
    const tactics: string[] = [];

    // Credential detection

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
      /\bupi pin\b|\bpin\b/i.test(
        message
      )
    ) {
      credentials.push('PIN');
    }

    if (
      /\bcvv\b|\bcvc\b/i.test(
        message
      )
    ) {
      credentials.push('CVV');
    }

    if (
      /\bpassword\b|\bpasscode\b/i.test(
        message
      )
    ) {
      credentials.push('Password');
    }

    // Scam tactic detection

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

    let riskLevel = 'LOW';

    if (credentialRequested) {
      riskLevel = 'CRITICAL';
    } else if (tactics.length >= 2) {
      riskLevel = 'HIGH';
    } else if (tactics.length === 1) {
      riskLevel = 'MEDIUM';
    }

    ctx.logger.info(
      'OTP Share Guard analysis completed',
      {
        riskLevel,
        credentialRequested,
        credentials,
        tactics
      }
    );

    return {
      risk_level: riskLevel,

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
          ? 'Never reveal OTPs, PINs, CVVs, passwords or verification codes to another person. Stop the interaction and independently contact the organisation through its official app, website or phone number.'
          : 'No explicit request for an authentication credential was detected, but other scam signals may still require verification.'
    };
  }


  // ============================================================
  // 2. ANALYZE MESSAGE INTENT
  // ============================================================

  @Tool({
    name: 'analyze_message_intent',

    description:
      'Analyses suspicious SMS, WhatsApp messages, emails or transcribed voice messages for scam manipulation patterns such as urgency, threats, fake prizes, advance fees, refunds, impersonation, secrecy and payment requests.',

    inputSchema: z.object({
      message: z
        .string()
        .describe(
          'Suspicious SMS, WhatsApp message, email text or transcribed voice message'
        )
    }),

    examples: {
      request: {
        message:
          'Congratulations! You won ₹50,000. Pay ₹499 processing fee immediately to claim your prize.'
      },

      response: {
        risk_level: 'CRITICAL',
        scam_type:
          'Prize / advance-fee scam',
        detected_tactics: [
          'Prize / reward lure',
          'Advance-fee request',
          'Urgency / time pressure'
        ],
        safe_action: 'DO_NOT_PAY'
      }
    }
  })

  async analyzeMessageIntent(
    input: any,
    ctx: ExecutionContext
  ) {

    const message =
      String(input.message || '')
        .toLowerCase();

    const tactics: string[] = [];

    let score = 0;

    // Urgency

    if (
      /urgent|immediately|today|now|right now|act now|hurry|within \d+|expires/i.test(
        message
      )
    ) {
      tactics.push(
        'Urgency / time pressure'
      );

      score += 15;
    }

    // Threats

    if (
      /blocked|suspended|closed|deactivated|freeze|frozen|legal action|police|arrest/i.test(
        message
      )
    ) {
      tactics.push(
        'Threat / fear pressure'
      );

      score += 20;
    }

    // Prize / lottery

    if (
      /congratulations|winner|won|prize|lottery|reward|gift/i.test(
        message
      )
    ) {
      tactics.push(
        'Prize / reward lure'
      );

      score += 25;
    }

    // Advance fee

    if (
      /processing fee|registration fee|release fee|advance fee|pay.*fee/i.test(
        message
      )
    ) {
      tactics.push(
        'Advance-fee request'
      );

      score += 30;
    }

    // Refund / cashback

    if (
      /refund|cashback|reimbursement/i.test(
        message
      )
    ) {
      tactics.push(
        'Refund / cashback lure'
      );

      score += 15;
    }

    // Payment requests

    if (
      /pay|payment|send money|transfer money|upi|gpay|google pay|phonepe|paytm/i.test(
        message
      )
    ) {
      tactics.push(
        'Payment request'
      );

      score += 20;
    }

    // Credential requests

    if (
      /\botp\b|verification code|security code|upi pin|\bpin\b|cvv|password|passcode/i.test(
        message
      )
    ) {
      tactics.push(
        'Sensitive credential request'
      );

      score += 40;
    }

    // Impersonation

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
      tactics.push(
        'Isolation / secrecy pressure'
      );

      score += 20;
    }

    // Suspicious link

    if (
      /https?:\/\/|www\.|bit\.ly|tinyurl/i.test(
        message
      )
    ) {
      tactics.push(
        'External link'
      );

      score += 10;
    }

    score =
      Math.min(
        score,
        100
      );

    let riskLevel = 'LOW';

    if (score >= 70) {
      riskLevel = 'CRITICAL';
    } else if (score >= 45) {
      riskLevel = 'HIGH';
    } else if (score >= 20) {
      riskLevel = 'MEDIUM';
    }

    let scamType =
      'No clear scam category';

    if (
      tactics.includes(
        'Prize / reward lure'
      ) &&
      tactics.includes(
        'Advance-fee request'
      )
    ) {

      scamType =
        'Prize / advance-fee scam';

    } else if (
      tactics.includes(
        'Sensitive credential request'
      )
    ) {

      scamType =
        'Credential theft / phishing';

    } else if (
      tactics.includes(
        'Refund / cashback lure'
      )
    ) {

      scamType =
        'Refund scam';

    } else if (
      tactics.includes(
        'Authority / organisation impersonation'
      ) &&
      tactics.includes(
        'Threat / fear pressure'
      )
    ) {

      scamType =
        'Impersonation / threat scam';

    } else if (
      tactics.includes(
        'Payment request'
      )
    ) {

      scamType =
        'Suspicious payment request';
    }

    let safeAction =
      'VERIFY_BEFORE_ACTION';

    if (
      tactics.includes(
        'Sensitive credential request'
      )
    ) {

      safeAction =
        'DO_NOT_SHARE';

    } else if (
      tactics.includes(
        'Payment request'
      ) ||
      tactics.includes(
        'Advance-fee request'
      )
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

    let explanation =
      'No strong scam manipulation pattern was detected. Verify the sender before taking action.';

    if (
      riskLevel === 'CRITICAL'
    ) {

      explanation =
        'This message contains multiple strong scam indicators. Do not send money, reveal credentials, click suspicious links or follow instructions until the sender has been independently verified.';

    } else if (
      riskLevel === 'HIGH'
    ) {

      explanation =
        'This message contains several scam warning signs. Stop and independently verify the request using an official channel.';

    } else if (
      riskLevel === 'MEDIUM'
    ) {

      explanation =
        'This message contains a suspicious pattern. Verify the sender and request before taking action.';
    }

    ctx.logger.info(
      'Message intent analysis completed',
      {
        score,
        riskLevel,
        scamType,
        tactics
      }
    );

    return {
      risk_level:
        riskLevel,

      risk_score:
        score,

      scam_type:
        scamType,

      detected_tactics:
        tactics,

      safe_action:
        safeAction,

      explanation
    };
  }


  // ============================================================
  // 3. CHECK LINK SAFETY - VIRUSTOTAL
  // ============================================================

  @Tool({
    name: 'check_link_safety',

    description:
      'Checks a suspicious URL using VirusTotal and reports whether security vendors have flagged the URL as malicious or suspicious.',

    inputSchema: z.object({
      url: z
        .string()
        .describe(
          'Suspicious URL or link to check'
        )
    }),

    examples: {
      request: {
        url: 'https://example.com'
      },

      response: {
        risk_level: 'LOW',
        url: 'https://example.com',
        malicious: 0,
        suspicious: 0,
        harmless: 0,
        safe_action:
          'VERIFY_BEFORE_OPENING'
      }
    }
  })

  async checkLinkSafety(
    input: any,
    ctx: ExecutionContext
  ) {

    const url =
      String(
        input.url || ''
      ).trim();

    if (!url) {

      return {
        risk_level: 'UNKNOWN',
        url,
        error: 'No URL provided',
        safe_action: 'DO_NOT_OPEN'
      };
    }

    const apiKey =
      process.env.VIRUSTOTAL_API_KEY;

    if (!apiKey) {

      ctx.logger.error(
        'VirusTotal API key is missing'
      );

      return {
        risk_level: 'UNKNOWN',

        url,

        error:
          'VIRUSTOTAL_API_KEY is not configured.',

        safe_action:
          'VERIFY_MANUALLY'
      };
    }

    try {

      const urlId =
        Buffer
          .from(url)
          .toString('base64url');

      const response =
        await fetch(
          `https://www.virustotal.com/api/v3/urls/${urlId}`,
          {
            method: 'GET',

            headers: {
              'x-apikey': apiKey,
              'accept': 'application/json'
            }
          }
        );

      if (
        response.status === 404
      ) {

        ctx.logger.info(
          'URL not found in VirusTotal database',
          {
            url
          }
        );

        return {
          risk_level: 'UNKNOWN',

          url,

          malicious: 0,
          suspicious: 0,
          harmless: 0,
          undetected: 0,

          message:
            'VirusTotal does not currently have an analysis result for this URL.',

          safe_action:
            'VERIFY_BEFORE_OPENING'
        };
      }

      if (!response.ok) {

        const errorText =
          await response.text();

        ctx.logger.error(
          'VirusTotal request failed',
          {
            status:
              response.status,

            error:
              errorText
          }
        );

        return {
          risk_level: 'UNKNOWN',

          url,

          error:
            `VirusTotal returned HTTP ${response.status}`,

          safe_action:
            'VERIFY_MANUALLY'
        };
      }

      const data: any =
        await response.json();

      const stats =
        data?.data?.attributes
          ?.last_analysis_stats || {};

      const malicious =
        Number(
          stats.malicious || 0
        );

      const suspicious =
        Number(
          stats.suspicious || 0
        );

      const harmless =
        Number(
          stats.harmless || 0
        );

      const undetected =
        Number(
          stats.undetected || 0
        );

      let riskLevel = 'LOW';

      if (
        malicious >= 3
      ) {

        riskLevel = 'CRITICAL';

      } else if (
        malicious >= 1 ||
        suspicious >= 3
      ) {

        riskLevel = 'HIGH';

      } else if (
        suspicious >= 1
      ) {

        riskLevel = 'MEDIUM';
      }

      let safeAction =
        'VERIFY_BEFORE_OPENING';

      if (
        riskLevel === 'CRITICAL' ||
        riskLevel === 'HIGH'
      ) {

        safeAction =
          'DO_NOT_OPEN';
      }

      ctx.logger.info(
        'VirusTotal URL analysis completed',
        {
          url,
          malicious,
          suspicious,
          harmless,
          undetected,
          riskLevel
        }
      );

      return {
        risk_level:
          riskLevel,

        url,

        malicious,
        suspicious,
        harmless,
        undetected,

        safe_action:
          safeAction,

        explanation:
          malicious > 0
            ? `${malicious} VirusTotal security vendor(s) flagged this URL as malicious.`
            : suspicious > 0
              ? `${suspicious} VirusTotal security vendor(s) marked this URL as suspicious.`
              : 'VirusTotal did not report malicious detections for this URL in the available analysis.'
      };

    } catch (error) {

      const errorMessage =
        error instanceof Error
          ? error.message
          : String(error);

      ctx.logger.error(
        'Link safety check failed',
        {
          url,
          error:
            errorMessage
        }
      );

      return {
        risk_level: 'UNKNOWN',

        url,

        error:
          errorMessage,

        safe_action:
          'VERIFY_MANUALLY'
      };
    }
  }


  // ============================================================
  // 4. PHONE NUMBER RISK CHECK
  // ============================================================

  @Tool({
    name: 'phone_number_risk_check',

    description:
      'Analyses a suspicious message containing a phone number and detects scam indicators such as impersonation, urgency, payment requests, credential requests, threats and secrecy.',

    inputSchema: z.object({
      message: z
        .string()
        .describe(
          'Suspicious message containing or referring to a phone number'
        )
    }),

    examples: {
      request: {
        message:
          'SBI customer care: Your account will be blocked today. Call +91 9876543210 immediately and provide your OTP.'
      },

      response: {
        risk_level: 'CRITICAL',

        phone_number_detected:
          true,

        phone_numbers: [
          '+91 9876543210'
        ],

        detected_tactics: [
          'Possible bank / authority impersonation',
          'Urgency / time pressure',
          'Threat of account restriction',
          'Sensitive credential request'
        ],

        safe_action:
          'DO_NOT_CALL_OR_SHARE_INFORMATION'
      }
    }
  })

  async phoneNumberRiskCheck(
    input: any,
    ctx: ExecutionContext
  ) {

    const originalMessage =
      String(
        input.message || ''
      );

    const lowerMessage =
      originalMessage.toLowerCase();

    const tactics: string[] = [];

    let score = 0;

    // Phone number extraction

    const phonePattern =
      /(?:\+91[\s-]?)?[6-9]\d{9}\b/g;

    const phoneMatches =
      originalMessage.match(
        phonePattern
      );

    const phoneNumbers =
      phoneMatches
        ? [...new Set(phoneMatches)]
        : [];

    const phoneDetected =
      phoneNumbers.length > 0;

    if (phoneDetected) {
      score += 10;
    }

    // Authority / bank impersonation

    if (
      /bank|sbi|hdfc|icici|axis bank|rbi|customer care|support team|police|government/i.test(
        lowerMessage
      )
    ) {

      tactics.push(
        'Possible bank / authority impersonation'
      );

      score += 20;
    }

    // Urgency

    if (
      /urgent|immediately|today|now|right now|act now|within \d+|expires/i.test(
        lowerMessage
      )
    ) {

      tactics.push(
        'Urgency / time pressure'
      );

      score += 15;
    }

    // Account restriction threats

    if (
      /blocked|suspended|closed|deactivated|freeze|frozen|restricted/i.test(
        lowerMessage
      )
    ) {

      tactics.push(
        'Threat of account restriction'
      );

      score += 20;
    }

    // Payment requests

    if (
      /pay|payment|send money|transfer|upi|gpay|google pay|phonepe|paytm/i.test(
        lowerMessage
      )
    ) {

      tactics.push(
        'Payment request'
      );

      score += 20;
    }

    // Sensitive credentials

    if (
      /\botp\b|verification code|security code|upi pin|\bpin\b|cvv|password|passcode/i.test(
        lowerMessage
      )
    ) {

      tactics.push(
        'Sensitive credential request'
      );

      score += 40;
    }

    // Secrecy

    if (
      /don't tell|do not tell|secret|confidential|keep this private/i.test(
        lowerMessage
      )
    ) {

      tactics.push(
        'Isolation / secrecy pressure'
      );

      score += 20;
    }

    // Contact request

    if (
      /call|contact|phone|whatsapp|message this number|call this number/i.test(
        lowerMessage
      )
    ) {

      tactics.push(
        'Request to contact provided number'
      );

      score += 10;
    }

    // Prize / refund

    if (
      /prize|winner|lottery|reward|refund|cashback/i.test(
        lowerMessage
      )
    ) {

      tactics.push(
        'Financial incentive / lure'
      );

      score += 20;
    }

    score =
      Math.min(
        score,
        100
      );

    let riskLevel = 'LOW';

    if (
      score >= 70
    ) {

      riskLevel = 'CRITICAL';

    } else if (
      score >= 45
    ) {

      riskLevel = 'HIGH';

    } else if (
      score >= 20
    ) {

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

    let explanation =
      'No strong scam indicators were detected. However, independently verify unknown phone numbers before calling or sharing information.';

    if (
      riskLevel === 'CRITICAL'
    ) {

      explanation =
        'This message contains strong scam indicators. Do not call the provided number, send money or reveal OTPs, PINs, CVVs, passwords or verification codes. Contact the organisation using the phone number shown on its official website or app.';

    } else if (
      riskLevel === 'HIGH'
    ) {

      explanation =
        'This phone-number message contains several scam warning signs. Do not trust the provided contact number until you independently verify it through an official source.';

    } else if (
      riskLevel === 'MEDIUM'
    ) {

      explanation =
        'This message contains suspicious indicators. Verify the phone number independently before contacting it or following any instructions.';
    }

    ctx.logger.info(
      'Phone number risk analysis completed',
      {
        score,
        riskLevel,
        phoneDetected,
        phoneNumbers,
        tactics
      }
    );

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

      explanation
    };
  }


  // ============================================================
  // 5. VERIFY BANK IDENTITY
  // ============================================================

  @Tool({
    name: 'verify_bank_identity',

    description:
      'Checks whether a suspicious message claims to represent a supported Indian bank and compares URLs in the message against ScamShield trusted bank-domain data.',

    inputSchema: z.object({
      message: z
        .string()
        .describe(
          'Suspicious message claiming to represent a bank'
        )
    }),

    examples: {
      request: {
        message:
          'SBI: Your account will be blocked today. Verify at http://fake-sbi-login.com'
      },

      response: {
        bank_detected:
          true,

        bank_name:
          'State Bank of India',

        domain_verified:
          false,

        suspicious_domains: [
          'fake-sbi-login.com'
        ],

        risk_level:
          'CRITICAL',

        safe_action:
          'DO_NOT_OPEN_LINK_VERIFY_BANK_INDEPENDENTLY'
      }
    }
  })

  async verifyBankIdentity(
    input: any,
    ctx: ExecutionContext
  ) {

    const message =
      String(
        input.message || ''
      ).trim();

    // ----------------------------------------------------------
    // Validate input
    // ----------------------------------------------------------

    if (!message) {

      return {
        bank_detected:
          false,

        bank_name:
          null,

        domain_verified:
          false,

        risk_level:
          'UNKNOWN',

        error:
          'No message provided',

        safe_action:
          'VERIFY_SENDER'
      };
    }

    // ----------------------------------------------------------
    // Run trusted bank registry verification
    // ----------------------------------------------------------

    const result =
      bankVerification.verifyMessage(
        message
      );

    // ----------------------------------------------------------
    // Log MCP tool execution
    // ----------------------------------------------------------

    ctx.logger.info(
      'Bank identity verification completed',
      {
        bankDetected:
          result.bank_detected,

        bankName:
          result.bank_name,

        bankType:
          result.bank_type,

        domainVerified:
          result.domain_verified,

        officialDomains:
          result.official_domains,

        matchingDomains:
          result.matching_domains,

        suspiciousDomains:
          result.suspicious_domains,

        dataSource:
          result.data_source,

        riskLevel:
          result.risk_level,

        riskScore:
          result.risk_score
      }
    );

    // ----------------------------------------------------------
    // Return evidence
    // ----------------------------------------------------------

    return result;
  }

}