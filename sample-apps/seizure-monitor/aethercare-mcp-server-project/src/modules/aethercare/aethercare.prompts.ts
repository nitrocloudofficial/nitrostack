import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class AetherCarePrompts {

  @Prompt({
    name: 'illegal_cash_demand_negotiator',
    description: 'Step-by-step negotiation script for distressed relatives standing at hospital billing desks when staff demand upfront cash.',
    arguments: [
      {
        name: 'hospital_name',
        description: 'Name of hospital demanding cash deposit',
        required: true
      },
      {
        name: 'demanded_amount_inr',
        description: 'Amount of cash deposit demanded in INR',
        required: true
      }
    ]
  })
  async illegalCashDemandNegotiator(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Executing cash demand negotiator prompt', args);

    const hospital = args?.hospital_name || 'Hospital Desk';
    const amount = args?.demanded_amount_inr || 25000;

    return [
      {
        role: 'user' as const,
        content: `I am at ${hospital} billing counter. They are demanding ₹${amount} upfront cash deposit despite our PM-JAY cashless card. Give me a polite but firm script to read to the billing manager right now.`
      },
      {
        role: 'assistant' as const,
        content: `Here is your step-by-step emergency billing counter script:
1. "Sir/Madam, under Section 16 of NHA Guidelines, demanding cash from a PM-JAY beneficiary is strictly prohibited."
2. "Please connect me to your Ayushman Mitra helpdesk coordinator to register electronic pre-auth."
3. "If you refuse cashless admission, I am lodging an instant grievance on NHA National Portal (Ref 14555) right now."`
      }
    ];
  }

  @Prompt({
    name: 'pharmacy_overcharge_audit',
    description: 'Assistant prompt for checking pharmacy medicine bill receipts against National List of Essential Medicines (NLEM 2026) price caps.',
    arguments: [
      {
        name: 'medicine_name',
        description: 'Name of medicine (e.g. "Dolo 650", "Human Insulin")',
        required: true
      },
      {
        name: 'price_charged_per_unit_inr',
        description: 'Price charged per tablet or vial in INR',
        required: true
      }
    ]
  })
  async pharmacyOverchargeAudit(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Executing pharmacy overcharge audit prompt', args);

    const medicine = args?.medicine_name || 'Medicine';
    const price = args?.price_charged_per_unit_inr || 10;

    return [
      {
        role: 'user' as const,
        content: `Hospital pharmacy charged me ₹${price} per unit for ${medicine}. Please verify if this exceeds the statutory NLEM ceiling price.`
      },
      {
        role: 'assistant' as const,
        content: `Initiating NLEM drug price audit for ${medicine} at ₹${price}/unit against National Pharmaceutical Pricing Authority (NPPA) ceiling rules.`
      }
    ];
  }

  @Prompt({
    name: 'multilingual_patient_voice_assistant',
    description: 'Multilingual conversational assistant supporting Hindi, Tamil, Telugu, Marathi, Bengali, and English voice/text guidance for semi-literate citizens.',
    arguments: [
      {
        name: 'preferred_language',
        description: 'Preferred language (e.g., "Hindi", "Tamil", "Marathi", "English")',
        required: true
      },
      {
        name: 'patient_query',
        description: 'Spoken voice or text input from citizen',
        required: true
      }
    ]
  })
  async multilingualPatientVoiceAssistant(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Executing multilingual patient voice prompt', args);

    const lang = args?.preferred_language || 'Hindi';
    const query = args?.patient_query || 'Ayushman card enquiry';

    return [
      {
        role: 'user' as const,
        content: `Language: ${lang}\nPatient Query: ${query}\n\nPlease respond in ${lang} with plain-language, compassionate guidance on PM-JAY entitlement, legal price caps, and hospital cashless verification.`
      },
      {
        role: 'assistant' as const,
        content: `Namaste / Vanakkam! I am AetherCare. I will guide you step-by-step in ${lang} without any technical jargon so you get 100% free cashless treatment under Ayushman Bharat.`
      }
    ];
  }

  @Prompt({
    name: 'patient_intake_triage',
    description: 'Empathetic assistant prompt guiding distressed patients during emergency hospital intake.',
    arguments: [
      {
        name: 'patient_condition',
        description: 'Short description of patient medical emergency or procedure required',
        required: true
      },
      {
        name: 'hospital_name',
        description: 'Name of hospital patient is visiting',
        required: false
      }
    ]
  })
  async patientIntakeTriage(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Executing patient intake triage prompt', args);

    const condition = args?.patient_condition || 'Medical Emergency';
    const hospital = args?.hospital_name;

    return [
      {
        role: 'user' as const,
        content: `My family member requires immediate treatment for: ${condition}.${hospital ? ` We are currently at ${hospital}.` : ''} Please check empanelment, legal price caps, and tell us step-by-step what to do.`
      },
      {
        role: 'assistant' as const,
        content: `I am AetherCare, your AI Healthcare Navigator. Let me assist you step-by-step:
1. I will search the hospital empanelment status to confirm if cashless admission is active under PM-JAY / CGHS.
2. I will verify if your procedure or device (such as cardiac stents or ICU beds) has a legally mandated NPPA price cap.
3. I will generate your pre-authorization document checklist (Aadhaar, Ration Card, Doctor Requisition).`
      }
    ];
  }

  @Prompt({
    name: 'claim_audit_assistant',
    description: 'B2B workflow prompt for clinic reception desks, NGOs, and insurance auditors inspecting pre-authorization quotes.',
    arguments: [
      {
        name: 'claimed_amount_inr',
        description: 'Total estimate price quoted by hospital in INR',
        required: true
      },
      {
        name: 'procedure_name',
        description: 'Medical procedure or device being billed',
        required: true
      }
    ]
  })
  async claimAuditAssistant(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Executing claim audit prompt', args);

    const amount = args?.claimed_amount_inr || 0;
    const procedure = args?.procedure_name || 'Medical Procedure';

    return [
      {
        role: 'user' as const,
        content: `Audit the following hospital quote:
Procedure/Device: ${procedure}
Quoted Estimate: ₹${amount}

Run a price cap verification and bill fraud risk analysis immediately.`
      },
      {
        role: 'assistant' as const,
        content: `Initiating AetherCare Anti-Fraud Compliance Audit for ${procedure} at ₹${amount}. I will compare this quote against official NPPA price ceilings under DPCO 2013.`
      }
    ];
  }
}
