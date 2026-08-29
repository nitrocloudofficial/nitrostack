/**
 * MCP prompts — reusable officer workflows.
 *
 * ---------------------------------------------------------------------------
 * WHAT A PROMPT IS FOR HERE
 * ---------------------------------------------------------------------------
 * A prompt is a named, parameterised starting point that a client surfaces as a
 * slash-command. It is where domain expertise about HOW TO ASK lives.
 *
 * That is worth having in a government workflow specifically because the quality
 * of a verification review depends on asking in the right order. An officer who
 * types "is this fraud?" gets a worse answer than one who asks for the checklist,
 * the citations and the applicant-facing questions in sequence. Encoding the good
 * sequence once, as a prompt, means every officer gets the senior officer's
 * method rather than their own improvisation.
 *
 * Three prompts, matching the three things an officer actually produces:
 *
 *   officer-briefing      the two-minute readout before opening a file
 *   fraud-ring-memo       the escalation memo when a cluster is found
 *   clarification-letter  the letter to the applicant when something is missing
 *
 * ---------------------------------------------------------------------------
 * PROMPTS INSTRUCT, THEY DO NOT DECIDE
 * ---------------------------------------------------------------------------
 * Every prompt below explicitly tells the model it is preparing material for a
 * human decision and must not state a verdict as though it were one. The system
 * guarantees this structurally too — officer_decide is guarded and the agent has
 * no route to it — but a prompt that invited a verdict would still produce
 * officer-facing text that reads like one, and an officer under time pressure
 * would reasonably act on it. Defence in depth applies to language, not only to
 * code paths.
 *
 * Handlers receive `(args, context)` and return MCP prompt messages.
 */
import { Injectable, PromptDecorator } from '@nitrostack/core';

interface PromptMessage {
  role: 'user' | 'assistant';
  content: { type: 'text'; text: string };
}

interface PromptResponse {
  description: string;
  messages: PromptMessage[];
}

function userMessage(text: string): PromptMessage {
  return { role: 'user', content: { type: 'text', text } };
}

/** Read one string argument, tolerating the loose arg shapes clients send. */
function arg(args: unknown, key: string): string {
  const record =
    args && typeof args === 'object' && !Array.isArray(args)
      ? (args as Record<string, unknown>)
      : {};
  const value = record[key];
  return typeof value === 'string' ? value.trim() : '';
}

@Injectable()
export class OfficerPrompts {
  /**
   * The pre-review briefing.
   *
   * Orders the investigation deliberately: establish the file, then the network,
   * then the citations, then the questions. Network before citations matters —
   * knowing an applicant sits in a ring of four changes which rule violations are
   * worth reading closely.
   */
  @PromptDecorator({
    name: 'officer-briefing',
    title: 'Officer briefing for an application',
    description:
      'Prepare the two-minute briefing an officer should read before opening an application: ' +
      'what the file contains, what the network around it looks like, which rules fired with ' +
      'their citations, and what to ask the applicant. Runs the agent if needed.',
    arguments: [
      {
        name: 'applicationId',
        description: 'The application to brief on, e.g. PIQ-2026-2001.',
        required: true,
      },
      {
        name: 'officerName',
        description: 'Name of the officer, used to address the briefing.',
        required: false,
      },
    ],
  })
  async officerBriefing(args: unknown): Promise<PromptResponse> {
    const applicationId = arg(args, 'applicationId') || '<applicationId>';
    const officerName = arg(args, 'officerName');

    return {
      description: `Officer briefing for ${applicationId}`,
      messages: [
        userMessage(
          `You are assisting ${
            officerName ? `Officer ${officerName}` : 'a passport verification officer'
          } who is about to review application ${applicationId}. Prepare their briefing.\n\n` +
            `Work in this order — it matters, because the network context changes how the rule ` +
            `violations should be read:\n\n` +
            `1. Call agent_investigate on ${applicationId} with goal 'assess_application'. This ` +
            `runs the autonomous investigation and gives you the full evidence base plus the ` +
            `agent's reasoning trace.\n\n` +
            `2. Read the resource passportiq://rulebook so that every finding you report can be ` +
            `tied to its citation. Never describe a violation without its rule id and clause.\n\n` +
            `3. Write the briefing with these sections, in this order:\n` +
            `   • THE FILE — applicant, application type, documents present, anything missing or ` +
            `expired.\n` +
            `   • THE NETWORK — is this applicant linked to others? If so: how many, by which ` +
            `shared identifiers, and does the overlap pattern look coordinated or coincidental? ` +
            `Say which, and say why.\n` +
            `   • THE FINDINGS — each rule that fired, worst severity first, with rule id, ` +
            `citation and the specific evidence. If any rule could NOT be checked because an ` +
            `upstream stage did not run, say so explicitly — "we did not check" must never be ` +
            `reported as "it passed".\n` +
            `   • THE SCORE — the number, the band, and the confidence. If confidence is below ` +
            `0.7, lead with that caveat rather than burying it.\n` +
            `   • QUESTIONS FOR THE APPLICANT — specific, answerable questions that would ` +
            `resolve the ambiguity. Not "explain the discrepancy" but "your Aadhaar shows ` +
            `<address A> and your utility bill shows <address B> — when did you move?"\n` +
            `   • WHAT THE AGENT RECOMMENDS — and be explicit that it is a recommendation for ` +
            `the officer to weigh, not a decision.\n\n` +
            `Constraints: be concise enough to read in two minutes. Do not state a verdict. Do ` +
            `not soften a network finding to sound balanced — if four applications share a ` +
            `photograph, say so plainly. Any photograph similarity flag is ADVISORY and is not a ` +
            `biometric identity match; label it that way every time you mention it.`
        ),
      ],
    };
  }

  /**
   * The escalation memo.
   *
   * Deliberately demands the queue-wide sweep rather than a single-file run: a
   * ring memo written from one application understates the ring, and an
   * understated ring gets closed.
   */
  @PromptDecorator({
    name: 'fraud-ring-memo',
    title: 'Fraud ring escalation memo',
    description:
      'Draft the escalation memo for a suspected coordinated fraud ring: who is involved, what ' +
      'they share, why coincidence does not explain it, and what a supervisor should do next. ' +
      'Correlates across the whole queue rather than a single file.',
    arguments: [
      {
        name: 'applicationId',
        description: 'The application that triggered the suspicion.',
        required: true,
      },
      {
        name: 'officerName',
        description: 'Officer raising the memo.',
        required: false,
      },
    ],
  })
  async fraudRingMemo(args: unknown): Promise<PromptResponse> {
    const applicationId = arg(args, 'applicationId') || '<applicationId>';
    const officerName = arg(args, 'officerName');

    return {
      description: `Fraud ring escalation memo originating from ${applicationId}`,
      messages: [
        userMessage(
          `A coordinated fraud ring is suspected around application ${applicationId}. Draft the ` +
            `escalation memo${officerName ? ` for Officer ${officerName} to sign` : ''}.\n\n` +
            `Gather the evidence first:\n\n` +
            `1. Call agent_investigate on ${applicationId} with goal 'investigate_fraud_signal'.\n` +
            `2. Call agent_triage_queue. This is not optional — a ring memo written from one ` +
            `file will understate the ring, because the correlation that proves coordination ` +
            `only exists across the queue. Use its detectedRings output.\n` +
            `3. Call build_risk_graph on ${applicationId} for the cluster structure and density.\n\n` +
            `Then write the memo:\n\n` +
            `   • SUBJECT — one line naming the number of applications implicated.\n` +
            `   • MEMBERS — every application id and applicant name in the cluster, with each ` +
            `one's own risk score.\n` +
            `   • SHARED IDENTIFIERS — exactly what is shared, and between which pairs. Be ` +
            `specific: "phone +91-XXXXX appears on 2001, 2002 and 2003" not "contact details ` +
            `overlap".\n` +
            `   • WHY THIS IS NOT COINCIDENCE — the central argument. Address the innocent ` +
            `explanations honestly: family members do share addresses, and a cyber-café ` +
            `operator's phone number does appear on many legitimate forms. Then explain what ` +
            `makes THIS pattern different — typically the NUMBER of independent identifier types ` +
            `overlapping across the SAME set of applications, and cluster density. If the ` +
            `evidence does not actually support a ring, say so and recommend closing the ` +
            `suspicion. A memo that manufactures a case is worse than no memo.\n` +
            `   • RECOMMENDED ACTIONS — concrete and assignable: which files to hold, which ` +
            `applicants to call for in-person verification, whether the pattern warrants ` +
            `referral beyond this office.\n` +
            `   • EVIDENCE APPENDIX — the rule ids and citations behind each claim.\n\n` +
            `Tone: factual and restrained. This memo may be read by people deciding whether to ` +
            `investigate citizens, so overstatement has a real cost. State that any photograph ` +
            `similarity flag is advisory and NOT a biometric match. Do not recommend a final ` +
            `outcome for any individual application — that remains each reviewing officer's ` +
            `decision.`
        ),
      ],
    };
  }

  /**
   * The applicant-facing letter.
   *
   * The one output that reaches a citizen, which is why the prompt is emphatic
   * about not implying suspicion: most clarification requests resolve innocently,
   * and a letter that presumes guilt is both unfair and produces worse responses.
   */
  @PromptDecorator({
    name: 'clarification-letter',
    title: 'Applicant clarification letter',
    description:
      'Draft a courteous, specific letter asking an applicant to clarify or supply what is ' +
      'missing — written so it can be sent to a citizen without implying they are suspected of ' +
      'anything.',
    arguments: [
      {
        name: 'applicationId',
        description: 'The application needing clarification.',
        required: true,
      },
      {
        name: 'language',
        description: "Language for the letter, e.g. 'English' or 'Hindi'. Defaults to English.",
        required: false,
      },
    ],
  })
  async clarificationLetter(args: unknown): Promise<PromptResponse> {
    const applicationId = arg(args, 'applicationId') || '<applicationId>';
    const language = arg(args, 'language') || 'English';

    return {
      description: `Clarification letter for ${applicationId}`,
      messages: [
        userMessage(
          `Draft a clarification letter to the applicant of ${applicationId}, in ${language}.\n\n` +
            `First establish what is actually needed: call agent_investigate on ${applicationId}, ` +
            `then read the officer checklist and the questions in the explain_risk output. Ask ` +
            `only for what is genuinely missing or genuinely ambiguous.\n\n` +
            `Write the letter on behalf of the Ministry of External Affairs, Government of ` +
            `India. Requirements:\n\n` +
            `   • Open by acknowledging the application, with its reference number and the date ` +
            `it was submitted.\n` +
            `   • State plainly that the application is under review and that further ` +
            `information is required to proceed. Do NOT imply wrongdoing, suspicion or fraud. ` +
            `Most clarification requests resolve innocently — a name spelled differently across ` +
            `two documents is usually a transliteration difference, not a lie — and a letter ` +
            `that presumes guilt is both unfair and produces defensive, less useful replies.\n` +
            `   • List each required item as a numbered point, each one specific enough to act ` +
            `on without a phone call. "A document showing your current address" is actionable; ` +
            `"address proof discrepancy" is not.\n` +
            `   • Where two documents disagree, quote both values and ask which is current. Do ` +
            `not assume which one is wrong.\n` +
            `   • Give a response window (30 days) and say how to respond.\n` +
            `   • Close with the office contact and a reference number.\n\n` +
            `Never mention internal risk scores, rule ids, cluster findings, other applicants, ` +
            `or the existence of an automated system. Those are internal. The letter must read ` +
            `as ordinary, respectful administrative correspondence, because that is what the ` +
            `recipient is entitled to.`
        ),
      ],
    };
  }
}
