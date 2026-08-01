import banksData from '../../data/indian-banks.json' with {
  type: 'json'
};


// ============================================================
// TYPES
// ============================================================

export interface TrustedBank {
  id: string;
  name: string;
  aliases: string[];
  type: string;
  officialDomains: string[];
  source: string;
}


export interface BankVerificationResult {

  bank_detected: boolean;

  bank_name: string | null;

  bank_type: string | null;

  claimed_bank: boolean;

  urls_checked: string[];

  official_domains: string[];

  matching_domains: string[];

  suspicious_domains: string[];

  domain_verified: boolean;

  data_source: string | null;

  risk_level:
    | 'LOW'
    | 'MEDIUM'
    | 'HIGH'
    | 'CRITICAL';

  risk_score: number;

  explanation: string;

  safe_action: string;
}


// ============================================================
// LOAD TRUSTED BANK DATASET
// ============================================================

const trustedBanks: TrustedBank[] =
  banksData as TrustedBank[];


// ============================================================
// BANK VERIFICATION SERVICE
// ============================================================

export class BankVerificationService {


  // ==========================================================
  // DETECT BANK NAME
  // ==========================================================

  detectBank(
    message: string
  ): TrustedBank | null {

    const lowerMessage =
      String(message || '')
        .toLowerCase();


    for (
      const bank
      of trustedBanks
    ) {

      for (
        const alias
        of bank.aliases
      ) {

        const escapedAlias =
          alias.replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&'
          );


        const pattern =
          new RegExp(
            `\\b${escapedAlias}\\b`,
            'i'
          );


        if (
          pattern.test(
            lowerMessage
          )
        ) {

          return bank;
        }
      }
    }


    return null;
  }


  // ==========================================================
  // EXTRACT URLs
  // ==========================================================

  extractUrls(
    message: string
  ): string[] {

    const matches =
      String(message || '')
        .match(
          /https?:\/\/[^\s<>"']+/gi
        );


    return matches
      ? [...new Set(matches)]
      : [];
  }


  // ==========================================================
  // EXTRACT DOMAIN
  // ==========================================================

  extractDomain(
    url: string
  ): string | null {

    try {

      const parsed =
        new URL(url);


      return parsed.hostname
        .toLowerCase()
        .replace(
          /^www\./,
          ''
        );


    } catch {

      return null;
    }
  }


  // ==========================================================
  // CHECK WHETHER DOMAIN BELONGS TO BANK
  // ==========================================================

  isOfficialDomain(
    domain: string,
    bank: TrustedBank
  ): boolean {

    const cleanDomain =
      domain
        .toLowerCase()
        .replace(
          /^www\./,
          ''
        );


    return bank.officialDomains.some(
      officialDomain => {

        const trustedDomain =
          officialDomain
            .toLowerCase()
            .replace(
              /^www\./,
              ''
            );


        // Exact official domain
        if (
          cleanDomain ===
          trustedDomain
        ) {

          return true;
        }


        // Legitimate subdomain
        //
        // Example:
        //
        // secure.sbi.co.in
        //
        // should match:
        //
        // sbi.co.in

        if (
          cleanDomain.endsWith(
            `.${trustedDomain}`
          )
        ) {

          return true;
        }


        return false;
      }
    );
  }


  // ==========================================================
  // VERIFY MESSAGE
  // ==========================================================

  verifyMessage(
    message: string
  ): BankVerificationResult {

    const bank =
      this.detectBank(
        message
      );


    const urls =
      this.extractUrls(
        message
      );


    // ========================================================
    // NO SUPPORTED BANK DETECTED
    // ========================================================

    if (!bank) {

      return {

        bank_detected:
          false,

        bank_name:
          null,

        bank_type:
          null,

        claimed_bank:
          false,

        urls_checked:
          urls,

        official_domains:
          [],

        matching_domains:
          [],

        suspicious_domains:
          [],

        domain_verified:
          false,

        data_source:
          null,

        risk_level:
          'LOW',

        risk_score:
          0,

        explanation:
          'No bank from the trusted ScamShield bank registry was detected in the message.',

        safe_action:
          'VERIFY_SENDER_IF_UNCERTAIN'
      };
    }


    // ========================================================
    // BANK FOUND
    // ========================================================

    const matchingDomains:
      string[] = [];


    const suspiciousDomains:
      string[] = [];


    for (
      const url
      of urls
    ) {

      const domain =
        this.extractDomain(
          url
        );


      if (!domain) {

        suspiciousDomains.push(
          url
        );

        continue;
      }


      if (
        this.isOfficialDomain(
          domain,
          bank
        )
      ) {

        matchingDomains.push(
          domain
        );

      } else {

        suspiciousDomains.push(
          domain
        );
      }
    }


    // ========================================================
    // DEFAULT BANK CLAIM
    // ========================================================

    let riskScore =
      20;


    let riskLevel:
      BankVerificationResult['risk_level']
      = 'MEDIUM';


    let explanation =
      `The message claims to represent ${bank.name}. ` +
      `ScamShield detected this bank in its trusted bank registry.`;


    let safeAction =
      'VERIFY_BANK_INDEPENDENTLY';


    // ========================================================
    // BANK + UNTRUSTED DOMAIN
    // ========================================================

    if (
      suspiciousDomains.length > 0
    ) {

      riskScore =
        80;


      riskLevel =
        'CRITICAL';


      explanation =
        `The message claims to represent ${bank.name}, ` +
        `but the supplied domain does not match the trusted ` +
        `official domain registry for this bank. ` +
        `This is strong evidence of possible bank impersonation or phishing.`;


      safeAction =
        'DO_NOT_OPEN_LINK_VERIFY_BANK_INDEPENDENTLY';
    }


    // ========================================================
    // BANK + TRUSTED DOMAIN
    // ========================================================

    else if (
      matchingDomains.length > 0
    ) {

      riskScore =
        10;


      riskLevel =
        'LOW';


      explanation =
        `The detected domain matches the trusted domain registry ` +
        `for ${bank.name}. ` +
        `However, a domain match alone does not prove that the sender ` +
        `or the entire message is genuine.`;


      safeAction =
        'VERIFY_MESSAGE_CONTEXT';
    }


    // ========================================================
    // BANK BUT NO URL
    // ========================================================

    else {

      riskScore =
        20;


      riskLevel =
        'MEDIUM';


      explanation =
        `The message claims to represent ${bank.name}. ` +
        `The bank exists in ScamShield's trusted registry, ` +
        `but no URL was provided for domain verification.`;


      safeAction =
        'VERIFY_BANK_INDEPENDENTLY';
    }


    // ========================================================
    // FINAL RESULT
    // ========================================================

    return {

      bank_detected:
        true,

      bank_name:
        bank.name,

      bank_type:
        bank.type,

      claimed_bank:
        true,

      urls_checked:
        urls,

      official_domains:
        bank.officialDomains,

      matching_domains:
        matchingDomains,

      suspicious_domains:
        suspiciousDomains,

      domain_verified:
        (
          matchingDomains.length > 0 &&
          suspiciousDomains.length === 0
        ),

      data_source:
        bank.source,

      risk_level:
        riskLevel,

      risk_score:
        Math.min(
          riskScore,
          100
        ),

      explanation,

      safe_action:
        safeAction
    };
  }


  // ==========================================================
  // GET ALL BANKS
  // ==========================================================

  getTrustedBanks():
    TrustedBank[] {

    return trustedBanks;
  }


  // ==========================================================
  // GET BANK COUNT
  // ==========================================================

  getTrustedBankCount():
    number {

    return trustedBanks.length;
  }

}


// ============================================================
// SHARED INSTANCE
// ============================================================

export const bankVerification =
  new BankVerificationService();