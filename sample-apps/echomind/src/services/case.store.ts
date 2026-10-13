export interface CaseRecord {
  caseId: string;
  title: string;
  file: string;
  project: string;
  status: string;
  priority: string;
  progress: number;
  confidence: number;
  createdAt: string;
  primaryAuthor: string;
  question: string;
}

export class CaseStore {
  private static cases: CaseRecord[] = [
    {
      caseId: "CASE-001",
      title: "Payment service failure after July deployment",
      question: "Why did payment service fail?",
      file: "PaymentService.ts",
      project: "Mercury Payments",
      status: "Completed",
      priority: "High",
      progress: 100,
      confidence: 98,
      createdAt: "2023-07-15T10:00:00Z",
      primaryAuthor: "Vikram Patel"
    },
    {
      caseId: "CASE-002",
      title: "OAuth validation bypass vulnerability scan",
      question: "Who changed the authentication policy that led to unauthorized access?",
      file: "AuthController.ts",
      project: "Identity Core",
      status: "Completed",
      priority: "Critical",
      progress: 100,
      confidence: 99,
      createdAt: "2023-07-18T14:30:00Z",
      primaryAuthor: "Rahul Kumar"
    },
    {
      caseId: "CASE-003",
      title: "Database connection pool exhaustion analysis",
      question: "What caused database connection pool exhaustion?",
      file: "DatabaseService.ts",
      project: "Data Infrastructure",
      status: "Completed",
      priority: "Medium",
      progress: 100,
      confidence: 97,
      createdAt: "2023-07-20T09:15:00Z",
      primaryAuthor: "David Chen"
    }
  ];

  static addCase(newCase: CaseRecord): void {
    // Avoid duplicate IDs
    const exists = this.cases.some((c) => c.caseId === newCase.caseId);
    if (!exists) {
      this.cases.unshift(newCase);
    }
  }

  static getCases(): CaseRecord[] {
    return [...this.cases];
  }
}
