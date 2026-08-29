// ===== Authoritative Sources =====
export interface AuthoritativeSource {
  id: string;                        // e.g., "discount-policy"
  title: string;                     // e.g., "Enterprise Discount Policy"
  department: string;                // e.g., "Finance"
  version: string;                   // e.g., "2.0"
  effective_date: string;            // ISO date
  facts: Record<string, string>;     // e.g., { "maximum_discount": "10%" }
  metadata: {
    owner: string;
    last_updated: string;
    classification: 'public' | 'internal' | 'confidential';
  };
}

// ===== Documents & Claims =====
export interface Document {
  id: string;                        // e.g., "sales-playbook"
  title: string;                     // e.g., "Enterprise Sales Playbook"
  department: string;                // e.g., "Sales"
  type: 'playbook' | 'guide' | 'template' | 'training' | 'sop' | 'policy';
  last_reviewed: string;             // ISO date
  criticality: 'low' | 'medium' | 'high' | 'critical';
  customer_facing: boolean;
  owner?: string;                    // e.g., "VP Sales Operations" — for remediation routing
  claims: Claim[];
}

export interface Claim {
  id: string;                        // e.g., "sales-playbook.claim-1"
  text: string;                      // e.g., "Sales can provide discounts up to 20%."
  depends_on: string | null;         // e.g., "discount-policy.maximum_discount" or null
  section: string;                   // e.g., "Pricing Guidelines"
}

// ===== Dependencies =====
export interface Dependency {
  source_id: string;                 // Authoritative source ID
  fact_key: string;                  // Fact within the source
  dependent_document_id: string;     // Document that depends on this fact
  dependent_claim_id: string;        // Specific claim
  dependency_type: 'direct' | 'indirect';
}

// ===== Change Detection =====
export interface FactChange {
  source_id: string;
  source_title: string;
  fact_key: string;
  old_value: string;
  new_value: string;
  changed: boolean;
}

// ===== Validation =====
export type ValidationStatus = 'VALID' | 'CONFLICT' | 'AMBIGUOUS';

export interface ClaimValidation {
  document_id: string;
  document_title: string;
  claim_id: string;
  claim_text: string;
  depends_on: string | null;
  authoritative_value: string;
  status: ValidationStatus;
  explanation: string;
}

// ===== Risk =====
export interface RiskAssessment {
  document_id: string;
  document_title: string;
  claim_id: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_score: number;                // 0–100
  factors: RiskFactors;
  reasons: string[];
}

export interface RiskFactors {
  customer_facing: boolean;
  financial_impact: boolean;
  compliance_impact: boolean;
  operational_impact: boolean;
  confirmed_conflict: boolean;
  document_criticality: string;
}

// ===== Remediation =====
export type UpdateStatus = 'AWAITING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'APPLIED';

export interface ProposedUpdate {
  id: string;                        // UUID
  document_id: string;
  document_title: string;
  claim_id: string;
  current_text: string;
  suggested_text: string;
  authoritative_source: string;
  authoritative_fact: string;
  authoritative_value: string;
  risk_level: string;
  status: UpdateStatus;
  proposed_at: string;               // ISO timestamp
}

// ===== Audit =====
export interface AuditEntry {
  id: string;                        // UUID
  timestamp: string;                 // ISO timestamp
  action: 'UPDATE_APPROVED' | 'UPDATE_REJECTED' | 'UPDATE_APPLIED';
  document_id: string;
  document_title: string;
  claim_id: string;
  old_value: string;
  new_value: string;
  authoritative_source: string;
  reason: string;
  risk_level: string;
}

// ===== Provenance =====
export interface ProvenanceChain {
  claim: {
    document_id: string;
    document_title: string;
    claim_id: string;
    claim_text: string;
  };
  depends_on_fact: string;
  source_history: {
    source_id: string;
    source_title: string;
    version: string;
    value: string;
    status: 'current' | 'superseded';
  }[];
  is_current: boolean;
  conclusion: string;
}

// ===== Dependency Traversal (used by DependencyService) =====

export interface AffectedClaim {
  claim_id: string;
  claim_text: string;
  section: string;
  dependency_type: 'direct' | 'indirect';
}

export interface AffectedDocument {
  document_id: string;
  document_title: string;
  department: string;
  criticality: string;
  customer_facing: boolean;
  affected_claims: AffectedClaim[];
}

export interface AffectedKnowledge {
  source_id: string;
  fact_key: string;
  current_value: string;
  total_affected_documents: number;
  total_affected_claims: number;
  affected: AffectedDocument[];
}

export interface DocumentDependency {
  source_id: string;
  source_title: string;
  fact_key: string;
  fact_value: string;
  claim_id: string;
  dependency_type: 'direct' | 'indirect';
}

export interface DependencyTreeNode {
  fact_key: string;
  fact_value: string;
  dependent_documents: {
    document_id: string;
    document_title: string;
    claim_id: string;
  }[];
}

export interface DependencyTree {
  source_id: string;
  source_title: string;
  facts: DependencyTreeNode[];
}

// ===== Conflict Report (used by ConflictService, Phase 5) =====

export interface ConflictResult {
  document_id: string;
  document_title: string;
  claim_id: string;
  claim_text: string;
  status: ValidationStatus;
  explanation: string;
}

export interface ConflictReport {
  source_id: string;
  fact_key: string;
  authoritative_value: string;
  total_claims_checked: number;
  conflicts: number;
  valid: number;
  ambiguous: number;
  results: ConflictResult[];
}

// ===== High-Level Investigation (Phase 8) =====

export interface InvestigationSummary {
  sources_checked: number;
  changes_detected: number;
  documents_affected: number;
  conflicts_found: number;
  critical_risks: number;
  remediations_proposed: number;
}

export interface InvestigationReport {
  investigation_summary: InvestigationSummary;
  changes: FactChange[];
  conflicts: ConflictResult[];
  risk_assessments: RiskAssessment[];
  proposed_remediations: ProposedUpdate[];
}
