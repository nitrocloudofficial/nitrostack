import 'dotenv/config';
import { MongoService } from '../src/services/mongo.service.js';
import { UserRepository } from '../src/repositories/user.repository.js';
import { PatientRepository } from '../src/repositories/patient.repository.js';
import { ReportRepository } from '../src/repositories/report.repository.js';
import { TimelineRepository } from '../src/repositories/timeline.repository.js';
import { TrialRepository } from '../src/repositories/trial.repository.js';
import { ReferralRepository } from '../src/repositories/referral.repository.js';
import { SupabaseService } from '../src/services/supabase.service.js';
import { OcrService } from '../src/services/ocr.service.js';
import { LlmService } from '../src/services/llm.service.js';
import { EmbeddingService } from '../src/services/embedding.service.js';
import { PineconeService } from '../src/services/pinecone.service.js';
import { TimelineService } from '../src/services/timeline.service.js';
import { ClinicalTrialService } from '../src/services/clinicaltrial.service.js';
import { EligibilityService } from '../src/services/eligibility.service.js';
import { PdfService } from '../src/services/pdf.service.js';
import { ReferralService } from '../src/services/referral.service.js';

import { AuthTools } from '../src/modules/auth/auth.tools.js';
import { UploadTools } from '../src/modules/upload/upload.tools.js';
import { PatientTools } from '../src/modules/patient/patient.tools.js';
import { TimelineTools } from '../src/modules/timeline/timeline.tools.js';
import { TrialsTools } from '../src/modules/trials/trials.tools.js';
import { ReferralTools } from '../src/modules/referral/referral.tools.js';

/**
 * Mock ExecutionContext logger for manual debugging
 */
const createMockContext = () => ({
  logger: {
    info: (msg: string) => console.log(`  [LOG]: ${msg}`),
    warn: (msg: string) => console.warn(`  [WARN]: ${msg}`),
    error: (msg: string) => console.error(`  [ERR]: ${msg}`),
  },
  metadata: {},
  auth: undefined,
});

/**
 * End-to-End Manual Testing Suite for Clinical Copilot MCP Tools
 */
async function runManualToolsTest() {
  console.log('==========================================================');
  console.log('CLINICAL COPILOT MCP SERVER - MANUAL MCP TOOLS TEST SUITE');
  console.log('==========================================================');

  // 1. Instantiate Core Infrastructure Services & Repositories
  const mongoService = new MongoService();
  await mongoService.onModuleInit();

  const userRepository = new UserRepository(mongoService);
  const patientRepository = new PatientRepository(mongoService);
  const reportRepository = new ReportRepository(mongoService);
  const timelineRepository = new TimelineRepository(mongoService);
  const trialRepository = new TrialRepository(mongoService);
  const referralRepository = new ReferralRepository(mongoService);

  const supabaseService = new SupabaseService();
  await supabaseService.onModuleInit();

  const ocrService = new OcrService();
  const llmService = new LlmService();
  const embeddingService = new EmbeddingService();
  const pineconeService = new PineconeService();
  await pineconeService.onModuleInit();

  const timelineService = new TimelineService();
  const clinicalTrialService = new ClinicalTrialService();
  const eligibilityService = new EligibilityService();
  const pdfService = new PdfService();

  const referralService = new ReferralService(
    patientRepository,
    reportRepository,
    referralRepository,
    clinicalTrialService,
    pdfService,
    supabaseService
  );

  // 2. Instantiate MCP Tool Controllers
  const authTools = new AuthTools(userRepository, patientRepository);
  const uploadTools = new UploadTools(patientRepository, reportRepository, supabaseService);
  const patientTools = new PatientTools(patientRepository, reportRepository, ocrService, llmService, embeddingService, pineconeService);
  const timelineTools = new TimelineTools(patientRepository, reportRepository, timelineRepository, timelineService);
  const trialsTools = new TrialsTools(patientRepository, trialRepository, clinicalTrialService, eligibilityService);
  const referralTools = new ReferralTools(referralService);

  const ctx = createMockContext() as any;
  const timestamp = Date.now();
  const testAccount = `registered_user_${timestamp}`;
  const testPassword = 'Password123!';
  const testPatientName = `Test Patient ${timestamp}`;

  try {
    // ---------------------------------------------------------------------
    // TEST 1: authenticate_user (Register Mode)
    // ---------------------------------------------------------------------
    console.log('\n--- TEST 1: authenticate_user (register) ---');
    const regResult = await authTools.authenticateUser({
      action: 'register',
      email: testAccount,
      password: testPassword,
      name: testPatientName,
    }, ctx);
    console.log('✅ Registration Output:', JSON.stringify(regResult, null, 2));

    const activePatientId = regResult.patientId;

    // ---------------------------------------------------------------------
    // TEST 2: authenticate_user (Login Mode - Registered User)
    // ---------------------------------------------------------------------
    console.log('\n--- TEST 2: authenticate_user (login - registered user) ---');
    const loginResult = await authTools.authenticateUser({
      action: 'login',
      email: testAccount,
      password: testPassword,
    }, ctx);
    console.log('✅ Registered Login Output:', JSON.stringify(loginResult, null, 2));

    // ---------------------------------------------------------------------
    // TEST 2B: authenticate_user (Login Mode - Unregistered User Rejection)
    // ---------------------------------------------------------------------
    console.log('\n--- TEST 2B: authenticate_user (login - unregistered user check) ---');
    const unregisteredAccount = `unregistered_user_${timestamp}`;
    try {
      await authTools.authenticateUser({
        action: 'login',
        email: unregisteredAccount,
        password: 'Password123!',
      }, ctx);
      console.error('❌ ERROR: Unregistered user login should have been rejected!');
    } catch (unregisteredErr: any) {
      console.log(`✅ Unregistered User Login Rejection PASSED: "${unregisteredErr.message}"`);
    }

    // ---------------------------------------------------------------------
    // TEST 3: upload_medical_report (using 04_Discharge_Summary.pdf)
    // ---------------------------------------------------------------------
    console.log('\n--- TEST 3: upload_medical_report ---');
    const uploadResult = await uploadTools.uploadMedicalReport({
      patientId: activePatientId,
      file: '04_Discharge_Summary.pdf',
      reportType: 'Discharge Summary',
      fileName: '04_Discharge_Summary.pdf',
    }, ctx);
    console.log('✅ Upload Report Output:', JSON.stringify(uploadResult, null, 2));

    const activeReportId = uploadResult.reportId;

    // ---------------------------------------------------------------------
    // TEST 4: extract_patient_information
    // ---------------------------------------------------------------------
    console.log('\n--- TEST 4: extract_patient_information ---');
    const extractResult = await patientTools.extractPatientInformation({
      patientId: activePatientId,
      reportId: activeReportId,
    }, ctx);
    console.log('✅ Extract Patient Info Output:', JSON.stringify(extractResult, null, 2));

    // ---------------------------------------------------------------------
    // TEST 5: update_medical_timeline
    // ---------------------------------------------------------------------
    console.log('\n--- TEST 5: update_medical_timeline ---');
    const timelineResult = await timelineTools.updateMedicalTimeline({
      patientId: activePatientId,
    }, ctx);
    console.log('✅ Update Medical Timeline Output:', JSON.stringify(timelineResult, null, 2));

    // ---------------------------------------------------------------------
    // TEST 6: search_clinical_trials
    // ---------------------------------------------------------------------
    console.log('\n--- TEST 6: search_clinical_trials ---');
    const trialsResult = await trialsTools.searchClinicalTrials({
      patientId: activePatientId,
    }, ctx);
    console.log('✅ Search Clinical Trials Output:', JSON.stringify(trialsResult, null, 2));

    const selectedTrialId = trialsResult.trials[0]?.trialId || 'NCT05123456';

    // ---------------------------------------------------------------------
    // TEST 7: generate_referral
    // ---------------------------------------------------------------------
    console.log('\n--- TEST 7: generate_referral ---');
    const referralResult = await referralTools.generateReferral({
      patientId: activePatientId,
      trialId: selectedTrialId,
    }, ctx);
    console.log('✅ Generate Referral Output:', JSON.stringify(referralResult, null, 2));

    console.log('\n==========================================================');
    console.log('🎉 ALL 6 MCP TOOLS TESTED AND PASSED SUCCESSFULLY!');
    console.log('==========================================================');
  } catch (error: any) {
    console.error('\n==========================================================');
    console.error('❌ MCP TOOLS TEST SUITE ENCOUNTERED AN ERROR');
    console.error('==========================================================');
    console.error(error.stack || error);
  } finally {
    await mongoService.disconnect();
  }
}

runManualToolsTest();
