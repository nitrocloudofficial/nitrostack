import { db } from './connection.js';

export interface User {
    id: number;
    username: string;
    email: string;
    password_hash: string;
    role: string;
    created_at: string;
}

export interface UploadedDocument {
    id: number;
    user_id: number;
    filename: string;
    file_path: string;
    file_type: string;
    file_size: number;
    content_preview?: string;
    created_at: string;
}

export interface Evidence {
    id: number;
    doc_id: number;
    entity: string;
    claim: string;
    category: string;
    value?: string;
    credibility_score: number;
    source_location?: string;
    status: string;
    created_at: string;
}

export interface Conflict {
    id: number;
    decision_id?: number;
    doc_id_1?: number;
    doc_id_2?: number;
    description: string;
    severity: string;
    conflict_type: string;
    status: string;
    created_at: string;
}

export interface Decision {
    id: number;
    user_id?: number;
    query: string;
    decision_status: string;
    confidence_score: number;
    explanation: string;
    evidence_graph_data?: string;
    agent_debate_data?: string;
    created_at: string;
}

export interface Report {
    id: number;
    decision_id: number;
    file_path: string;
    format: string;
    created_at: string;
}

export interface AuditLog {
    id: number;
    user_id?: number;
    action: string;
    ip_address?: string;
    created_at: string;
}

export interface AgentLog {
    id: number;
    decision_id: number;
    agent_name: string;
    log_message: string;
    status: string;
    created_at: string;
}

export interface Setting {
    id: number;
    key: string;
    value: string;
    created_at: string;
}

// --- User CRUD ---
export async function getUserById(userId: number): Promise<User | undefined> {
    return db.get<User>('SELECT * FROM users WHERE id = ?', [userId]);
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
    return db.get<User>('SELECT * FROM users WHERE username = ?', [username]);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
    return db.get<User>('SELECT * FROM users WHERE email = ?', [email]);
}

export async function createUser(username: string, email: string, passwordHash: string, role: string = 'user'): Promise<User> {
    const now = new Date().toISOString();
    const result = await db.run(
        'INSERT INTO users (username, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
        [username, email, passwordHash, role, now]
    );
    const user = await getUserById(result.lastID);
    if (!user) throw new Error('Failed to retrieve newly created user');
    return user;
}

export async function getUsers(skip: number = 0, limit: number = 100): Promise<User[]> {
    return db.all<User>('SELECT * FROM users LIMIT ? OFFSET ?', [limit, skip]);
}

// --- Document CRUD ---
export async function createDocument(
    userId: number,
    filename: string,
    filePath: string,
    fileType: string,
    fileSize: number,
    contentPreview?: string
): Promise<UploadedDocument> {
    const now = new Date().toISOString();
    const result = await db.run(
        'INSERT INTO uploaded_documents (user_id, filename, file_path, file_type, file_size, content_preview, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, filename, filePath, fileType, fileSize, contentPreview || null, now]
    );
    const doc = await getDocumentById(result.lastID);
    if (!doc) throw new Error('Failed to retrieve newly created document');
    return doc;
}

export async function getDocuments(skip: number = 0, limit: number = 100): Promise<UploadedDocument[]> {
    return db.all<UploadedDocument>('SELECT * FROM uploaded_documents ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, skip]);
}

export async function getDocumentById(docId: number): Promise<UploadedDocument | undefined> {
    return db.get<UploadedDocument>('SELECT * FROM uploaded_documents WHERE id = ?', [docId]);
}

export async function deleteDocument(docId: number): Promise<boolean> {
    const doc = await getDocumentById(docId);
    if (doc) {
        await db.run('DELETE FROM uploaded_documents WHERE id = ?', [docId]);
        return true;
    }
    return false;
}

// --- Evidence CRUD ---
export async function createEvidence(
    docId: number,
    entity: string,
    claim: string,
    category: string,
    value?: string | null,
    credibilityScore: number = 1.0,
    sourceLocation?: string | null,
    status: string = 'verified'
): Promise<Evidence> {
    const now = new Date().toISOString();
    const result = await db.run(
        'INSERT INTO evidence (doc_id, entity, claim, category, value, credibility_score, source_location, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [docId, entity, claim, category, value || null, credibilityScore, sourceLocation || null, status, now]
    );
    const ev = await db.get<Evidence>('SELECT * FROM evidence WHERE id = ?', [result.lastID]);
    if (!ev) throw new Error('Failed to retrieve newly created evidence');
    return ev;
}

export async function getEvidenceByDoc(docId: number): Promise<Evidence[]> {
    return db.all<Evidence>('SELECT * FROM evidence WHERE doc_id = ?', [docId]);
}

export async function getAllEvidence(skip: number = 0, limit: number = 100): Promise<Evidence[]> {
    return db.all<Evidence>('SELECT * FROM evidence LIMIT ? OFFSET ?', [limit, skip]);
}

export async function deleteEvidenceByDoc(docId: number): Promise<void> {
    await db.run('DELETE FROM evidence WHERE doc_id = ?', [docId]);
}

// --- Conflict CRUD ---
export async function createConflict(
    decisionId: number | null,
    docId1: number | null,
    docId2: number | null,
    description: string,
    severity: string = 'medium',
    conflictType: string = 'version_mismatch',
    status: string = 'detected'
): Promise<Conflict> {
    const now = new Date().toISOString();
    const result = await db.run(
        'INSERT INTO conflicts (decision_id, doc_id_1, doc_id_2, description, severity, conflict_type, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [decisionId, docId1, docId2, description, severity, conflictType, status, now]
    );
    const conflict = await db.get<Conflict>('SELECT * FROM conflicts WHERE id = ?', [result.lastID]);
    if (!conflict) throw new Error('Failed to retrieve newly created conflict');
    return conflict;
}

export async function getConflictsByDecision(decisionId: number): Promise<Conflict[]> {
    return db.all<Conflict>('SELECT * FROM conflicts WHERE decision_id = ?', [decisionId]);
}

export async function getAllConflicts(skip: number = 0, limit: number = 100): Promise<Conflict[]> {
    return db.all<Conflict>('SELECT * FROM conflicts ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, skip]);
}

// --- Decision CRUD ---
export async function createDecision(
    userId: number | null,
    query: string,
    decisionStatus: string,
    confidenceScore: number,
    explanation: string,
    evidenceGraphData?: string | null,
    agentDebateData?: string | null
): Promise<Decision> {
    const now = new Date().toISOString();
    const result = await db.run(
        'INSERT INTO decisions (user_id, query, decision_status, confidence_score, explanation, evidence_graph_data, agent_debate_data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, query, decisionStatus, confidenceScore, explanation, evidenceGraphData || null, agentDebateData || null, now]
    );
    const decision = await getDecisionById(result.lastID);
    if (!decision) throw new Error('Failed to retrieve newly created decision');
    return decision;
}

export async function getDecisions(skip: number = 0, limit: number = 100): Promise<Decision[]> {
    return db.all<Decision>('SELECT * FROM decisions ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, skip]);
}

export async function getDecisionById(decisionId: number): Promise<Decision | undefined> {
    return db.get<Decision>('SELECT * FROM decisions WHERE id = ?', [decisionId]);
}

export async function updateDecision(
    decisionId: number,
    updateFields: Partial<Omit<Decision, 'id' | 'created_at'>>
): Promise<Decision> {
    const keys = Object.keys(updateFields);
    if (keys.length === 0) {
        const dec = await getDecisionById(decisionId);
        if (!dec) throw new Error('Decision not found');
        return dec;
    }
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const params = keys.map(k => (updateFields as any)[k]).concat(decisionId);
    await db.run(`UPDATE decisions SET ${setClause} WHERE id = ?`, params);
    const dec = await getDecisionById(decisionId);
    if (!dec) throw new Error('Failed to retrieve updated decision');
    return dec;
}

// --- Report CRUD ---
export async function createReport(decisionId: number, filePath: string, format: string): Promise<Report> {
    const now = new Date().toISOString();
    const result = await db.run(
        'INSERT INTO reports (decision_id, file_path, format, created_at) VALUES (?, ?, ?, ?)',
        [decisionId, filePath, format, now]
    );
    const rep = await db.get<Report>('SELECT * FROM reports WHERE id = ?', [result.lastID]);
    if (!rep) throw new Error('Failed to retrieve newly created report');
    return rep;
}

export async function getReportsByDecision(decisionId: number): Promise<Report[]> {
    return db.all<Report>('SELECT * FROM reports WHERE decision_id = ?', [decisionId]);
}

// --- AuditLog CRUD ---
export async function createAuditLog(userId: number | null, action: string, ipAddress?: string | null): Promise<AuditLog> {
    const now = new Date().toISOString();
    const result = await db.run(
        'INSERT INTO audit_logs (user_id, action, ip_address, created_at) VALUES (?, ?, ?, ?)',
        [userId, action, ipAddress || null, now]
    );
    const log = await db.get<AuditLog>('SELECT * FROM audit_logs WHERE id = ?', [result.lastID]);
    if (!log) throw new Error('Failed to retrieve newly created audit log');
    return log;
}

export async function getAuditLogs(skip: number = 0, limit: number = 100): Promise<AuditLog[]> {
    return db.all<AuditLog>('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, skip]);
}

// --- AgentLog CRUD ---
export async function createAgentLog(decisionId: number, agentName: string, logMessage: string, status: string = 'INFO'): Promise<AgentLog> {
    const now = new Date().toISOString();
    const result = await db.run(
        'INSERT INTO agent_logs (decision_id, agent_name, log_message, status, created_at) VALUES (?, ?, ?, ?, ?)',
        [decisionId, agentName, logMessage, status, now]
    );
    const log = await db.get<AgentLog>('SELECT * FROM agent_logs WHERE id = ?', [result.lastID]);
    if (!log) throw new Error('Failed to retrieve newly created agent log');
    return log;
}

export async function getAgentLogsByDecision(decisionId: number): Promise<AgentLog[]> {
    return db.all<AgentLog>('SELECT * FROM agent_logs WHERE decision_id = ? ORDER BY created_at ASC', [decisionId]);
}

// --- Settings CRUD ---
export async function getSetting(key: string): Promise<string | undefined> {
    const setting = await db.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
    return setting?.value;
}

export async function setSetting(key: string, value: string): Promise<Setting> {
    const now = new Date().toISOString();
    const existing = await db.get<{ id: number }>('SELECT id FROM settings WHERE key = ?', [key]);
    if (existing) {
        await db.run('UPDATE settings SET value = ? WHERE key = ?', [value, key]);
    } else {
        await db.run('INSERT INTO settings (key, value, created_at) VALUES (?, ?, ?)', [key, value, now]);
    }
    const setting = await db.get<Setting>('SELECT * FROM settings WHERE key = ?', [key]);
    if (!setting) throw new Error('Failed to retrieve settings');
    return setting;
}
