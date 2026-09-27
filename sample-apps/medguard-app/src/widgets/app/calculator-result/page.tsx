'use client';

import { useEffect, useMemo, useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdphnbtmbaacfdrzxqbw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcGhuYnRtYmFhY2Zkcnp4cWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5OTUyMjcsImV4cCI6MjEwMDU3MTIyN30.O_DJ1CwwRxNXCvm0untVRL7E-ETWhdVFqWCKHkbO_2g';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Step = 'user-type' | 'new-id' | 'new-profile' | 'old-login' | 'dashboard' | 'calendar' | 'report' | 'chatbot' | 'patient-profile' | 'primary-treatment' | 'primary-drug' | 'secondary-treatment' | 'secondary-drug' | 'result';
type TreatmentKey = 'topical-steroid' | 'antifungal' | 'immunosuppressant' | 'antibiotic' | 'antihistamine' | 'anticoagulant' | 'antihypertensive' | 'diuretic' | 'anticonvulsant' | 'corticosteroid' | 'other';
type AgeRange = '0-17' | '18-39' | '40-64' | '65+';
type SexOption = 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';
type WeightRange = '<50' | '50-70' | '70-90' | '90+';

type TreatmentOption = {
  id: TreatmentKey;
  label: string;
  description: string;
};

const treatmentOptions: TreatmentOption[] = [
  { id: 'topical-steroid', label: 'Topical steroid', description: 'Local anti-inflammatory treatment' },
  { id: 'antifungal', label: 'Antifungal', description: 'Treatment for superficial fungal infection' },
  { id: 'immunosuppressant', label: 'Immunosuppressant', description: 'Anti-inflammatory or immune-modulating therapy' },
  { id: 'antibiotic', label: 'Antibiotic', description: 'Antibacterial therapy' },
  { id: 'antihistamine', label: 'Antihistamine', description: 'Allergy or itch control' },
  { id: 'anticoagulant', label: 'Anticoagulant / Antiplatelet', description: 'Blood thinning therapy' },
  { id: 'antihypertensive', label: 'Antihypertensive', description: 'Blood pressure therapy' },
  { id: 'diuretic', label: 'Diuretic', description: 'Fluid management therapy' },
  { id: 'anticonvulsant', label: 'Anticonvulsant', description: 'Seizure or neuropathic pain therapy' },
  { id: 'corticosteroid', label: 'Systemic Corticosteroid', description: 'Systemic anti-inflammatory therapy' },
  { id: 'other', label: 'Other Treatment', description: 'Other drug classes / chronic condition therapies' },
];

const drugCatalog: Record<TreatmentKey, string[]> = {
  'topical-steroid': ['Hydrocortisone', 'Betamethasone', 'Clobetasol'],
  antifungal: ['Terbinafine', 'Ketoconazole', 'Fluconazole'],
  immunosuppressant: ['Ciclosporin', 'Tacrolimus', 'Methotrexate'],
  antibiotic: ['Amoxicillin', 'Azithromycin', 'Cefalexin'],
  antihistamine: ['Cetirizine', 'Hydroxyzine', 'Loratadine'],
  anticoagulant: ['Warfarin', 'Clopidogrel', 'Aspirin'],
  antihypertensive: ['Lisinopril', 'Losartan', 'Amlodipine', 'Carvedilol'],
  diuretic: ['Furosemide', 'Spironolactone'],
  anticonvulsant: ['Levetiracetam', 'Gabapentin'],
  corticosteroid: ['Prednisone'],
  other: ['Metformin', 'Atorvastatin', 'Levothyroxine', 'Sertraline', 'Omeprazole', 'Insulin Glargine', 'Albuterol'],
};

const ageOptions: AgeRange[] = ['0-17', '18-39', '40-64', '65+'];
const sexOptions: SexOption[] = ['male', 'female', 'non-binary', 'prefer-not-to-say'];
const weightOptions: WeightRange[] = ['<50', '50-70', '70-90', '90+'];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function levenshteinDistance(a: string, b: string) {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
}

function getClosestDrugName(input: string, options: string[]) {
  const cleaned = normalize(input);
  if (!cleaned) return null;
  const scored = options
    .map((option) => {
      const optionKey = normalize(option);
      const distance = levenshteinDistance(cleaned, optionKey);
      return { option, distance, score: optionKey.includes(cleaned) ? 0 : distance };
    })
    .sort((a, b) => a.score - b.score);
  const best = scored[0];
  if (!best) return null;
  if (best.score <= 3) return best.option;
  return null;
}

const ALLERGY_OPTIONS = [
  'Penicillins',
  'Sulfa drugs',
  'NSAIDs',
  'ACE Inhibitors',
  'Aspirin',
  'Contrast dye',
  'Opioids',
  'Cephalosporins'
];

const drugToClassMap: Record<string, string[]> = {
  // Common antibiotics
  'amoxicillin': ['penicillin', 'penicillins', 'antibiotic'],
  'cephalexin': ['cephalosporin', 'cephalosporins', 'antibiotic'],
  'sulfamethoxazole': ['sulfa', 'sulfa drugs', 'antibiotic'],
  // NSAIDs
  'ibuprofen': ['nsaid', 'nsaids', 'painkiller'],
  'naproxen': ['nsaid', 'nsaids', 'painkiller'],
  'diclofenac': ['nsaid', 'nsaids', 'painkiller'],
  'aspirin': ['nsaid', 'nsaids', 'antiplatelet', 'painkiller', 'anticoagulant'],
  // Diuretics
  'furosemide': ['diuretic', 'loop diuretic', 'diuretics'],
  'spironolactone': ['diuretic', 'potassium-sparing diuretic', 'diuretics'],
  // ACE Inhibitors / ARBs
  'lisinopril': ['ace inhibitor', 'acei', 'antihypertensive'],
  'ramipril': ['ace inhibitor', 'acei', 'antihypertensive'],
  'losartan': ['arb', 'angiotensin receptor blocker', 'antihypertensive'],
  // Contrast
  'iodinated contrast': ['contrast', 'contrast dye', 'iodinated contrast dye'],
  'contrast dye': ['contrast', 'contrast dye', 'iodinated contrast dye'],
  // Immunosuppressants
  'methotrexate': ['immunosuppressant', 'dmard'],
  'ciclosporin': ['immunosuppressant', 'calcineurin inhibitor'],
  'cyclosporine': ['immunosuppressant', 'calcineurin inhibitor'],
  'tacrolimus': ['immunosuppressant', 'calcineurin inhibitor'],
  // Anticoagulants / Antiplatelets
  'warfarin': ['anticoagulant'],
  'clopidogrel': ['antiplatelet', 'anticoagulant'],
  // Beta blockers
  'carvedilol': ['beta-blocker', 'beta blocker'],
  // Calcium Channel Blockers
  'amlodipine': ['calcium channel blocker', 'ccb'],
  // Corticosteroids
  'prednisone': ['corticosteroid', 'steroid'],
};

function matchesDrugOrClass(patientDrug: string, ruleTarget: string): boolean {
  const pDrugClean = patientDrug.toLowerCase().trim();
  const ruleTargetClean = ruleTarget.toLowerCase().trim();
  
  if (!pDrugClean || !ruleTargetClean) return false;
  
  if (pDrugClean.includes(ruleTargetClean) || ruleTargetClean.includes(pDrugClean)) {
    return true;
  }
  
  const classes = drugToClassMap[pDrugClean] || [];
  for (const cls of classes) {
    if (ruleTargetClean.includes(cls) || cls.includes(ruleTargetClean)) {
      return true;
    }
  }
  
  return false;
}

function getCountdown(dateStr: string) {
  const target = new Date(dateStr).getTime();
  const now = new Date().getTime();
  const diff = target - now;
  if (diff < 0) return 'Past due';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`;
  return 'less than an hour';
}

function generateSurvey(comorbidities: string) {
  const isDiabetes = comorbidities.toLowerCase().includes('diabet');
  const isCKD = comorbidities.toLowerCase().includes('kidney') || comorbidities.toLowerCase().includes('ckd');
  const isHTN = comorbidities.toLowerCase().includes('hypertension') || comorbidities.toLowerCase().includes('blood pressure');
  
  const questions = [];
  
  if (isDiabetes) {
    questions.push({ q: "How often did you check your blood sugar this week?", options: ["Daily", "2-3 times", "Rarely", "Never"] });
    questions.push({ q: "Have you experienced unusual thirst or frequent urination?", options: ["No, normal", "Slightly more", "Yes, significantly", "Not sure"] });
    questions.push({ q: "Did you check your feet for any cuts or sores?", options: ["Yes, daily", "A few times", "No", "Only when painful"] });
  }
  if (isCKD) {
    questions.push({ q: "Have you noticed increased swelling in your legs or ankles?", options: ["None", "Slight swelling", "Moderate", "Severe"] });
    questions.push({ q: "How has your urine output been this week?", options: ["Normal", "Decreased", "Increased", "Dark or foamy"] });
    questions.push({ q: "Have you experienced unusual fatigue or weakness?", options: ["No", "Occasionally", "Often", "Constant"] });
  }
  if (isHTN) {
    questions.push({ q: "Did you monitor your blood pressure at home?", options: ["Yes, daily", "Sometimes", "No", "Don't have a monitor"] });
    questions.push({ q: "Have you had any persistent headaches or dizziness?", options: ["No", "Rarely", "Frequently", "Severe"] });
    questions.push({ q: "How would you rate your salt intake this week?", options: ["Very low", "Moderate", "High", "Very high"] });
  }

  // General fallback questions to ensure exactly 10 questions
  const generalQuestions = [
    { q: "How would you rate your overall energy level this week?", options: ["Excellent", "Good", "Fair", "Poor"] },
    { q: "How many hours of sleep did you average per night?", options: ["7-9 hours", "5-6 hours", "Less than 5", "More than 9"] },
    { q: "Did you experience any new or unexplained pain?", options: ["None", "Mild", "Moderate", "Severe"] },
    { q: "How would you describe your stress levels?", options: ["Low", "Manageable", "High", "Overwhelming"] },
    { q: "Did you remember to take all prescribed medications?", options: ["Always", "Missed 1-2 doses", "Missed several", "Not applicable"] },
    { q: "How was your appetite over the past 7 days?", options: ["Normal", "Increased", "Decreased", "Poor"] },
    { q: "Did you engage in physical activity (e.g., walking, exercise)?", options: ["Almost daily", "A few times", "Rarely", "Not at all"] },
    { q: "Have you felt unusually short of breath?", options: ["No", "With exertion", "While resting", "Often"] },
    { q: "How much water did you drink daily on average?", options: ["More than 8 glasses", "4-7 glasses", "1-3 glasses", "Hardly any"] },
    { q: "Did you experience any nausea or digestive issues?", options: ["No", "Mild", "Moderate", "Severe"] }
  ];

  while (questions.length < 10) {
    const nextQ = generalQuestions.shift();
    if (nextQ) questions.push(nextQ);
  }

  return questions.slice(0, 10);
}

function matchesCombination(allDrugs: string[], ruleCombination: string, comorbidities: string, eGFR: number | null): boolean {
  const comboClean = ruleCombination.toLowerCase().trim();
  if (!comboClean) return false;
  
  if (comboClean.includes('+') || comboClean.includes(' and ')) {
    const separators = comboClean.includes('+') ? '+' : ' and ';
    const parts = comboClean.split(separators).map(p => p.trim());
    return parts.every(part => {
      const drugMatch = allDrugs.some(d => matchesDrugOrClass(d, part));
      const renalMatch = (part.includes('egfr') || part.includes('renal') || part.includes('kidney') || part.includes('ckd')) &&
                         ((eGFR !== null && eGFR < 60) || comorbidities.toLowerCase().includes('ckd') || comorbidities.toLowerCase().includes('kidney'));
      return drugMatch || renalMatch;
    });
  }
  
  const drugMatch = allDrugs.some(d => matchesDrugOrClass(d, ruleCombination));
  const renalMatch = (comboClean.includes('egfr') || comboClean.includes('renal') || comboClean.includes('kidney') || comboClean.includes('ckd')) &&
                     ((eGFR !== null && eGFR < 60) || comorbidities.toLowerCase().includes('ckd') || comorbidities.toLowerCase().includes('kidney'));
  return drugMatch || renalMatch;
}

function matchesDisease(comorbidities: string, eGFR: number | null, ruleDisease: string): boolean {
  const diseaseClean = ruleDisease.toLowerCase().trim();
  const comorbClean = comorbidities.toLowerCase().trim();
  
  if (!diseaseClean) return false;
  
  if (diseaseClean.includes('ckd') || diseaseClean.includes('kidney') || diseaseClean.includes('renal')) {
    if (eGFR !== null && eGFR < 60) return true;
    if (comorbClean.includes('ckd') || comorbClean.includes('kidney') || comorbClean.includes('renal')) return true;
  }
  
  if (diseaseClean.includes('diabetes') || diseaseClean.includes('diabetic')) {
    if (comorbClean.includes('diabetes') || comorbClean.includes('diabetic') || comorbClean.includes('dm')) return true;
  }

  if (diseaseClean.includes('hypertension') || diseaseClean.includes('hypertensive')) {
    if (comorbClean.includes('hypertension') || comorbClean.includes('hypertensive') || comorbClean.includes('bp')) return true;
  }
  
  return comorbClean.includes(diseaseClean) || diseaseClean.includes(comorbClean);
}

function evaluateSafety(params: {
  patientName: string;
  ageRange: AgeRange;
  sex: SexOption;
  weightRange: WeightRange;
  allergies: string;
  comorbidities: string;
  indication: string;
  primaryTreatment: TreatmentKey | null;
  primaryDrug: string;
  secondaryTreatment: TreatmentKey | null;
  secondaryDrug?: string;
  eGFR?: number | null;
  activeMedications?: string[];
  dbRules?: any[];
}) {
  const primary = (params.primaryDrug || '').toLowerCase();
  const secondary = (params.secondaryDrug || '').toLowerCase();
  const pastDrugs = (params.activeMedications || []).map(d => d.toLowerCase());
  const allDrugs = [primary, secondary, ...pastDrugs].filter(Boolean);

  let matchedRule: any = null;

  if (params.dbRules && params.dbRules.length > 0) {
    for (const rule of params.dbRules) {
      const ruleDrug = rule.drug || '';
      const ruleCombination = rule.combination || '';
      const ruleDisease = rule.disease || '';

      const drugMatches = allDrugs.some(d => matchesDrugOrClass(d, ruleDrug));
      
      if (drugMatches) {
        if (ruleCombination) {
          const otherDrugs = allDrugs.filter(d => !matchesDrugOrClass(d, ruleDrug));
          const combinationMatches = matchesCombination(otherDrugs, ruleCombination, params.comorbidities, params.eGFR ?? null);

          if (combinationMatches) {
            matchedRule = rule;
            break;
          }
        } else if (ruleDisease) {
          const diseaseMatches = matchesDisease(params.comorbidities, params.eGFR ?? null, ruleDisease);
          if (diseaseMatches) {
            matchedRule = rule;
            break;
          }
        } else {
          matchedRule = rule;
          break;
        }
      }
    }
  }

  const hasNephrotoxic = allDrugs.some((drug) => ['ciclosporin', 'tacrolimus', 'methotrexate'].includes(drug));
  const hasCombinationRisk = 
    params.primaryTreatment === 'immunosuppressant' || 
    params.secondaryTreatment === 'immunosuppressant' ||
    pastDrugs.length > 0;

  // Check for allergy match
  const patientAllergies = params.allergies ? params.allergies.toLowerCase().split(',').map(a => a.trim()) : [];
  const allergyMatch = allDrugs.find(drug => {
    return patientAllergies.some(allergy => matchesDrugOrClass(drug, allergy));
  });

  const isAllergic = !!allergyMatch;
  
  const isCritical = matchedRule 
    ? (matchedRule.risk === 'Critical' || matchedRule.risk === 'High') 
    : (isAllergic || (hasNephrotoxic && (hasCombinationRisk || (params.eGFR !== undefined && params.eGFR !== null && params.eGFR < 60))));

  const riskLevel = isAllergic ? 'Critical' : (matchedRule ? matchedRule.risk : (isCritical ? 'Critical' : 'Moderate'));
  const category = isAllergic ? 'Immunology / Allergy' : (matchedRule ? matchedRule.category : (isCritical ? 'Renal + immunology' : 'Dermatology'));
  
  const warning = isAllergic
    ? `⚠️ CRITICAL: Patient has a known allergy that conflicts with ${allergyMatch}.`
    : (matchedRule 
      ? `⚠️ ${matchedRule.effect} (Rule matched for drug ${matchedRule.drug})`
      : (isCritical
        ? `High concern for renal toxicity and interaction risk for ${params.patientName}.`
        : `Potential interaction risk detected for ${params.patientName} based on age, weight, and current therapy.`));

  const alternatives = isAllergic
    ? ['Immediately discontinue target drug', 'Select alternative medication class', 'Refer to allergy specialist']
    : (matchedRule && matchedRule.alternatives && Array.isArray(matchedRule.alternatives) && matchedRule.alternatives.length > 0
      ? matchedRule.alternatives
      : (isCritical
        ? ['Switch to a lower-risk topical therapy', 'Ask for a pharmacist review before continuing', 'Monitor kidney function closely']
        : ['Consider a safer alternative with similar effect', 'Review with a clinical pharmacist']));

  const sideEffects = [
    isAllergic ? `Severe allergic reaction to ${allergyMatch}` : (matchedRule ? matchedRule.effect : (hasNephrotoxic ? 'Kidney stress' : 'Mild gastrointestinal upset')),
    params.ageRange === '65+' ? 'Increased sensitivity in older adults' : '',
    params.allergies.trim() ? `Documented allergies: ${params.allergies}` : '',
  ].filter(Boolean);

  return {
    patientName: params.patientName || 'Patient',
    eGFR: params.eGFR ?? 68,
    riskLevel,
    category,
    warning,
    proposedDrug: params.primaryDrug || 'Unspecified',
    interactionEffect: isAllergic ? `Allergy triggered by ${allergyMatch}.` : (matchedRule ? matchedRule.effect : 'Combined therapy evaluation.'),
    suggestedAlternatives: alternatives,
    predictedSideEffects: sideEffects,
    sideEffectRiskScore: matchedRule ? 85 : 45,
    sideEffectConfidence: 'High',
    demoSummary: params.secondaryDrug 
      ? `${params.patientName || 'Patient'} is being reviewed for ${params.primaryDrug || 'a planned medication'} with ${params.secondaryDrug || 'an additional therapy'}.`
      : `${params.patientName || 'Patient'} is being reviewed for ${params.primaryDrug || 'a planned medication'}.`,
  };
}

export default function CalculatorResult() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const toolData = getToolOutput<any>();

  const [dbRules, setDbRules] = useState<any[]>([]);

  useEffect(() => {
    async function loadRules() {
      try {
        const { data, error } = await supabase
          .from('interaction_rules')
          .select('*');
        if (!error && data) {
          setDbRules(data);
        }
      } catch (err) {
        console.error('Failed to load interaction rules from Supabase:', err);
      }
    }
    loadRules();
  }, []);

  const [step, setStep] = useState<Step>('user-type');
  const [patientIdInput, setPatientIdInput] = useState('');
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [patientError, setPatientError] = useState('');
  const [loadedFromSupabase, setLoadedFromSupabase] = useState(false);
  const [patientEGFR, setPatientEGFR] = useState<number | null>(null);
  const [patientActiveMeds, setPatientActiveMeds] = useState<string[]>([]);
  
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  
  const [userType, setUserType] = useState<'new' | 'old' | null>(null);
  const [newEGFR, setNewEGFR] = useState<string>('90');
  const [newMeds, setNewMeds] = useState<string>('');
  const [isSavingPatient, setIsSavingPatient] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([{role: 'ai', text: 'Hello! I am MedGuard AI. How can I help you with your health queries today?'}]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  type Appointment = { id: string, title: string, datetime: string };
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [newApptTitle, setNewApptTitle] = useState('');
  const [newApptDate, setNewApptDate] = useState('');

  const [surveyStep, setSurveyStep] = useState(0);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<number, string>>({});
  const [surveyQuestions, setSurveyQuestions] = useState<{q: string, options: string[]}[]>([]);
  const [isSurveyComplete, setIsSurveyComplete] = useState(false);

  const [patientName, setPatientName] = useState('');
  const [ageRange, setAgeRange] = useState<AgeRange | ''>('');
  const [sex, setSex] = useState<SexOption | ''>('');
  const [weightRange, setWeightRange] = useState<WeightRange | ''>('');
  const [allergies, setAllergies] = useState('');
  const [comorbidities, setComorbidities] = useState('');
  const [indication, setIndication] = useState('');
  const [primaryTreatment, setPrimaryTreatment] = useState<TreatmentKey | null>(null);
  const [primaryDrug, setPrimaryDrug] = useState('');
  const [secondaryTreatment, setSecondaryTreatment] = useState<TreatmentKey | null>(null);
  const [secondaryDrug, setSecondaryDrug] = useState('');

  const primarySuggestions = useMemo(() => {
    if (!primaryTreatment) return [];
    return drugCatalog[primaryTreatment];
  }, [primaryTreatment]);

  const secondarySuggestions = useMemo(() => {
    if (!secondaryTreatment) return [];
    return drugCatalog[secondaryTreatment];
  }, [secondaryTreatment]);

  const evaluation = useMemo(() => {
    if (userType === 'new') {
      if (!patientName || !primaryTreatment || !primaryDrug) {
        return null;
      }
    } else {
      if (!patientName || !secondaryTreatment || !secondaryDrug) {
        return null;
      }
    }
    return evaluateSafety({
      patientName,
      ageRange: ageRange || '18-39',
      sex: sex || 'male',
      weightRange: weightRange || '70-90',
      allergies,
      comorbidities,
      indication,
      primaryTreatment: primaryTreatment || null,
      primaryDrug: primaryDrug || '',
      secondaryTreatment: secondaryTreatment || null,
      secondaryDrug: secondaryDrug || undefined,
      eGFR: patientEGFR,
      activeMedications: patientActiveMeds,
      dbRules,
    });
  }, [userType, ageRange, allergies, comorbidities, indication, patientName, primaryDrug, primaryTreatment, secondaryDrug, secondaryTreatment, sex, weightRange, patientEGFR, patientActiveMeds, dbRules]);

  if (isReady && toolData) {
    if (toolData.operation !== undefined && toolData.result !== undefined) {
      return (
        <div
          style={{
            padding: 28,
            borderRadius: 24,
            maxWidth: 480,
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            color: '#f8fafc',
            fontFamily: 'system-ui, sans-serif',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6 }}>Calculator Output</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#38bdf8' }}>Math Result</div>
            </div>
            <span style={{ fontSize: 24 }}>🧮</span>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: 16,
              padding: 24,
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expression</div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', color: '#f1f5f9' }}>
              {toolData.expression || `${toolData.a} ${toolData.operation === 'add' ? '+' : toolData.operation === 'subtract' ? '-' : toolData.operation === 'multiply' ? '×' : '÷'} ${toolData.b} = ${toolData.result}`}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Operation</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4, textTransform: 'capitalize', color: '#38bdf8' }}>{toolData.operation}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Computed Result</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4, color: '#10b981' }}>{toolData.result}</div>
            </div>
          </div>
        </div>
      );
    }

    if (toolData.patientName !== undefined) {
      const isCritical = toolData.status === 'CRITICAL_RISK';
      const isWarning = toolData.status === 'WARNING';
      const isSafe = toolData.status === 'SAFE';

      const bgGradient = isCritical
        ? 'linear-gradient(135deg, #fff5f5 0%, #ffe3e3 100%)'
        : isWarning
        ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
        : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';

      const borderColor = isCritical ? '#f87171' : isWarning ? '#fbbf24' : '#4ade80';
      const themeColor = isCritical ? '#dc2626' : isWarning ? '#d97706' : '#15803d';

      return (
        <div
          style={{
            padding: 24,
            borderRadius: 24,
            maxWidth: 540,
            background: bgGradient,
            boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
            color: '#1e293b',
            border: `2px solid ${borderColor}`,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: 14, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: themeColor }}>
                {toolData.visual?.title || 'Medication Safety Evaluation'}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{toolData.patientName}</div>
            </div>
            <div style={{ fontSize: 32 }}>{toolData.visual?.icon || (isCritical ? '⚠️' : isWarning ? '🟡' : '✅')}</div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <span style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.05)', fontSize: 12, fontWeight: 700 }}>
              🧪 eGFR: {toolData.eGFR} mL/min
            </span>
            <span style={{ padding: '6px 12px', borderRadius: 999, background: isCritical ? '#fee2e2' : isWarning ? '#fef3c7' : '#dcfce7', color: themeColor, fontSize: 12, fontWeight: 700 }}>
              🛡️ {toolData.riskLevel || toolData.status}
            </span>
            {toolData.category && (
              <span style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.05)', fontSize: 12, fontWeight: 700 }}>
                🩺 {toolData.category}
              </span>
            )}
          </div>

          {toolData.demoSummary && (
            <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.5)', fontSize: 13, color: '#475569', marginBottom: 16, borderLeft: `3px solid ${themeColor}` }}>
              {toolData.demoSummary}
            </div>
          )}

          {toolData.warning && (
            <div style={{ background: 'rgba(255,255,255,0.8)', padding: 16, borderRadius: 16, border: '1px solid rgba(0,0,0,0.05)', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.04em' }}>Safety Warning</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, color: isSafe ? '#16a34a' : '#0f172a', lineHeight: 1.4 }}>
                {toolData.warning}
              </div>
            </div>
          )}

          {toolData.interactionEffect && !isSafe && (
            <div style={{ background: 'rgba(255,255,255,0.8)', padding: 16, borderRadius: 16, border: '1px solid rgba(0,0,0,0.05)', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.04em' }}>Interaction Effect</div>
              <div style={{ fontSize: 14, marginTop: 4, lineHeight: 1.4 }}>
                {toolData.interactionEffect}
              </div>
            </div>
          )}

          {toolData.suggestedAlternatives && toolData.suggestedAlternatives.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.8)', padding: 16, borderRadius: 16, border: '1px solid rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.04em', marginBottom: 8 }}>Suggested Alternatives</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
                {toolData.suggestedAlternatives.map((alt: string, index: number) => (
                  <li key={index} style={{ marginBottom: 4 }}>{alt}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ fontSize: 10, color: '#64748b', textAlign: 'right', marginTop: 16 }}>
            Source: {toolData.source || 'MedGuard'}
          </div>
        </div>
      );
    }
  }

  async function handleCheckNewId() {
    const uname = usernameInput.trim();
    const pwd = passwordInput.trim();
    if (!uname || !pwd) {
      setPatientError('❌ Username and Password are required.');
      return;
    }

    setIsLoadingPatient(true);
    setPatientError('');

    try {
      const { data, error } = await supabase
        .from('patients')
        .select('username')
        .eq('username', uname);

      if (!error && data && data.length > 0) {
        setPatientError('❌ This username is already taken. Please choose another username.');
      } else {
        setStep('new-profile');
      }
    } catch (err) {
      setPatientError('⚠️ Error checking username uniqueness. Please try again.');
    } finally {
      setIsLoadingPatient(false);
    }
  }

  async function handleSaveNewPatient(): Promise<boolean> {
    if (!patientName.trim()) {
      setPatientError('❌ Patient name is required.');
      return false;
    }
    const parsedEGFR = parseInt(newEGFR);
    if (isNaN(parsedEGFR) || parsedEGFR <= 0 || parsedEGFR > 200) {
      setPatientError('❌ Please enter a valid eGFR value.');
      return false;
    }
    setPatientError('');
    setIsSavingPatient(true);
    
    // Construct conditions list, appending allergy info if present
    let patientConditions = primaryTreatment ? [primaryTreatment] : [];
    if (allergies) {
      patientConditions.push(`Allergy: ${allergies}`);
    }
    if (ageRange) {
      patientConditions.push(`Age: ${ageRange}`);
    }
    if (weightRange) {
      patientConditions.push(`Weight: ${weightRange}`);
    }

    try {
      const { error } = await supabase
        .from('patients')
        .insert([
          {
            patient_id: usernameInput.trim(),
            username: usernameInput.trim(),
            password: passwordInput.trim(),
            name: patientName.trim(),
            conditions: patientConditions,
            egfr: parsedEGFR,
            active_medications: primaryDrug ? [primaryDrug] : []
          }
        ]);

      if (error) {
        setPatientError(`❌ Failed to save patient: ${error.message}`);
      } else {
        setPatientEGFR(parsedEGFR);
        setPatientActiveMeds(primaryDrug ? [primaryDrug] : []);
        setComorbidities(patientConditions.join(', '));
        setLoadedFromSupabase(true);
        // Do not override the selected ageRange and weightRange
        setSex('male');
        return true;
      }
    } catch (err: any) {
      setPatientError(`❌ Unexpected error saving patient: ${err.message}`);
      return false;
    } finally {
      setIsSavingPatient(false);
    }
    return false;
  }

  async function handleOldLogin() {
    const uname = usernameInput.trim();
    const pwd = passwordInput.trim();
    if (!uname || !pwd) {
      setPatientError('❌ Username and Password are required.');
      return;
    }

    setIsLoadingPatient(true);
    setPatientError('');

    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('username', uname)
        .eq('password', pwd)
        .single();

      if (!error && data) {
        setPatientName(data.name);
        setPatientEGFR(data.egfr);
        setPatientActiveMeds(data.active_medications || []);
        
        // Extract allergies from conditions if prefixed with 'Allergy:'
        const conditionsList = data.conditions || [];
        const allergyConds = conditionsList.filter((c: string) => c.startsWith('Allergy: ')).map((c: string) => c.replace('Allergy: ', ''));
        setAllergies(allergyConds.join(', '));
        
        // Extract appointments
        const apptConds = conditionsList.filter((c: string) => c.startsWith('Appt: ')).map((c: string) => c.replace('Appt: ', ''));
        const loadedAppts = apptConds.map((c: string) => {
          try { return JSON.parse(c); } catch { return null; }
        }).filter(Boolean);
        setAppointments(loadedAppts);
        
        setComorbidities(conditionsList.join(', '));
        setLoadedFromSupabase(true);
        const ageCond = conditionsList.find((c: string) => c.startsWith('Age: '));
        setAgeRange(ageCond ? (ageCond.replace('Age: ', '') as AgeRange) : '40-64');
        setSex('male');
        const weightCond = conditionsList.find((c: string) => c.startsWith('Weight: '));
        setWeightRange(weightCond ? (weightCond.replace('Weight: ', '') as WeightRange) : '70-90');
        setStep('dashboard');
      } else {
        setPatientError('❌ Invalid username or password. Please try again.');
      }
    } catch (err) {
      setPatientError('❌ Error querying database. Please try again.');
    } finally {
      setIsLoadingPatient(false);
    }
  }

  function testAnotherTreatment() {
    setSecondaryTreatment(null);
    setSecondaryDrug('');
    setStep('secondary-treatment');
  }

  function handleProfileNext() {
    if (!ageRange || !sex || !weightRange) return;
    setStep('primary-treatment');
  }

  function handlePrimaryTreatmentNext(value: TreatmentKey) {
    setPrimaryTreatment(value);
    setStep('primary-drug');
  }

  async function handlePrimaryDrugNext() {
    const cleaned = primaryDrug.trim();
    if (!cleaned) return;
    
    const matched = getClosestDrugName(cleaned, primarySuggestions) ?? cleaned;
    setPrimaryDrug(matched);

    if (userType === 'new') {
      const success = await handleSaveNewPatient();
      if (success) {
        setStep('dashboard');
      }
    } else {
      setStep('secondary-treatment');
    }
  }

  function handleSecondaryTreatmentNext(value: TreatmentKey) {
    setSecondaryTreatment(value);
    setStep('secondary-drug');
  }

  function handleSecondaryDrugNext() {
    const cleaned = secondaryDrug.trim();
    if (!cleaned) return;
    const matched = getClosestDrugName(cleaned, secondarySuggestions) ?? cleaned;
    setSecondaryDrug(matched);
    setStep('result');
  }

  function resetFlow() {
    setStep('user-type');
    setPatientIdInput('');
    setPatientName('');
    setAgeRange('');
    setSex('');
    setWeightRange('');
    setAllergies('');
    setComorbidities('');
    setIndication('');
    setPrimaryTreatment(null);
    setPrimaryDrug('');
    setSecondaryTreatment(null);
    setSecondaryDrug('');
    setLoadedFromSupabase(false);
    setPatientEGFR(null);
    setPatientActiveMeds([]);
    setUserType(null);
    setNewEGFR('90');
    setNewMeds('');
    setUsernameInput('');
    setPasswordInput('');
    
    // Reset Dashboard specific states (Chatbot, Survey, Calendar)
    setChatHistory([{role: 'ai', text: 'Hello! I am MedGuard AI. How can I help you with your health queries today?'}]);
    setChatInput('');
    setIsChatLoading(false);
    setAppointments([]);
    setNewApptTitle('');
    setNewApptDate('');
    setSurveyStep(0);
    setSurveyAnswers({});
    setSurveyQuestions([]);
    setIsSurveyComplete(false);
  }

  function renderQuestionCard(title: string, subtitle: string, children: React.ReactNode) {
    return (
      <div style={{ padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.72)', marginTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7 }}>{subtitle}</div>
        <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{title}</div>
        <div style={{ marginTop: 10 }}>{children}</div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 24,
        minHeight: '100vh',
        width: '100%',
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.85)), url(https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=2070&auto=format&fit=crop)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        color: '#111827',
        fontFamily: 'system-ui, sans-serif',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.75 }}>MedGuard AI</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Interactive safety review</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {loadedFromSupabase && (
            <button
              onClick={resetFlow}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid #dc2626',
                background: 'transparent',
                color: '#dc2626',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          )}
          <div style={{ padding: '6px 10px', borderRadius: 999, background: '#0f172a', color: '#fff', fontSize: 11, fontWeight: 800 }}>Live model</div>
        </div>
      </div>

      {step === 'user-type' && renderQuestionCard('Welcome to MedGuard AI', 'Patient Setup', (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6 }}>
            Please select your patient status to begin the interactive safety review:
          </div>
          <button
            onClick={() => {
              setUserType('new');
              setPatientError('');
              setPatientIdInput('');
              setStep('new-id');
            }}
            style={{
              padding: '16px',
              borderRadius: 12,
              border: '1px solid #cbd5e1',
              background: '#fff',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 15 }}>🆕 New Patient</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Register a new patient and choose a unique ID number.</div>
          </button>
          <button
            onClick={() => {
              setUserType('old');
              setPatientError('');
              setPatientIdInput('');
              setStep('old-login');
            }}
            style={{
              padding: '16px',
              borderRadius: 12,
              border: '1px solid #cbd5e1',
              background: '#fff',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 15 }}>💾 Existing Patient / Login</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Log in using your unique ID to load previous medical details.</div>
          </button>
        </div>
      ))}

      {step === 'new-id' && renderQuestionCard('Create Credentials', 'Step 1 of 2', (
        <>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
            Please choose a unique username and a password for your account.
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, opacity: 0.8 }}>Username</div>
              <input
                value={usernameInput}
                onChange={(event) => setUsernameInput(event.target.value)}
                placeholder="Choose a username"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14 }}
                disabled={isLoadingPatient}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, opacity: 0.8 }}>Password</div>
              <input
                type="password"
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
                placeholder="Choose a password"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14 }}
                disabled={isLoadingPatient}
              />
            </div>
          </div>
          {patientError && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 6 }}>{patientError}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button
              onClick={() => setStep('user-type')}
              style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', color: '#1f2937', fontWeight: 700, cursor: 'pointer' }}
            >
              Back
            </button>
            <button
              onClick={handleCheckNewId}
              disabled={isLoadingPatient}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 10,
                border: 'none',
                background: isLoadingPatient ? '#93c5fd' : '#2563eb',
                color: '#fff',
                fontWeight: 700,
                cursor: isLoadingPatient ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoadingPatient ? 'Checking Availability...' : 'Continue'}
            </button>
          </div>
        </>
      ))}

      {step === 'new-profile' && renderQuestionCard('Create Patient Profile', 'Step 2 of 2', (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ fontSize: 12, color: '#15803d', fontWeight: 600, background: '#dcfce7', padding: '8px 12px', borderRadius: 8 }}>
            ✓ Username <strong>{usernameInput}</strong> is available!
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Full Name</div>
            <input
              value={patientName}
              onChange={(event) => setPatientName(event.target.value)}
              placeholder="e.g. John Doe"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Age Group</div>
              <select
                value={ageRange}
                onChange={(e) => setAgeRange(e.target.value as AgeRange)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14 }}
              >
                <option value="" disabled>Select Age</option>
                {ageOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Weight (kg)</div>
              <select
                value={weightRange}
                onChange={(e) => setWeightRange(e.target.value as WeightRange)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14 }}
              >
                <option value="" disabled>Select Weight</option>
                {weightOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Kidney Function (eGFR)</div>
            <input
              type="number"
              value={newEGFR}
              onChange={(event) => setNewEGFR(event.target.value)}
              placeholder="e.g. 90"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14 }}
            />
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Do you have any drug allergies?</div>
            <select
              value={allergies ? 'yes' : 'no'}
              onChange={(e) => setAllergies(e.target.value === 'yes' ? ALLERGY_OPTIONS[0] : '')}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14, marginBottom: 8 }}
            >
              <option value="no">No known allergies</option>
              <option value="yes">Yes, I have allergies</option>
            </select>
            {allergies !== '' && (
              <select
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14 }}
              >
                {ALLERGY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
          </div>

          {patientError && <div style={{ color: '#dc2626', fontSize: 12 }}>{patientError}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button
              onClick={() => setStep('new-id')}
              style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', color: '#1f2937', fontWeight: 700, cursor: 'pointer' }}
            >
              Back
            </button>
            <button
              onClick={() => {
                if (!patientName.trim()) {
                  setPatientError('❌ Patient name is required.');
                  return;
                }
                if (!ageRange || !weightRange) {
                  setPatientError('❌ Age and Weight are required.');
                  return;
                }
                setPatientError('');
                setStep('primary-treatment');
              }}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 10,
                border: 'none',
                background: '#2563eb',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Continue to Treatment Details
            </button>
          </div>
        </div>
      ))}

      {step === 'old-login' && renderQuestionCard('Patient Login', 'Step 1 of 1', (
        <>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
            Please log in with your username and password.
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, opacity: 0.8 }}>Username</div>
              <input
                value={usernameInput}
                onChange={(event) => setUsernameInput(event.target.value)}
                placeholder="Enter username"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14 }}
                disabled={isLoadingPatient}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, opacity: 0.8 }}>Password</div>
              <input
                type="password"
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
                placeholder="Enter password"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14 }}
                disabled={isLoadingPatient}
              />
            </div>
          </div>
          {patientError && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 6 }}>{patientError}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button
              onClick={() => setStep('user-type')}
              style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', color: '#1f2937', fontWeight: 700, cursor: 'pointer' }}
            >
              Back
            </button>
            <button
              onClick={handleOldLogin}
              disabled={isLoadingPatient}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 10,
                border: 'none',
                background: isLoadingPatient ? '#93c5fd' : '#2563eb',
                color: '#fff',
                fontWeight: 700,
                cursor: isLoadingPatient ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoadingPatient ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </>
      ))}

      {step === 'dashboard' && (
        <div style={{ padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.72)', marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7 }}>Patient Portal</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>Welcome, {patientName}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
            {userType === 'old' && (
              <button
                onClick={() => setStep('patient-profile')}
                style={{ padding: 16, borderRadius: 12, border: 'none', background: '#eff6ff', color: '#1e40af', textAlign: 'left', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>💊</div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>Risk Prediction</div>
                <div style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>Check medication safety</div>
              </button>
            )}
            <button
              onClick={() => setStep('calendar')}
              style={{ padding: 16, borderRadius: 12, border: 'none', background: '#fdf4ff', color: '#86198f', textAlign: 'left', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>📅</div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Calendar</div>
              <div style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>Upcoming appointments</div>
            </button>
            <button
              onClick={() => setStep('report')}
              style={{ padding: 16, borderRadius: 12, border: 'none', background: '#f0fdf4', color: '#166534', textAlign: 'left', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Health Report</div>
              <div style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>View health progress</div>
            </button>
            <button
              onClick={() => setStep('chatbot')}
              style={{ padding: 16, borderRadius: 12, border: 'none', background: '#fffbeb', color: '#b45309', textAlign: 'left', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>🤖</div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>AI Chatbot</div>
              <div style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>Ask medical queries</div>
            </button>
          </div>
        </div>
      )}

      {step === 'calendar' && renderQuestionCard('Upcoming Appointments', 'Calendar', (
        <div style={{ display: 'grid', gap: 10 }}>
          {appointments.length === 0 ? (
            <div style={{ fontSize: 13, color: '#64748b', textAlign: 'center', padding: 20 }}>No upcoming appointments scheduled.</div>
          ) : (
            appointments.map((appt) => (
              <div key={appt.id} style={{ padding: 12, borderRadius: 10, background: '#f8fafc', borderLeft: '4px solid #3b82f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{appt.title}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{new Date(appt.datetime).toLocaleString()}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', background: '#dbeafe', padding: '4px 8px', borderRadius: 6 }}>
                  {getCountdown(appt.datetime)}
                </div>
              </div>
            ))
          )}
          <div style={{ marginTop: 12, padding: 12, borderRadius: 10, border: '1px solid #cbd5e1', background: '#fdfdfd' }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: '#1e293b' }}>Schedule New Appointment</div>
            <input 
              value={newApptTitle} 
              onChange={e => setNewApptTitle(e.target.value)} 
              placeholder="e.g. Follow-up with Dr. Smith" 
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, marginBottom: 8 }} 
            />
            <input 
              type="datetime-local"
              value={newApptDate} 
              onChange={e => setNewApptDate(e.target.value)} 
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, marginBottom: 8 }} 
            />
            <button
              onClick={async () => {
                if (newApptTitle.trim() && newApptDate) {
                  const newAppt = { id: Math.random().toString(), title: newApptTitle.trim(), datetime: newApptDate };
                  const updatedAppts = [...appointments, newAppt];
                  setAppointments(updatedAppts);
                  setNewApptTitle('');
                  setNewApptDate('');
                  
                  if (usernameInput) {
                    const { data } = await supabase.from('patients').select('conditions').eq('username', usernameInput).single();
                    if (data && data.conditions) {
                      const apptStr = `Appt: ${JSON.stringify(newAppt)}`;
                      await supabase.from('patients').update({ conditions: [...data.conditions, apptStr] }).eq('username', usernameInput);
                    }
                  }
                }
              }}
              disabled={!newApptTitle.trim() || !newApptDate}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: 'none', background: (!newApptTitle.trim() || !newApptDate) ? '#93c5fd' : '#2563eb', color: '#fff', fontWeight: 700, cursor: (!newApptTitle.trim() || !newApptDate) ? 'not-allowed' : 'pointer' }}
            >
              Add Appointment
            </button>
          </div>
          <button
            onClick={() => setStep('dashboard')}
            style={{ marginTop: 4, padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', color: '#1f2937', fontWeight: 700, cursor: 'pointer' }}
          >
            Back to Dashboard
          </button>
        </div>
      ))}

      {step === 'report' && renderQuestionCard('Weekly Health Survey', 'Report', (
        <div style={{ display: 'grid', gap: 12 }}>
          {isSurveyComplete ? (
            <div style={{ padding: 16, borderRadius: 12, background: '#dcfce7', color: '#166534', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Survey Complete!</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Thank you for completing your weekly health survey. Your responses have been recorded to track your progress.</div>
              <button
                onClick={() => setStep('dashboard')}
                style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, cursor: 'pointer', width: '100%' }}
              >
                Return to Dashboard
              </button>
            </div>
          ) : surveyQuestions.length > 0 ? (
            <div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>Question {surveyStep + 1} of 10</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#1e293b' }}>
                {surveyQuestions[surveyStep].q}
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {surveyQuestions[surveyStep].options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSurveyAnswers({ ...surveyAnswers, [surveyStep]: opt });
                      if (surveyStep < 9) {
                        setSurveyStep(surveyStep + 1);
                      } else {
                        setIsSurveyComplete(true);
                      }
                    }}
                    style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#334155', transition: 'all 0.2s' }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep('dashboard')}
                style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', color: '#1f2937', fontWeight: 700, cursor: 'pointer', width: '100%' }}
              >
                Cancel and Return to Dashboard
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>Generate your personalized weekly health questions based on your medical profile.</div>
              <button
                onClick={() => {
                  setSurveyQuestions(generateSurvey(comorbidities));
                  setSurveyStep(0);
                  setSurveyAnswers({});
                  setIsSurveyComplete(false);
                }}
                style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                Start Survey
              </button>
              <button
                onClick={() => setStep('dashboard')}
                style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', color: '#1f2937', fontWeight: 700, cursor: 'pointer', width: '100%' }}
              >
                Back to Dashboard
              </button>
            </div>
          )}
        </div>
      ))}

      {step === 'chatbot' && renderQuestionCard('MedGuard AI Assistant', 'AI Chatbot', (
        <div style={{ display: 'flex', flexDirection: 'column', height: 350 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: 10, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {chatHistory.map((msg, idx) => (
              <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%', padding: '8px 12px', borderRadius: 12, background: msg.role === 'user' ? '#2563eb' : '#fff', color: msg.role === 'user' ? '#fff' : '#1e293b', fontSize: 13, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: msg.role === 'ai' ? '1px solid #e2e8f0' : 'none' }}>
                {msg.text}
              </div>
            ))}
            {isChatLoading && (
              <div style={{ alignSelf: 'flex-start', padding: '8px 12px', borderRadius: 12, background: '#fff', color: '#64748b', fontSize: 13, border: '1px solid #e2e8f0' }}>
                Thinking...
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={isChatLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && chatInput.trim() && !isChatLoading) {
                  const userMessage = chatInput.trim();
                  const updatedHistory = [...chatHistory, { role: 'user' as const, text: userMessage }];
                  setChatHistory(updatedHistory);
                  setChatInput('');
                  setIsChatLoading(true);
                  
                  const apiKey = 'AQ.Ab8RN6JjwnYFB4uvu_d1DDGKZmQtbQl3aRbwzAmAAcUw6bMyzQ';
                  fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      systemInstruction: {
                        parts: [{ text: "You are a concise medical AI assistant. Keep all responses very short and sweet, focusing strictly on valid clinical points, actionable advice, and relevant treatments. Avoid long paragraphs and filler text." }]
                      },
                      contents: updatedHistory.map(m => ({ 
                        role: m.role === 'ai' ? 'model' : 'user', 
                        parts: [{ text: m.text }] 
                      }))
                    })
                  }).then(async res => {
                    if (!res.ok) {
                      const errData = await res.json().catch(() => ({}));
                      throw new Error(errData.error?.message || `API Error: ${res.status}`);
                    }
                    const data = await res.json();
                    const aiMsg = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not generate a response.';
                    setChatHistory([...updatedHistory, { role: 'ai' as const, text: aiMsg }]);
                  }).catch(err => {
                    setChatHistory([...updatedHistory, { role: 'ai' as const, text: `Error: ${err.message}` }]);
                  }).finally(() => {
                    setIsChatLoading(false);
                  });
                }
              }}
              placeholder="Ask a medical query..."
              style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13 }}
            />
            <button
              onClick={() => {
                if (chatInput.trim() && !isChatLoading) {
                  const userMessage = chatInput.trim();
                  const updatedHistory = [...chatHistory, { role: 'user' as const, text: userMessage }];
                  setChatHistory(updatedHistory);
                  setChatInput('');
                  setIsChatLoading(true);
                  
                  const apiKey = 'AQ.Ab8RN6JjwnYFB4uvu_d1DDGKZmQtbQl3aRbwzAmAAcUw6bMyzQ';
                  fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      systemInstruction: {
                        parts: [{ text: "You are a concise medical AI assistant. Keep all responses very short and sweet, focusing strictly on valid clinical points, actionable advice, and relevant treatments. Avoid long paragraphs and filler text." }]
                      },
                      contents: updatedHistory.map(m => ({ 
                        role: m.role === 'ai' ? 'model' : 'user', 
                        parts: [{ text: m.text }] 
                      }))
                    })
                  }).then(async res => {
                    if (!res.ok) {
                      const errData = await res.json().catch(() => ({}));
                      throw new Error(errData.error?.message || `API Error: ${res.status}`);
                    }
                    const data = await res.json();
                    const aiMsg = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not generate a response.';
                    setChatHistory([...updatedHistory, { role: 'ai' as const, text: aiMsg }]);
                  }).catch(err => {
                    setChatHistory([...updatedHistory, { role: 'ai' as const, text: `Error connecting to API. ${err.message}` }]);
                  }).finally(() => {
                    setIsChatLoading(false);
                  });
                }
              }}
              disabled={isChatLoading}
              style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: isChatLoading ? '#93c5fd' : '#2563eb', color: '#fff', fontWeight: 700, cursor: isChatLoading ? 'not-allowed' : 'pointer' }}
            >
              Send
            </button>
          </div>
          <button
            onClick={() => setStep('dashboard')}
            style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', color: '#1f2937', fontWeight: 700, cursor: 'pointer' }}
          >
            Back to Dashboard
          </button>
        </div>
      ))}

      {step === 'patient-profile' && renderQuestionCard('Patient History Loaded', 'Risk Prediction', (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ padding: '12px 16px', borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: 14, color: '#1e3a8a', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8, color: '#1d4ed8' }}>📋 Loaded Past History:</div>
            <div>• <strong>Patient Name:</strong> {patientName}</div>
            <div>• <strong>Kidney Function (eGFR):</strong> {patientEGFR} mL/min</div>
            <div>• <strong>Past Conditions:</strong> {comorbidities || 'None recorded'}</div>
            <div>• <strong>Past Treatments / Active Medications:</strong> {patientActiveMeds.join(', ') || 'None recorded'}</div>
          </div>
          
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button
              onClick={() => setStep('dashboard')}
              style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', color: '#1f2937', fontWeight: 700, cursor: 'pointer' }}
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => setStep('secondary-treatment')}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 10,
                border: 'none',
                background: '#2563eb',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Continue to Upcoming Treatment
            </button>
          </div>
        </div>
      ))}

      {step === 'primary-treatment' && renderQuestionCard('What treatment are you giving first?', 'Step 3', (
        <div style={{ display: 'grid', gap: 8 }}>
          {treatmentOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => handlePrimaryTreatmentNext(option.id)}
              style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 10, border: primaryTreatment === option.id ? '2px solid #2563eb' : '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
            >
              <div style={{ fontWeight: 700 }}>{option.label}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{option.description}</div>
            </button>
          ))}
        </div>
      ))}

      {step === 'primary-drug' && renderQuestionCard('Select the specific drug', 'Step 4', (
        <div style={{ display: 'grid', gap: 8 }}>
          {primarySuggestions.map((option) => (
            <button
              key={option}
              onClick={() => setPrimaryDrug(option)}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: 10,
                border: primaryDrug === option ? '2px solid #2563eb' : '1px solid #cbd5e1',
                background: primaryDrug === option ? '#eff6ff' : '#fff',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {option}
            </button>
          ))}
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, opacity: 0.8 }}>Or type manually:</div>
            <input
              value={primarySuggestions.includes(primaryDrug) ? '' : primaryDrug}
              onChange={(event) => setPrimaryDrug(event.target.value)}
              placeholder="Type the drug name"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14 }}
            />
          </div>
          {patientError && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 6 }}>{patientError}</div>}
          <button
            onClick={handlePrimaryDrugNext}
            disabled={!primaryDrug.trim() || isSavingPatient}
            style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, border: 'none', background: !primaryDrug.trim() || isSavingPatient ? '#93c5fd' : '#2563eb', color: '#fff', fontWeight: 700, cursor: !primaryDrug.trim() || isSavingPatient ? 'not-allowed' : 'pointer' }}
          >
            {isSavingPatient ? 'Saving...' : 'Continue'}
          </button>
        </div>
      ))}

      {step === 'secondary-treatment' && renderQuestionCard('What upcoming treatment are you giving?', 'Upcoming Treatment', (
        <div style={{ display: 'grid', gap: 8 }}>
          {treatmentOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => handleSecondaryTreatmentNext(option.id)}
              style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 10, border: secondaryTreatment === option.id ? '2px solid #2563eb' : '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
            >
              <div style={{ fontWeight: 700 }}>{option.label}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{option.description}</div>
            </button>
          ))}
        </div>
      ))}

      {step === 'secondary-drug' && renderQuestionCard('Select the upcoming drug', 'Upcoming Treatment', (
        <div style={{ display: 'grid', gap: 8 }}>
          {secondarySuggestions.map((option) => (
            <button
              key={option}
              onClick={() => setSecondaryDrug(option)}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: 10,
                border: secondaryDrug === option ? '2px solid #2563eb' : '1px solid #cbd5e1',
                background: secondaryDrug === option ? '#eff6ff' : '#fff',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {option}
            </button>
          ))}
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, opacity: 0.8 }}>Or type manually:</div>
            <input
              value={secondarySuggestions.includes(secondaryDrug) ? '' : secondaryDrug}
              onChange={(event) => setSecondaryDrug(event.target.value)}
              placeholder="Type the drug name"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14 }}
            />
          </div>
          <button
            onClick={handleSecondaryDrugNext}
            disabled={!secondaryDrug.trim()}
            style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, border: 'none', background: !secondaryDrug.trim() ? '#93c5fd' : '#2563eb', color: '#fff', fontWeight: 700, cursor: !secondaryDrug.trim() ? 'not-allowed' : 'pointer' }}
          >
            Show safety result
          </button>
        </div>
      ))}

      {step === 'result' && evaluation && (
        <div style={{ marginTop: 12, padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.72)' }}>
          <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7 }}>Safety review result</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{evaluation.patientName}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <span style={{ padding: '6px 10px', borderRadius: 999, background: '#dbeafe', color: '#1d4ed8', fontSize: 12, fontWeight: 700 }}>🧪 eGFR: {evaluation.eGFR}</span>
            <span style={{ padding: '6px 10px', borderRadius: 999, background: '#fef3c7', color: '#92400e', fontSize: 12, fontWeight: 700 }}>⚠️ {evaluation.riskLevel}</span>
            <span style={{ padding: '6px 10px', borderRadius: 999, background: '#dcfce7', color: '#166534', fontSize: 12, fontWeight: 700 }}>🩺 {evaluation.category}</span>
          </div>
          <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.5 }}>{evaluation.warning}</div>
          <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 10, background: '#f8fafc', fontSize: 13, color: '#334155' }}>{evaluation.demoSummary}</div>
          <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: '#eff6ff' }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', opacity: 0.75 }}>Primary drug</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{primaryDrug}</div>
          </div>
          <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: '#fef2f2' }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', opacity: 0.75 }}>Interaction effect</div>
            <div style={{ fontSize: 14, marginTop: 4 }}>{evaluation.interactionEffect}</div>
          </div>
          <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: '#f0fdf4' }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', opacity: 0.75 }}>Suggested alternatives</div>
            <ul style={{ margin: '6px 0 0 0', paddingLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
              {evaluation.suggestedAlternatives.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button
              onClick={() => setStep('dashboard')}
              style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', color: '#1f2937', fontWeight: 700, cursor: 'pointer' }}
            >
              Back to Dashboard
            </button>
            <button
              onClick={testAnotherTreatment}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
            >
              Evaluate Another Treatment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
