-- Supabase Schema & Seeding Script for MedGuard APP
-- Copy and paste this script directly into your Supabase SQL Editor.

-- Drop tables if they exist
DROP TABLE IF EXISTS interaction_rules CASCADE;
DROP TABLE IF EXISTS patients CASCADE;

-- Create Patients Table
CREATE TABLE patients (
    patient_id VARCHAR PRIMARY KEY,
    username VARCHAR UNIQUE,
    password VARCHAR,
    name VARCHAR NOT NULL,
    conditions TEXT[] NOT NULL DEFAULT '{}',
    egfr INTEGER NOT NULL,
    active_medications TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Interaction Rules Table
CREATE TABLE interaction_rules (
    id BIGSERIAL PRIMARY KEY,
    category VARCHAR NOT NULL,
    disease TEXT NOT NULL,
    drug TEXT NOT NULL,
    combination TEXT NOT NULL,
    risk VARCHAR NOT NULL,
    effect TEXT NOT NULL,
    alternatives TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_rules ENABLE ROW LEVEL SECURITY;

-- Create simple public read/write access policies (adjust as needed for production)
CREATE POLICY "Allow public read access on patients" ON patients FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on patients" ON patients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on patients" ON patients FOR UPDATE USING (true);

CREATE POLICY "Allow public read access on interaction_rules" ON interaction_rules FOR SELECT USING (true);

-- Seed patients
INSERT INTO patients (patient_id, username, password, name, conditions, egfr, active_medications) VALUES (
  'P101',
  'john',
  'password123',
  'John Doe',
  '{"Stage 3 Chronic Kidney Disease"}',
  42,
  '{"Ramipril"}'
) ON CONFLICT (patient_id) DO NOTHING;
INSERT INTO patients (patient_id, username, password, name, conditions, egfr, active_medications) VALUES (
  '1',
  'john1',
  'password123',
  'John Doe',
  '{"Stage 3 Chronic Kidney Disease"}',
  42,
  '{"Ramipril"}'
) ON CONFLICT (patient_id) DO NOTHING;
INSERT INTO patients (patient_id, username, password, name, conditions, egfr, active_medications) VALUES (
  'P102',
  'jane',
  'password123',
  'Jane Smith',
  '{"Mild Hypertension"}',
  95,
  '{"Multivitamins"}'
) ON CONFLICT (patient_id) DO NOTHING;
INSERT INTO patients (patient_id, username, password, name, conditions, egfr, active_medications) VALUES (
  '2',
  'jane1',
  'password123',
  'Jane Smith',
  '{"Mild Hypertension"}',
  95,
  '{"Multivitamins"}'
) ON CONFLICT (patient_id) DO NOTHING;

-- Seed interaction rules
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Chronic Kidney Disease (Stage 3+)',
  'Cyclosporine',
  'NSAID',
  'High',
  'Increased nephrotoxicity via combined renal vasoconstriction',
  '{"Topical steroid","Dupilumab"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Chronic Kidney Disease',
  'Ibuprofen (NSAID)',
  'ACE inhibitor + Diuretic',
  'High',
  'Triple whammy acute kidney injury from combined renal blood flow reduction',
  '{"Acetaminophen"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Advanced CKD (Stage 4-5)',
  'Metformin',
  'Iodinated contrast dye',
  'High',
  'Lactic acidosis risk compounded by contrast-induced nephropathy',
  '{"DPP-4 inhibitors","Insulin"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'CKD with hyperkalemia risk',
  'ACE inhibitor / ARB',
  'Potassium-sparing diuretic (Spironolactone)',
  'Medium-High',
  'Severe hyperkalemia, cardiac arrhythmia risk',
  '{"Thiazide or loop diuretic"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'CKD',
  'Aminoglycoside (Gentamicin)',
  'Loop diuretic (Furosemide)',
  'High',
  'Compounded nephrotoxicity and ototoxicity',
  '{"Azithromycin or non-aminoglycoside antibiotic"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'CKD',
  'Lithium',
  'NSAID or ACE inhibitor',
  'Medium-High',
  'Reduced lithium clearance, lithium toxicity risk',
  '{"Valproate","Lamotrigine"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'CKD',
  'Vancomycin (high dose)',
  'Aminoglycoside',
  'Medium-High',
  'Additive nephrotoxicity',
  '{"Dose-adjusted monotherapy"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'CKD',
  'Tenofovir',
  'NSAID',
  'Medium-High',
  'Additive renal tubular toxicity',
  '{"Tenofovir alafenamide (lower renal burden)"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'CKD Stage 3-5',
  'Metformin',
  'Reduced eGFR without dose adjustment',
  'High',
  'Lactic acidosis due to reduced renal clearance',
  '{"DPP-4 inhibitor","SGLT2 inhibitor per eGFR threshold"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Nephrotic Syndrome',
  'NSAID',
  'Existing proteinuria',
  'Medium-High',
  'Worsened sodium retention and edema, reduced GFR',
  '{"Acetaminophen"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Polycystic Kidney Disease',
  'NSAID (chronic use)',
  'Existing hypertension management',
  'Medium',
  'Reduced renal perfusion accelerates cyst-related decline',
  '{"Acetaminophen"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'CKD',
  'Digoxin',
  'Reduced renal clearance',
  'Medium-High',
  'Drug accumulation, digoxin toxicity (arrhythmia, nausea)',
  '{"Beta-blocker for rate control"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'CKD',
  'Allopurinol',
  'Azathioprine',
  'High',
  'Reduced azathioprine metabolism, severe bone marrow suppression',
  '{"Febuxostat with dose caution","or mycophenolate"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Diabetic Nephropathy',
  'NSAID',
  'ACE inhibitor',
  'High',
  'Reduced glomerular filtration, risk of acute kidney injury',
  '{"Acetaminophen"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'CKD',
  'Colchicine',
  'Reduced renal clearance, no dose adjustment',
  'Medium-High',
  'Colchicine toxicity - myelosuppression, neuromyopathy',
  '{"Low-dose NSAID alternative or corticosteroid for gout flare (case-dependent)"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'CKD Stage 4-5',
  'Enoxaparin (LMWH)',
  'No dose adjustment for renal function',
  'Medium-High',
  'Drug accumulation, bleeding risk',
  '{"Unfractionated heparin (more easily reversible/monitored)"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Renal Artery Stenosis (bilateral)',
  'ACE inhibitor / ARB',
  'Existing bilateral stenosis',
  'High',
  'Acute kidney injury from loss of efferent arteriolar constriction',
  '{"Calcium channel blocker"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'CKD',
  'Trimethoprim-sulfamethoxazole',
  'ACE inhibitor / ARB',
  'Medium-High',
  'Hyperkalemia from combined potassium-retaining effects',
  '{"Alternative antibiotic class"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'CKD',
  'Acyclovir (high dose, IV)',
  'Dehydration / reduced renal function',
  'Medium-High',
  'Crystal nephropathy, acute kidney injury',
  '{"Adequate hydration protocol","dose adjustment"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'CKD',
  'Proton pump inhibitor (chronic use)',
  'Long-term high dose',
  'Medium',
  'Associated acute interstitial nephritis, CKD progression',
  '{"H2 blocker","lowest effective PPI dose"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'CKD Stage 3+',
  'Codeine / Morphine',
  'Reduced renal clearance',
  'Medium-High',
  'Accumulation of active metabolites, respiratory depression risk',
  '{"Fentanyl (safer in renal impairment)"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'CKD',
  'Spironolactone',
  'ACE inhibitor + NSAID',
  'High',
  'Severe hyperkalemia and acute kidney injury (multi-drug renal stress)',
  '{"Careful monotherapy with monitoring"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'CKD',
  'Iodinated contrast',
  'Metformin + NSAID',
  'High',
  'Compounded contrast-induced nephropathy risk',
  '{"Non-contrast imaging (MRI/ultrasound) where feasible"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'CKD',
  'Cisplatin',
  'Aminoglycoside',
  'High',
  'Severe additive nephrotoxicity',
  '{"Carboplatin (lower nephrotoxicity)"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'CKD',
  'High-dose Vitamin D / Calcium',
  'Existing hypercalcemia risk in CKD-MBD',
  'Medium',
  'Vascular calcification, worsened renal function',
  '{"Calcimimetics (Cinacalcet) per CKD-MBD guidelines Synthetic entries (175)"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Heart Failure (reduced EF)',
  'NSAID (any)',
  'ACE inhibitor / Beta-blocker regimen',
  'High',
  'Fluid retention, worsens heart failure, blunts diuretic effect',
  '{"Acetaminophen"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Heart Failure (reduced EF)',
  'Pioglitazone',
  'Existing HF diagnosis',
  'High',
  'Fluid retention, HF exacerbation/hospitalization',
  '{"SGLT2 inhibitor","Metformin"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Long QT Syndrome / Arrhythmia risk',
  'Azithromycin (Macrolide)',
  'Antipsychotic (Haloperidol) or antiarrhythmic',
  'High',
  'QT prolongation, Torsades de Pointes risk',
  '{"Amoxicillin or non-QT-prolonging antibiotic"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Heart Failure (reduced EF)',
  'Verapamil / Diltiazem',
  'Beta-blocker',
  'High',
  'Additive negative inotropy, bradycardia, heart block',
  '{"Amlodipine if a CCB is needed"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Coronary Artery Disease',
  'Sumatriptan (Triptan)',
  'Existing CAD diagnosis',
  'Medium-High',
  'Coronary vasoconstriction, angina/MI risk',
  '{"CGRP antagonist (Rimegepant)","acetaminophen-based regimen"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Atrial Fibrillation (on Warfarin)',
  'NSAID or Aspirin',
  'Warfarin',
  'High',
  'Significantly increased bleeding risk',
  '{"Acetaminophen; reassess anticoagulant choice with clinician"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Hypertension',
  'Pseudoephedrine',
  'Existing antihypertensive regimen',
  'Medium',
  'Blood pressure elevation, reduced antihypertensive efficacy',
  '{"Saline nasal spray","intranasal steroid"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Heart Failure',
  'Diltiazem',
  'Digoxin',
  'Medium-High',
  'Increased digoxin levels, additive bradycardia',
  '{"Beta-blocker monotherapy with monitoring"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Coronary Artery Disease (on Clopidogrel)',
  'Omeprazole',
  'Clopidogrel',
  'Medium',
  'Reduced clopidogrel activation via CYP2C19 inhibition, reduced antiplatelet effect',
  '{"Pantoprazole (lower CYP2C19 interaction)"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Long QT / Arrhythmia risk',
  'Ondansetron',
  'Other QT-prolonging agents',
  'Medium-High',
  'Additive QT prolongation',
  '{"Metoclopramide with caution","or non-pharmacologic antiemetic measures"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Hypertension (on ACE inhibitor)',
  'NSAID',
  'ACE inhibitor',
  'Medium-High',
  'Reduced antihypertensive efficacy, renal blood flow reduction',
  '{"Acetaminophen"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Heart Failure',
  'Corticosteroid (systemic, chronic)',
  'Existing HF diagnosis',
  'Medium-High',
  'Sodium and fluid retention worsening HF',
  '{"Steroid-sparing regimen where possible"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Atrial Fibrillation (on Dabigatran)',
  'Verapamil',
  'Dabigatran',
  'Medium',
  'Increased dabigatran plasma levels via P-glycoprotein inhibition',
  '{"Alternative CCB with lower P-gp interaction","or dose review"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Bradycardia-prone patient',
  'Beta-blocker',
  'Digoxin',
  'Medium-High',
  'Additive bradycardia, heart block risk',
  '{"Careful monotherapy with ECG monitoring"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Coronary Artery Disease',
  'Sildenafil (PDE5 inhibitor)',
  'Nitrate therapy',
  'High',
  'Severe, life-threatening hypotension',
  '{"Avoid combination entirely; alternative angina management"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Hypertension',
  'NSAID (chronic use)',
  'Diuretic',
  'Medium-High',
  'Blunted diuretic/antihypertensive effect, renal stress',
  '{"Acetaminophen"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Heart Failure',
  'Metformin',
  'Unstable/decompensated HF',
  'Medium',
  'Increased lactic acidosis risk in hypoperfusion states',
  '{"Insulin during acute decompensation"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Arrhythmia (on Amiodarone)',
  'Simvastatin (high dose)',
  'Amiodarone',
  'Medium-High',
  'Increased statin levels via CYP3A4 inhibition, myopathy/rhabdomyolysis risk',
  '{"Rosuvastatin or dose-capped simvastatin"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Hypertension (resistant)',
  'Licorice-containing products',
  'Existing antihypertensive regimen',
  'Medium',
  'Mineralocorticoid-like effect raises blood pressure, hypokalemia',
  '{"Avoid licorice-containing supplements"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Heart Failure with reduced EF',
  'Flecainide',
  'Structural heart disease',
  'High',
  'Proarrhythmic risk, increased mortality in structural heart disease',
  '{"Amiodarone under specialist guidance"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Coronary Artery Disease (post-stent)',
  'NSAID',
  'Dual antiplatelet therapy',
  'High',
  'Increased GI and systemic bleeding risk',
  '{"Acetaminophen","PPI co-prescription if NSAID unavoidable"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Atrial Fibrillation',
  'Amiodarone',
  'Warfarin',
  'Medium-High',
  'Increased INR via CYP interaction, bleeding risk',
  '{"Closer INR monitoring and warfarin dose reduction"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Hypertension',
  'Cyclosporine',
  'Existing hypertension',
  'Medium',
  'Worsens blood pressure control via vasoconstriction',
  '{"Topical/steroid-sparing alternative for underlying condition"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Heart Failure',
  'Alpha-blocker (Doxazosin, monotherapy)',
  'Existing HF diagnosis',
  'Medium',
  'Associated with increased HF hospitalization risk',
  '{"ACE inhibitor / ARB-based regimen"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Long QT Syndrome',
  'Methadone',
  'Other QT-prolonging agents',
  'High',
  'Significant additive QT prolongation, Torsades risk',
  '{"Buprenorphine (lower QT effect) under specialist care Synthetic entries (175)"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Epilepsy',
  'Valproate',
  'Aspirin (NSAID)',
  'Medium',
  'Displaces valproate from protein binding, increases free-drug toxicity',
  '{"Acetaminophen"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Parkinson''s Disease',
  'Levodopa',
  'Haloperidol',
  'High',
  'Dopamine receptor blockade worsens parkinsonian symptoms',
  '{"Quetiapine or Clozapine (lower D2 blockade)"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Epilepsy',
  'Phenytoin',
  'Warfarin',
  'Medium-High',
  'Unpredictable INR shifts, bleeding or clotting risk',
  '{"Levetiracetam (minimal interaction profile)"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Seizure Disorder',
  'Bupropion',
  'Existing seizure disorder',
  'High',
  'Lowers seizure threshold, increases seizure frequency',
  '{"Sertraline or other SSRI"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Myasthenia Gravis',
  'Ciprofloxacin (Fluoroquinolone)',
  'Existing MG diagnosis',
  'High',
  'Can precipitate myasthenic crisis via neuromuscular blockade',
  '{"Amoxicillin or alternative antibiotic class"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Chronic Migraine',
  'Ergotamine',
  'Macrolide antibiotic (CYP3A4 inhibitor)',
  'High',
  'Ergotism - severe vasospasm, limb ischemia',
  '{"Non-ergot triptan","CGRP antagonist"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Alzheimer''s Disease',
  'Oxybutynin (anticholinergic)',
  'Donepezil',
  'Medium',
  'Directly opposing mechanisms, worsened cognitive decline',
  '{"Mirabegron (non-anticholinergic for incontinence)"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Epilepsy',
  'Carbamazepine',
  'Oral contraceptives',
  'Medium-High',
  'Induces hepatic metabolism, reduces contraceptive efficacy',
  '{"Lamotrigine (lower enzyme induction) plus non-hormonal contraception"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Migraine (on Triptan)',
  'Sumatriptan',
  'SSRI/SNRI',
  'Medium',
  'Risk of serotonin syndrome',
  '{"Non-serotonergic abortive therapy where possible","careful monitoring"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Parkinson''s Disease',
  'Metoclopramide',
  'Existing Parkinson''s diagnosis',
  'High',
  'Central dopamine blockade worsens motor symptoms',
  '{"Domperidone (does not cross blood-brain barrier significantly)"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Epilepsy',
  'Phenytoin',
  'Fluconazole',
  'Medium-High',
  'Increased phenytoin levels via CYP2C9 inhibition, toxicity risk',
  '{"Alternative antifungal or phenytoin level monitoring"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Multiple Sclerosis (on Fingolimod)',
  'Beta-blocker',
  'Fingolimod initiation',
  'Medium-High',
  'Additive bradycardia risk especially at treatment initiation',
  '{"First-dose monitoring protocol","alternative rate-control agent if feasible"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Dementia',
  'Benzodiazepine',
  'Existing cognitive impairment',
  'Medium-High',
  'Worsened confusion, fall risk, paradoxical agitation',
  '{"Non-pharmacologic sleep/anxiety management","low-dose trazodone if needed"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Epilepsy',
  'Lamotrigine',
  'Valproate',
  'Medium-High',
  'Valproate inhibits lamotrigine metabolism, raising toxicity/rash risk',
  '{"Slower lamotrigine titration with dose adjustment"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Migraine',
  'NSAID (frequent use)',
  'Chronic daily use',
  'Medium',
  'Medication overuse headache',
  '{"Preventive therapy (CGRP antagonist","beta-blocker) with abortive use limits"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Restless Legs Syndrome',
  'Metoclopramide / Antihistamine',
  'Existing RLS diagnosis',
  'Medium',
  'Dopamine antagonism or sedating antihistamine worsens RLS symptoms',
  '{"Iron studies review","alternative antiemetic (Ondansetron)"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Epilepsy',
  'Isoniazid',
  'Phenytoin',
  'Medium-High',
  'Increased phenytoin levels via metabolic inhibition, toxicity risk',
  '{"Phenytoin level monitoring during isoniazid course"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Parkinson''s Disease',
  'Tricyclic antidepressant',
  'Existing autonomic dysfunction',
  'Medium',
  'Worsened orthostatic hypotension, anticholinergic burden',
  '{"SSRI with lower anticholinergic effect"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Stroke (on Antiplatelet)',
  'NSAID',
  'Aspirin/Clopidogrel',
  'Medium-High',
  'Increased bleeding risk, particularly GI and intracranial',
  '{"Acetaminophen"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Epilepsy',
  'Valproate',
  'Existing hepatic impairment',
  'Medium-High',
  'Increased hepatotoxicity risk',
  '{"Levetiracetam or Lamotrigine"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Neuropathic Pain (Diabetic)',
  'Duloxetine',
  'Tramadol',
  'Medium-High',
  'Increased serotonin syndrome risk, lowered seizure threshold',
  '{"Gabapentin or Pregabalin"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Alzheimer''s Disease',
  'Antipsychotic (atypical, e.g. Risperidone)',
  'Existing dementia diagnosis',
  'Medium-High',
  'Increased risk of stroke and mortality in elderly dementia patients',
  '{"Non-pharmacologic behavioral management first-line"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Epilepsy',
  'Clarithromycin',
  'Carbamazepine',
  'Medium-High',
  'Increased carbamazepine levels via CYP3A4 inhibition, toxicity',
  '{"Azithromycin (lower CYP3A4 interaction)"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Migraine (chronic)',
  'Opioid analgesic',
  'Chronic daily use for migraine',
  'Medium',
  'Medication overuse headache and dependence risk',
  '{"Preventive therapy","non-opioid abortive regimen"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Essential Tremor',
  'Beta-agonist inhaler (Albuterol)',
  'Existing tremor diagnosis',
  'Low-Medium',
  'Can transiently worsen tremor symptoms',
  '{"Anticholinergic inhaler (Ipratropium) where appropriate Synthetic entries (175)"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Chronic Kidney Disease',
  'Cyclosporine (for psoriasis/eczema)',
  'NSAID',
  'High',
  'Increased nephrotoxicity',
  '{"Topical steroid","Dupilumab"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Liver Disease',
  'Methotrexate (for psoriasis)',
  'Existing hepatic impairment',
  'High',
  'Hepatotoxicity, risk of liver fibrosis',
  '{"Adalimumab","Secukinumab"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Osteoporosis',
  'Systemic corticosteroid',
  'Long-term/high-dose use',
  'Medium-High',
  'Accelerated bone density loss, fracture risk',
  '{"Topical corticosteroid","steroid-sparing biologic"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Diabetes',
  'Systemic corticosteroid',
  'Existing diabetes diagnosis',
  'Medium-High',
  'Hyperglycemia, poor glycemic control',
  '{"Biologic (Secukinumab)","topical-only regimen"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'QT Prolongation / Arrhythmia',
  'Hydroxychloroquine',
  'Macrolide antibiotic',
  'High',
  'Additive QT prolongation',
  '{"Alternative antimalarial-sparing regimen"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Peptic Ulcer Disease',
  'Isotretinoin',
  'NSAID (for acne-related joint pain)',
  'Medium',
  'Compounded GI mucosal irritation',
  '{"Acetaminophen"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Glaucoma',
  'Systemic corticosteroid',
  'Long-term use',
  'Medium',
  'Increased intraocular pressure',
  '{"Steroid-sparing systemic agent","topical treatment"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Pregnancy (or planning)',
  'Isotretinoin',
  'Existing/planned pregnancy',
  'High',
  'Severe teratogenicity',
  '{"Topical retinoid","strict contraception protocol if isotretinoin required"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Latent Tuberculosis',
  'TNF-alpha inhibitor (Adalimumab)',
  'Untreated latent TB',
  'High',
  'Reactivation of latent tuberculosis',
  '{"Complete latent TB treatment before starting biologic"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Depression / Suicidal Ideation history',
  'Isotretinoin',
  'Existing psychiatric history',
  'Medium',
  'Possible mood changes, reported association with depression',
  '{"Close psychiatric monitoring or alternative acne regimen"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Photosensitivity-prone skin condition',
  'Tetracycline / Doxycycline',
  'High UV exposure',
  'Medium',
  'Increased phototoxic reaction risk',
  '{"Strict photoprotection or macrolide alternative"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Liver Disease',
  'Terbinafine (for fungal skin infection)',
  'Existing hepatic impairment',
  'Medium-High',
  'Hepatotoxicity risk',
  '{"Topical antifungal where infection extent allows"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'CKD',
  'Dapsone (for dermatitis herpetiformis)',
  'Reduced renal clearance',
  'Medium',
  'Increased risk of hemolysis and methemoglobinemia',
  '{"Gluten-free diet as primary management","dose caution"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'G6PD Deficiency',
  'Dapsone',
  'Existing G6PD deficiency',
  'High',
  'Severe hemolytic anemia',
  '{"Topical corticosteroid or alternative systemic agent"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Heart Failure',
  'Systemic corticosteroid',
  'Existing HF diagnosis',
  'Medium-High',
  'Fluid retention worsening heart failure',
  '{"Topical/steroid-sparing regimen"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Bone Marrow Suppression risk',
  'Methotrexate',
  'Trimethoprim-sulfamethoxazole',
  'High',
  'Severe additive bone marrow suppression via folate pathway',
  '{"Alternative antibiotic class during methotrexate therapy"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Inflammatory Bowel Disease',
  'Isotretinoin',
  'Existing IBD diagnosis',
  'Medium',
  'Possible IBD exacerbation (reported association)',
  '{"Alternative acne regimen with GI monitoring"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Liver Disease',
  'Acitretin (for psoriasis)',
  'Existing hepatic impairment',
  'High',
  'Hepatotoxicity, teratogenic metabolite retention',
  '{"Biologic therapy"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Diabetes',
  'Cyclosporine',
  'Existing diabetes diagnosis',
  'Medium',
  'Can worsen glucose control and hypertension',
  '{"Topical treatment","Dupilumab"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'CKD',
  'Chronic topical/systemic NSAID for skin-related pain',
  'Existing CKD',
  'Medium-High',
  'Nephrotoxicity risk from systemic absorption',
  '{"Acetaminophen","topical-only analgesic"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Osteoporosis',
  'Methotrexate (long-term, high dose)',
  'Existing osteoporosis risk',
  'Medium',
  'Methotrexate osteopathy, reduced bone density',
  '{"Biologic agent with bone-sparing profile"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Hypertension',
  'Cyclosporine',
  'Existing hypertension',
  'Medium',
  'Vasoconstriction worsens blood pressure control',
  '{"Topical steroid","Dupilumab"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Peptic Ulcer Disease',
  'Systemic corticosteroid',
  'NSAID for joint symptoms',
  'Medium-High',
  'Compounded GI mucosal damage, ulcer risk',
  '{"Acetaminophen","PPI co-prescription if combination needed"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Seizure Disorder',
  'Isotretinoin (rare reports)',
  'Existing seizure disorder',
  'Low-Medium',
  'Limited evidence of seizure threshold effects; monitor closely',
  '{"Alternative acne regimen with neurology input"}'
);
INSERT INTO interaction_rules (category, disease, drug, combination, risk, effect, alternatives) VALUES (
  'Dermatology',
  'Anemia (existing)',
  'Dapsone',
  'Existing anemia',
  'Medium-High',
  'Worsened hemolysis-related anemia',
  '{"Alternative agent with hematology monitoring Synthetic entries (175)"}'
);
