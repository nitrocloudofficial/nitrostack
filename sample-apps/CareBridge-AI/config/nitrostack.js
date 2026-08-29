// config/nitrostack.js - MOCK MODE (Demo Ready)
// Returns realistic responses like your real AI agents

export async function callTool(toolName, args = {}) {
  console.log(`[MOCK] Tool called: ${toolName}`, args);
  await new Promise(r => setTimeout(r, 500)); // Simulate network delay
  
  switch(toolName) {
    case 'symptom-guidance':
      return {
        success: true,
        output: `**Urgency Level: HIGH**

**Possible Causes:**
• Viral infection or influenza
• Migraine with associated symptoms
• Dehydration

**Recommended Action:**
• Seek medical attention if fever exceeds 102°F (39°C)
• Rest and hydrate adequately
• Monitor for neck stiffness or confusion (red flags)
• Consider OTC fever reducers

**This is not a substitute for professional medical advice.**`
      };
      
    case 'ocr-extractor':
      return {
        success: true,
        output: `Extracted Lab Values:
• Fasting Glucose: 142 mg/dL [HIGH]
• HbA1c: 7.1% [HIGH]
• Total Cholesterol: 245 mg/dL [HIGH]
• LDL: 162 mg/dL [HIGH]
• HDL: 38 mg/dL [LOW]
• Triglycerides: 210 mg/dL [HIGH]`
      };
      
    case 'report-analysis':
      return {
        success: true,
        output: `**Your Lab Results Explained:**

**Blood Sugar (142 mg/dL - HIGH):** Your fasting sugar is elevated. This suggests insulin resistance.

**HbA1c (7.1% - HIGH):** Indicates average blood sugar has been high over 3 months.

**Action Items:**
• Schedule endocrinologist appointment
• Reduce sugar/refined carbs
• Daily 30-minute walks

**This is not a substitute for professional medical advice.**`
      };
      
    case 'trend-analysis':
      return {
        success: true,
        output: `**Health Trend Comparison:**

**Worsening Markers:**
• Glucose: 128 → 142 mg/dL (↑ 11%)
• HbA1c: 6.4% → 7.1% (↑ 11%)
• Triglycerides: 180 → 210 mg/dL (↑ 17%)

**Assessment:** Metabolic markers trending negatively. Lifestyle intervention recommended.`
      };
      
    case 'health-summary':
      return {
        success: true,
        output: `**Doctor-Ready Summary**

**Patient:** 28-year-old male
**Symptoms:** Severe headache, fever (3 days)
**Key Findings:** Elevated glucose (142), HbA1c 7.1%, dyslipidemia
**Current Meds:** None

**Recommendation:** Evaluate for acute viral illness + metabolic workup.`
      };
      
    case 'emergency-guidance':
    case 'first-aid':
      const situation = args.situation?.toLowerCase() || '';
      let specificAdvice = '';
      
      if (situation.includes('bleed') || situation.includes('cut') || situation.includes('wound')) {
        specificAdvice = `**Immediate Actions for Bleeding:**
• Apply direct pressure with clean cloth or sterile gauze
• Elevate injured area above heart level if possible
• Do NOT remove embedded objects (stabilize them)
• If severe, apply tourniquet 2-3 inches above wound (loosen every 10 min)`;
      } else if (situation.includes('burn') || situation.includes('fire') || situation.includes('hot')) {
        specificAdvice = `**Immediate Actions for Burns:**
• Cool with cool (not cold) running water for 10-20 minutes
• Do NOT apply ice, butter, ointments, or creams
• Cover with sterile non-stick bandage or clean cloth
• Remove jewelry near burned area before swelling starts`;
      } else if (situation.includes('choke') || situation.includes('choking') || situation.includes('breathe')) {
        specificAdvice = `**Immediate Actions for Choking:**
• Encourage coughing if able to breathe/cough
• If cannot breathe: Perform abdominal thrusts (Heimlich maneuver)
• Stand behind person, wrap arms around waist
• Make fist above navel, thrust upward sharply
• Call emergency services immediately`;
      } else if (situation.includes('fracture') || situation.includes('broken') || situation.includes('bone')) {
        specificAdvice = `**Immediate Actions for Fractures:**
• Do NOT try to straighten or realign the bone
• Immobilize the area using splint or rigid material
• Apply ice packs wrapped in cloth (15 min on, 15 min off)
• Elevate if possible to reduce swelling
• Check circulation below injury (fingers/toes)`;
      } else if (situation.includes('faint') || situation.includes('unconscious') || situation.includes('passed out')) {
        specificAdvice = `**Immediate Actions for Unconsciousness:**
• Check breathing and pulse
• If breathing: Place in recovery position (on side)
• If not breathing: Begin CPR immediately
• Loosen tight clothing around neck/chest
• Do NOT give food or water`;
      } else {
        specificAdvice = `**General First Aid Steps:**
• Keep patient calm and lying down
• Monitor breathing and consciousness
• Loosen tight clothing
• Keep warm with blanket
• Do NOT give food or drink`;
      }
      
      return {
        success: true,
        output: `**🚨 EMERGENCY FIRST AID GUIDANCE**

${specificAdvice}

**⚠️ CALL EMERGENCY SERVICES (108/911) IF:**
• Severe bleeding that won't stop after 10 min pressure
• Difficulty breathing or chest pain
• Loss of consciousness or seizures
• Signs of stroke (Face drooping, Arm weakness, Speech slurred)
• Severe allergic reaction (swelling, hives, breathing difficulty)
• Head injury with confusion or vomiting

**While Waiting for Help:**
• Keep person warm and comfortable
• Do NOT move them unless in immediate danger
• Gather: Medical history, medications list, allergies
• Clear area for emergency responders
• Stay on phone with dispatcher for instructions

**⚠️ DISCLAIMER: This is temporary first aid only. Seek professional medical help immediately!**`
      };
      
    default:
      return { success: false, error: "Tool not found" };
  }
}