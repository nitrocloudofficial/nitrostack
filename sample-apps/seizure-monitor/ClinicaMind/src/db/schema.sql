-- ClinicaMind Relational Database Schema
-- Database Engine: SQLite 3

PRAGMA foreign_keys = ON;

-- 1. Users / Doctors Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'DOCTOR',
    specialization TEXT,
    hospital TEXT,
    avatar TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    mrn TEXT UNIQUE NOT NULL,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    dob TEXT NOT NULL,
    gender TEXT NOT NULL,
    bloodGroup TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    emergencyContact TEXT,
    insurance TEXT,
    primaryDoctor TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients(mrn);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(lastName, firstName);

-- 3. Patient Documents Metadata Table
CREATE TABLE IF NOT EXISTS patient_documents (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL,
    documentType TEXT NOT NULL, -- PDF, MRI, CT, X-Ray, ECG, Images, Prescriptions, Insurance, Gov ID
    title TEXT NOT NULL,
    filePath TEXT NOT NULL,
    fileSize INTEGER,
    mimeType TEXT,
    uploadedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_documents_patient ON patient_documents(patientId);

-- 4. Medical History Table
CREATE TABLE IF NOT EXISTS medical_history (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL,
    condition TEXT NOT NULL,
    diagnosedDate TEXT,
    resolved INTEGER NOT NULL DEFAULT 0, -- 0 for false, 1 for true
    notes TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
);

-- 5. Family History Table
CREATE TABLE IF NOT EXISTS family_history (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL,
    relation TEXT NOT NULL,
    condition TEXT NOT NULL,
    notes TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
);

-- 6. Lifestyle Table
CREATE TABLE IF NOT EXISTS lifestyle (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL UNIQUE,
    smokingStatus TEXT,
    alcoholUsage TEXT,
    exerciseFrequency TEXT,
    dietaryNotes TEXT,
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
);

-- 7. Allergies Table
CREATE TABLE IF NOT EXISTS allergies (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL,
    allergen TEXT NOT NULL,
    reaction TEXT,
    severity TEXT CHECK(severity IN ('MILD', 'MODERATE', 'SEVERE', 'ANAPHYLAXIS')),
    diagnosedDate TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
);

-- 8. Current Medications Table
CREATE TABLE IF NOT EXISTS current_medications (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL,
    medicationName TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    startDate TEXT,
    prescribedBy TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
);

-- 9. Past Medications Table
CREATE TABLE IF NOT EXISTS past_medications (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL,
    medicationName TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    startDate TEXT,
    endDate TEXT,
    reasonForDiscontinuation TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
);

-- 10. Vaccinations Table
CREATE TABLE IF NOT EXISTS vaccinations (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL,
    vaccineName TEXT NOT NULL,
    administeredDate TEXT NOT NULL,
    doseNumber TEXT,
    notes TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
);

-- 11. Lab Reports Table
CREATE TABLE IF NOT EXISTS lab_reports (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL,
    visitId TEXT,
    testName TEXT NOT NULL,
    category TEXT,
    resultValue TEXT NOT NULL,
    unit TEXT,
    referenceRange TEXT,
    isAbnormal INTEGER NOT NULL DEFAULT 0,
    reportDate TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (visitId) REFERENCES visits(id) ON DELETE SET NULL
);

-- 12. Imaging Table
CREATE TABLE IF NOT EXISTS imaging (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL,
    visitId TEXT,
    modality TEXT NOT NULL, -- MRI, CT, X-Ray, Ultrasound, ECG, etc.
    bodyPart TEXT NOT NULL,
    findings TEXT NOT NULL,
    impression TEXT,
    filePath TEXT,
    performedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (visitId) REFERENCES visits(id) ON DELETE SET NULL
);

-- 13. Vitals Table
CREATE TABLE IF NOT EXISTS vitals (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL,
    visitId TEXT,
    bpSystolic INTEGER,
    bpDiastolic INTEGER,
    heartRate INTEGER,
    respRate INTEGER,
    temperature REAL,
    spO2 INTEGER,
    recordedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (visitId) REFERENCES visits(id) ON DELETE SET NULL
);

-- 14. Visits Table
CREATE TABLE IF NOT EXISTS visits (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL,
    doctorId TEXT,
    visitStatus TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK(visitStatus IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    chiefComplaint TEXT,
    startedAt TEXT NOT NULL DEFAULT (datetime('now')),
    endedAt TEXT,
    symptoms TEXT, -- JSON Array string
    diagnosis TEXT, -- JSON Array/Object string
    medicationsOrdered TEXT, -- JSON Array string
    testsOrdered TEXT, -- JSON Array string
    researchFindings TEXT, -- JSON Array string
    riskAssessment TEXT, -- JSON Object string
    aiSummary TEXT,
    clinicalNotes TEXT,
    followUpPlan TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctorId) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patientId);
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(visitStatus);

-- 15. Transcripts Table
CREATE TABLE IF NOT EXISTS transcripts (
    id TEXT PRIMARY KEY,
    visitId TEXT NOT NULL,
    speaker TEXT NOT NULL CHECK(speaker IN ('Doctor', 'Patient', 'System')),
    text TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 0.95,
    isFinal INTEGER NOT NULL DEFAULT 1,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (visitId) REFERENCES visits(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transcripts_visit ON transcripts(visitId);

-- 16. Supervisor Executions Table
CREATE TABLE IF NOT EXISTS supervisor_executions (
    id TEXT PRIMARY KEY,
    visitId TEXT NOT NULL,
    patientId TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
    planSummary TEXT,
    startedAt TEXT NOT NULL DEFAULT (datetime('now')),
    completedAt TEXT,
    FOREIGN KEY (visitId) REFERENCES visits(id) ON DELETE CASCADE,
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
);

-- 17. Agent Executions Table
CREATE TABLE IF NOT EXISTS agent_executions (
    id TEXT PRIMARY KEY,
    supervisorExecutionId TEXT NOT NULL,
    agentName TEXT NOT NULL, -- history, medication, research, gap, report
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
    startedAt TEXT NOT NULL DEFAULT (datetime('now')),
    completedAt TEXT,
    FOREIGN KEY (supervisorExecutionId) REFERENCES supervisor_executions(id) ON DELETE CASCADE
);

-- 18. Agent Outputs Table
CREATE TABLE IF NOT EXISTS agent_outputs (
    id TEXT PRIMARY KEY,
    agentExecutionId TEXT NOT NULL,
    outputPayload TEXT NOT NULL, -- JSON string
    evidence TEXT, -- JSON string
    confidence REAL DEFAULT 0.95,
    reasoningMetadata TEXT, -- JSON string
    toolsCalled TEXT, -- JSON string
    resourcesUsed TEXT, -- JSON string
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (agentExecutionId) REFERENCES agent_executions(id) ON DELETE CASCADE
);

-- 19. Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    visitId TEXT NOT NULL,
    patientId TEXT NOT NULL,
    reportType TEXT NOT NULL CHECK(reportType IN ('DISCHARGE_SUMMARY', 'SOAP_NOTE', 'REFERRAL', 'PRESCRIPTION', 'CLINICAL_SUMMARY')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'FINALIZED', 'SIGNED')),
    generatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    signedAt TEXT,
    FOREIGN KEY (visitId) REFERENCES visits(id) ON DELETE CASCADE,
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reports_visit ON reports(visitId);
CREATE INDEX IF NOT EXISTS idx_reports_patient ON reports(patientId);

-- 20. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    userId TEXT,
    action TEXT NOT NULL,
    entityType TEXT NOT NULL,
    entityId TEXT,
    details TEXT, -- JSON string
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entityType, entityId);

-- 21. Intake Packages Table (Autonomous Inbox Monitoring)
CREATE TABLE IF NOT EXISTS intake_packages (
    id TEXT PRIMARY KEY,
    packageNumber TEXT UNIQUE NOT NULL,
    senderEmail TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK(status IN ('RECEIVED', 'PROCESSING', 'PENDING_VERIFICATION', 'APPROVED', 'REJECTED', 'MERGED')),
    receivedAt TEXT NOT NULL DEFAULT (datetime('now')),
    extractedPatient TEXT, -- JSON string of 17 extracted fields
    mergedPatientId TEXT,
    reviewedBy TEXT,
    reviewedAt TEXT,
    rejectionReason TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (mergedPatientId) REFERENCES patients(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_intake_status ON intake_packages(status);

-- 22. Intake Attachments Table
CREATE TABLE IF NOT EXISTS intake_attachments (
    id TEXT PRIMARY KEY,
    packageId TEXT NOT NULL,
    fileName TEXT NOT NULL,
    documentType TEXT NOT NULL, -- PDF, PNG, JPEG, Medical Forms, Insurance, MRI, CT, ECG, Blood Reports, Prescriptions, Referral Letter
    filePath TEXT NOT NULL,
    fileSize INTEGER,
    mimeType TEXT,
    ocrText TEXT, -- Raw OCR extracted text
    extractedMetadata TEXT, -- JSON string of extracted entities
    uploadedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (packageId) REFERENCES intake_packages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_intake_attachments_pkg ON intake_attachments(packageId);

