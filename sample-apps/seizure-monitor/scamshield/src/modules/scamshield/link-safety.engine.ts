export interface LinkSafetyResult {
  url: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_score: number;
  reasons: string[];
}

export function analyseLinkLocally(
  url: string
): LinkSafetyResult {

  let score = 0;

  const reasons: string[] = [];

  const lower =
    String(url || '').toLowerCase();


  // ============================================================
  // IP ADDRESS INSTEAD OF NORMAL DOMAIN
  // ============================================================

  if (
    /https?:\/\/\d{1,3}(\.\d{1,3}){3}/i.test(url)
  ) {

    score += 30;

    reasons.push(
      'Link uses an IP address instead of a normal domain'
    );
  }


  // ============================================================
  // URL SHORTENERS
  // ============================================================

  if (
    /bit\.ly|tinyurl\.com|t\.co|goo\.gl|cutt\.ly|rb\.gy/i.test(
      lower
    )
  ) {

    score += 20;

    reasons.push(
      'Shortened URL hides the final destination'
    );
  }


  // ============================================================
  // SUSPICIOUS FINANCIAL / PHISHING WORDS
  // ============================================================

  if (
    /login|verify|verification|kyc|bank|account|secure|update|payment|refund|otp/i.test(
      lower
    )
  ) {

    score += 20;

    reasons.push(
      'Link contains words commonly used in phishing'
    );
  }


  // ============================================================
  // @ SYMBOL
  // ============================================================

  if (
    url.includes('@')
  ) {

    score += 30;

    reasons.push(
      'URL contains @ which can disguise the real destination'
    );
  }


  // ============================================================
  // PARSE DOMAIN
  // ============================================================

  try {

    const parsed =
      new URL(url);


    const parts =
      parsed.hostname.split('.');


    // Excessive subdomains

    if (
      parts.length > 4
    ) {

      score += 15;

      reasons.push(
        'Domain contains an unusual number of subdomains'
      );
    }


    // Punycode / lookalike domain

    if (
      parsed.hostname.includes('xn--')
    ) {

      score += 30;

      reasons.push(
        'Domain may be using lookalike characters'
      );
    }


    // HTTP instead of HTTPS

    if (
      parsed.protocol === 'http:'
    ) {

      score += 15;

      reasons.push(
        'Link does not use HTTPS'
      );
    }


  } catch {

    score += 40;

    reasons.push(
      'URL format is invalid or unusual'
    );
  }


  // ============================================================
  // FINAL SCORE
  // ============================================================

  score =
    Math.min(score, 100);


  let risk_level:
    LinkSafetyResult['risk_level']
    = 'LOW';


  if (
    score >= 70
  ) {

    risk_level =
      'CRITICAL';

  } else if (
    score >= 40
  ) {

    risk_level =
      'HIGH';

  } else if (
    score >= 20
  ) {

    risk_level =
      'MEDIUM';
  }


  if (
    reasons.length === 0
  ) {

    reasons.push(
      'No obvious suspicious URL patterns detected'
    );
  }


  return {

    url,

    risk_level,

    risk_score:
      score,

    reasons
  };
}