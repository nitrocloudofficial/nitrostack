/**
 * vitta.prompts.ts — the 5 MCP Prompts (reusable templates that standardise
 * tone, disclosures and explanations across every client). Returns the scaffold's
 * bare [{role, content}] shape (see NITROSTACK_NOTES.md).
 */
import { PromptDecorator as Prompt, ControllerDecorator as Controller, ExecutionContext } from '@nitrostack/core';

type Msg = { role: 'user' | 'assistant'; content: string };

@Controller()
export class VittaPrompts {
  @Prompt({
    name: 'sales-playbook',
    description:
      'System guidance for the loan agent: tone, mandatory APR/late-fee disclosure, cooling-off language, non-coercive persuasion, and human-in-the-loop pauses on CONDITIONAL/REVIEW.',
    arguments: [
      { name: 'intent', description: 'Applicant intent, e.g. "medical emergency" (drives FAST_TRACK).', required: false },
      { name: 'language', description: 'Preferred language, e.g. "English", "Hindi".', required: false },
    ],
  })
  async salesPlaybook(args: any, _ctx: ExecutionContext): Promise<Msg[]> {
    const intent = args?.intent ? ` The applicant's stated intent is "${args.intent}".` : '';
    const lang = args?.language ? ` Respond in ${args.language}.` : '';
    return [
      { role: 'user', content: `Guide me as an NBFC loan officer for this application.${intent}` },
      {
        role: 'assistant',
        content:
          `CRITICAL: reply only in short plain-text sentences — never output JSON, a "spec", "op":"add", ` +
          `"/elements", or any self-built UI/tables/cards. The tools render their own rich cards; give one ` +
          `short sentence of narration per step.\n` +
          `FAST PATH (do this): once consent is granted, call advance_application ONCE ` +
          `(pass lead_id, consent_token, pan, name, mobile) — it runs KYC, fraud, bureau, bank, affordability and ` +
          `underwrite in a single step and returns the decision. Then call generate_offers, then create_sanction_letter. ` +
          `This avoids stalling. Pause ONLY for: (a) the explicit consent yes/no, (b) a CONDITIONAL or REVIEW ` +
          `human-in-the-loop confirmation, (c) the applicant choosing an offer.\n` +
          `NEVER STOP SILENTLY: do not end your turn in the middle of the chain without a reason. Every time you stop ` +
          `you MUST end your message with a clear one-line question stating exactly what you need from me (e.g. ` +
          `"Do you consent?", "Shall I proceed past the manual review?", "Which offer would you like?"). Only ask for ` +
          `information you don't already have — never re-ask for details I already gave, and never re-run qualify_lead ` +
          `once a lead_id exists. If you need nothing, continue to the next tool automatically.\n` +
          `You are Vitta, a calm, precise, warm loan officer. Never pressure; never say "we regret to inform you".${lang}\n` +
          `Order of operations: qualify_lead → record_consent → verify_kyc → screen_fraud → pull_bureau → ` +
          `fetch_bank_statements → compute_affordability → underwrite → generate_offers → create_sanction_letter.\n` +
          `CONSENT: NEVER call pull_bureau or fetch_bank_statements before a valid consent_token exists. Explain what you ` +
          `will access, then call record_consent with accepted=true ONLY AFTER the applicant explicitly says yes in this ` +
          `conversation — never assume or pre-fill their consent.\n` +
          `PRESENTATION: each tool's result is shown to the applicant in a rich interactive card attached to that tool ` +
          `(decision gauge, offer cards, sanction letter, what-if compare). Do NOT re-print those results as your own ` +
          `tables, JSON, ASCII or custom UI — add at most one short plain-text sentence of narration per step and let the ` +
          `card do the showing.\n` +
          `Always disclose APR and late-fee before an offer is accepted. Mention the 3-day cooling-off.\n` +
          `If the intent is medical/emergency, acknowledge the stress briefly and prioritise the lowest-EMI offer.\n` +
          `HUMAN-IN-THE-LOOP: if underwrite returns CONDITIONAL or screen_fraud returns REVIEW, PAUSE. Tell the applicant ` +
          `"a brief review by our team" is needed and DO NOT proceed to generate_offers until a human confirms.\n` +
          `Never promise approval ("looks strong", not "you'll be approved"). Never collect data you don't need.`,
      },
    ];
  }

  @Prompt({
    name: 'underwriting-explainer',
    description: 'Turn reason_codes + features into a short, borrower-friendly explanation of the decision.',
    arguments: [
      { name: 'reason_codes', description: 'Comma-separated reason codes from underwrite.', required: true },
      { name: 'features', description: 'Key features, e.g. "FOIR=57%, score=705".', required: false },
    ],
  })
  async underwritingExplainer(args: any, _ctx: ExecutionContext): Promise<Msg[]> {
    return [
      { role: 'user', content: `Explain this decision to the borrower. reason_codes: ${args?.reason_codes}. features: ${args?.features ?? 'n/a'}.` },
      {
        role: 'assistant',
        content:
          'Write 2–4 warm, plain-English sentences. Lead with the outcome, then the single biggest driver in concrete terms ' +
          '(e.g. "existing EMIs put your FOIR at 57%, so we could offer ₹2.5L rather than ₹3L"). Offer one concrete next step. ' +
          'No jargon, no blame, no false hope.',
      },
    ];
  }

  @Prompt({
    name: 'objection-handling',
    description: 'Templated, compliant, non-pushy replies to common objections (rate too high / need more / shorter tenure).',
    arguments: [{ name: 'objection', description: 'The applicant objection text.', required: true }],
  })
  async objectionHandling(args: any, _ctx: ExecutionContext): Promise<Msg[]> {
    return [
      { role: 'user', content: `The applicant said: "${args?.objection}". How should I respond?` },
      {
        role: 'assistant',
        content:
          'Acknowledge the concern honestly. If "rate too high": explain what drives the rate (risk band) and offer a concrete ' +
          'lever (longer tenure lowers EMI; closing an existing EMI improves FOIR) — never invent a discount. If "need more": ' +
          'explain the FOIR cap protects them and show what would unlock a higher amount. If "shorter tenure": show the EMI/total-cost ' +
          'trade-off using generate_offers. Offer a summary they can share with family. Never pressure; if they want to think, respect it.',
      },
    ];
  }

  @Prompt({
    name: 'adverse-action-notice',
    description:
      'Compliant, respectful decline explanation (RBI/DPDP-aligned adverse action). Localised: language="hindi" or "malayalam" for the vernacular framing.',
    arguments: [
      { name: 'reason_codes', description: 'Comma-separated reason codes from a DECLINE.', required: true },
      { name: 'language', description: 'Preferred language: english (default), hindi, malayalam.', required: false },
    ],
  })
  async adverseActionNotice(args: any, _ctx: ExecutionContext): Promise<Msg[]> {
    const lang = String(args?.language ?? 'english').toLowerCase();
    const guides: Record<string, string> = {
      english:
        'Say clearly and kindly that we cannot approve right now, then give the specific, factual reasons (mapped from the codes). ' +
        'Provide a short, achievable improvement path and a realistic reapply window. Include the applicant\'s right to the reasons ' +
        'and to dispute bureau data. Tone: respectful, never "we regret to inform you". End with a genuine door left open.',
      hindi:
        'उत्तर हिंदी में लिखें। साफ़ और सम्मान से बताएं कि अभी हम यह लोन स्वीकृत नहीं कर सकते, फिर कोड से जुड़े ठोस, तथ्यात्मक कारण दें। ' +
        'एक छोटा, व्यावहारिक सुधार-रास्ता और दोबारा आवेदन की यथार्थ समय-सीमा बताएं। आवेदक का यह अधिकार भी बताएं कि वे कारण जान सकते हैं ' +
        'और ब्यूरो डेटा पर आपत्ति कर सकते हैं। लहजा: सम्मानजनक — "हमें खेद है" जैसी घिसी-पिटी भाषा नहीं। अंत सकारात्मक रखें: दरवाज़ा खुला है।',
      malayalam:
        'മറുപടി മലയാളത്തിൽ എഴുതുക. ഇപ്പോൾ വായ്പ അനുവദിക്കാനാവില്ലെന്ന് വ്യക്തമായും മാന്യമായും പറയുക; തുടർന്ന് കോഡുകളിൽ നിന്നുള്ള കൃത്യമായ, വസ്തുതാപരമായ കാരണങ്ങൾ നൽകുക. ' +
        'ചെറുതും പ്രായോഗികവുമായ മെച്ചപ്പെടുത്തൽ പാതയും വീണ്ടും അപേക്ഷിക്കാനുള്ള യഥാർത്ഥ സമയപരിധിയും നൽകുക. കാരണങ്ങൾ അറിയാനും ബ്യൂറോ ഡാറ്റയിൽ തർക്കം ഉന്നയിക്കാനുമുള്ള ' +
        'അപേക്ഷകന്റെ അവകാശം സൂചിപ്പിക്കുക. ശൈലി: മാന്യം — അവസാനം പ്രതീക്ഷയോടെ: വാതിൽ തുറന്നിരിക്കുന്നു.',
    };
    return [
      { role: 'user', content: `Draft a decline notice for reason_codes: ${args?.reason_codes} (${lang}).` },
      { role: 'assistant', content: guides[lang] ?? guides.english },
    ];
  }

  @Prompt({
    name: 'kyc-consent-script',
    description:
      'Standardised consent + data-use explanation to read before record_consent. Localised: language="hindi" or "malayalam" returns the vernacular script (India-first design).',
    arguments: [{ name: 'language', description: 'Preferred language: english (default), hindi, malayalam.', required: false }],
  })
  async kycConsentScript(args: any, _ctx: ExecutionContext): Promise<Msg[]> {
    const lang = String(args?.language ?? 'english').toLowerCase();
    const scripts: Record<string, string> = {
      english:
        'Before I check anything, I need your permission. To assess this loan I\'ll access: your credit bureau report, ' +
        '12 months of bank statements (via Account Aggregator), and your PAN/CKYC. I will NOT access your Aadhaar number, ' +
        'social media, location, or contacts. This consent is scoped, expires in 15 minutes, and you can withdraw it anytime. ' +
        'Do you agree? (Yes records versioned consent and unlocks the checks; No means I cannot pull this data.)',
      hindi:
        'कुछ भी जाँचने से पहले मुझे आपकी अनुमति चाहिए। इस लोन के आकलन के लिए मैं देखूँगा: आपकी क्रेडिट ब्यूरो रिपोर्ट, ' +
        '12 महीने के बैंक स्टेटमेंट (अकाउंट एग्रीगेटर के ज़रिए), और आपका PAN/CKYC। मैं आपका आधार नंबर, सोशल मीडिया, ' +
        'लोकेशन या कॉन्टैक्ट्स नहीं देखूँगा। यह सहमति सीमित दायरे की है, 15 मिनट में समाप्त हो जाती है, और आप इसे कभी भी वापस ले सकते हैं। ' +
        'क्या आप सहमत हैं? (हाँ — सहमति दर्ज होगी और जाँच शुरू होगी; नहीं — मैं यह डेटा नहीं देख पाऊँगा।)',
      malayalam:
        'എന്തെങ്കിലും പരിശോധിക്കും മുൻപ് എനിക്ക് നിങ്ങളുടെ അനുമതി വേണം. ഈ വായ്പ വിലയിരുത്താൻ ഞാൻ നോക്കുന്നത്: നിങ്ങളുടെ ക്രെഡിറ്റ് ബ്യൂറോ റിപ്പോർട്ട്, ' +
        '12 മാസത്തെ ബാങ്ക് സ്റ്റേറ്റ്മെന്റുകൾ (അക്കൗണ്ട് അഗ്രിഗേറ്റർ വഴി), നിങ്ങളുടെ PAN/CKYC എന്നിവയാണ്. നിങ്ങളുടെ ആധാർ നമ്പർ, സോഷ്യൽ മീഡിയ, ' +
        'ലൊക്കേഷൻ, കോൺടാക്റ്റുകൾ എന്നിവ ഞാൻ നോക്കില്ല. ഈ സമ്മതം പരിമിത പരിധിയിലുള്ളതാണ്, 15 മിനിറ്റിൽ കാലഹരണപ്പെടും, എപ്പോൾ വേണമെങ്കിലും പിൻവലിക്കാം. ' +
        'നിങ്ങൾ സമ്മതിക്കുന്നുണ്ടോ? (അതെ — സമ്മതം രേഖപ്പെടുത്തി പരിശോധനകൾ തുടങ്ങും; ഇല്ല — എനിക്ക് ഈ ഡാറ്റ എടുക്കാനാവില്ല.)',
    };
    const content = scripts[lang] ?? scripts.english;
    return [
      { role: 'user', content: `Give me the consent script to read to the applicant (${lang}).` },
      { role: 'assistant', content },
    ];
  }
}
