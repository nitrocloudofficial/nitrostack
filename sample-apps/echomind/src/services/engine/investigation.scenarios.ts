import { InvestigationCategory, InvestigationScenario } from "./investigation.types.js";

export class InvestigationScenarioFactory {
  private static scenarioMap: Record<InvestigationCategory, (question: string, file?: string) => InvestigationScenario> = {
    Authentication: (question, customFile) => ({
      category: "Authentication",
      project: "Identity Core",
      file: customFile || "AuthController.ts",
      primaryAuthor: { id: "EMP-101", name: "Rahul Kumar", role: "Staff Security Engineer", team: "SecOps" },
      summaryTemplate: `Investigation into authentication security regression triggered by user question: "${question}". Analyzed OAuth token verification logs, security audit reviews, and identity provider configuration commits.`,
      rootCauseTemplate: `Commit 8f23bc by Rahul Kumar disabled mandatory role validation while implementing OAuth token caching optimization. The change passed security review but unintentionally allowed elevated token bypass for internal endpoints.`,
      recommendations: [
        "Re-enable mandatory role validation in AuthController middleware.",
        "Require two peer security reviews for any Auth token verification changes.",
        "Add automated regression test suite covering OAuth token scope edge cases."
      ],
      baseConfidence: 98,
      commits: [
        { id: "c-auth-01", message: "Refactor OAuth token verification pipeline", date: "2023-07-10T09:30:00Z", authorId: "EMP-101", file: customFile || "AuthController.ts", project: "Identity Core", meetingId: "m-auth-01", documentId: "d-auth-01" },
        { id: "c-auth-02", message: "Optimize JWT session cache lookup", date: "2023-07-12T14:15:00Z", authorId: "EMP-101", file: customFile || "AuthController.ts", project: "Identity Core", meetingId: "m-auth-02", documentId: "d-auth-02" }
      ],
      meetings: [
        { id: "m-auth-01", title: "OAuth 2.1 Security & Session Performance Sync", decision: "Approved session token caching to reduce identity provider latency.", date: "2023-07-09T16:00:00Z" },
        { id: "m-auth-02", title: "Emergency Security Incident Review", decision: "Identify unauthorized token privilege escalation in AuthController.", date: "2023-07-14T11:00:00Z" }
      ],
      documents: [
        { id: "d-auth-01", title: "Identity Core Auth Policy Specification", summary: "Mandates strict JWT signature checks and explicit scope validation per endpoint." },
        { id: "d-auth-02", title: "Post-Incident Audit Report #402", summary: "Documented token privilege bypass caused by unvalidated internal header flags." }
      ]
    }),

    Authorization: (question, customFile) => ({
      category: "Authorization",
      project: "Access Control Core",
      file: customFile || "RBACService.ts",
      primaryAuthor: { id: "EMP-102", name: "Ananya Sharma", role: "Principal Systems Architect", team: "Security Architecture" },
      summaryTemplate: `Authorization policy investigation for question: "${question}". Analyzed role-based access matrix, policy engine commits, and privilege escalation reports.`,
      rootCauseTemplate: `Commit a419ef by Ananya Sharma altered default RBAC wildcard evaluations during tenant isolation refactoring, causing scoped read permissions to grant admin write access.`,
      recommendations: [
        "Restore strict explicit permission matching in RBACService.ts.",
        "Implement automated policy validation via Open Policy Agent (OPA).",
        "Perform full audit of high-privilege service account tokens."
      ],
      baseConfidence: 96,
      commits: [
        { id: "c-authz-01", message: "Update RBAC policy parser for multi-tenant isolation", date: "2023-07-11T10:00:00Z", authorId: "EMP-102", file: customFile || "RBACService.ts", project: "Access Control Core", meetingId: "m-authz-01", documentId: "d-authz-01" },
        { id: "c-authz-02", message: "Enable wildcard scope matching for microservices", date: "2023-07-13T16:45:00Z", authorId: "EMP-102", file: customFile || "RBACService.ts", project: "Access Control Core", documentId: "d-authz-02" }
      ],
      meetings: [
        { id: "m-authz-01", title: "Multi-Tenant Authorization Alignment", decision: "Standardized tenant isolation rules using wildcard permission scopes.", date: "2023-07-10T14:00:00Z" }
      ],
      documents: [
        { id: "d-authz-01", title: "Enterprise RBAC Security Model", summary: "Defines strict principle of least privilege across all service API boundaries." },
        { id: "d-authz-02", title: "Authorization Audit Logs", summary: "Recorded elevated admin permission grants on non-admin user sessions." }
      ]
    }),

    Payment: (question, customFile) => ({
      category: "Payment",
      project: "Mercury Payments",
      file: customFile || "PaymentService.ts",
      primaryAuthor: { id: "EMP-103", name: "Vikram Patel", role: "Senior Payments Engineer", team: "FinTech Platform" },
      summaryTemplate: `Payment gateway failure investigation for query: "${question}". Evaluated payment processing logs, third-party webhook signing verification, and transaction state handling.`,
      rootCauseTemplate: `Stripe gateway configuration commit e912bc introduced during Release 2.3 caused token verification failures due to an outdated webhook signing secret in PaymentService.ts.`,
      recommendations: [
        "Rollback payment gateway webhook configuration to active signing secret.",
        "Implement automated payment payload integration test suite.",
        "Setup real-time alert routing for payment gateway status code 402/403 spikes."
      ],
      baseConfidence: 98,
      commits: [
        { id: "c-pay-01", message: "Upgrade Stripe SDK & webhook handler", date: "2023-07-14T08:20:00Z", authorId: "EMP-103", file: customFile || "PaymentService.ts", project: "Mercury Payments", meetingId: "m-pay-01", documentId: "d-pay-01" },
        { id: "c-pay-02", message: "Add fallback retry for failed payment charges", date: "2023-07-15T11:30:00Z", authorId: "EMP-103", file: customFile || "PaymentService.ts", project: "Mercury Payments", documentId: "d-pay-02" }
      ],
      meetings: [
        { id: "m-pay-01", title: "Payment Gateway v2 API Migration Sync", decision: "Migrate Stripe payment intent verification to webhook-based async confirmation.", date: "2023-07-13T15:00:00Z" }
      ],
      documents: [
        { id: "d-pay-01", title: "Payment Gateway Integration Guide", summary: "Outlines strict PCI-DSS compliance requirements and signing key rotation policies." },
        { id: "d-pay-02", title: "Incident Report #309 - Transaction Failures", summary: "Detailed 14% drop in successful checkout authorizations following SDK patch." }
      ]
    }),

    Checkout: (question, customFile) => ({
      category: "Checkout",
      project: "Storefront Checkout",
      file: customFile || "CheckoutController.ts",
      primaryAuthor: { id: "EMP-104", name: "Sarah Jenkins", role: "Lead E-Commerce Engineer", team: "Checkout Experience" },
      summaryTemplate: `Checkout funnel breakdown investigation into: "${question}". Analyzed order reservation locks, cart state persistence, and inventory synchronization timeouts.`,
      rootCauseTemplate: `Commit f7281a by Sarah Jenkins introduced an unindexed database row lock during inventory reservation, causing concurrent checkout requests to hit a 30-second gateway timeout.`,
      recommendations: [
        "Replace synchronous DB row locks with optimistic concurrency control.",
        "Add Redis lock timeout with automatic lock release on checkout failure.",
        "Implement end-to-end checkout load testing prior to peak traffic events."
      ],
      baseConfidence: 94,
      commits: [
        { id: "c-chk-01", message: "Enforce strict inventory reservation locks during checkout", date: "2023-07-16T13:10:00Z", authorId: "EMP-104", file: customFile || "CheckoutController.ts", project: "Storefront Checkout", meetingId: "m-chk-01", documentId: "d-chk-01" }
      ],
      meetings: [
        { id: "m-chk-01", title: "Inventory Overselling Prevention Meeting", decision: "Mandate pessimistic locking on checkout item reservation." , date: "2023-07-15T10:00:00Z"}
      ],
      documents: [
        { id: "d-chk-01", title: "Checkout Performance & Lock SLA", summary: "Mandates max 500ms response time for cart completion and inventory allocation." }
      ]
    }),

    Database: (question, customFile) => ({
      category: "Database",
      project: "Data Infrastructure",
      file: customFile || "DatabaseService.ts",
      primaryAuthor: { id: "EMP-105", name: "David Chen", role: "Principal Database Administrator", team: "Core Data" },
      summaryTemplate: `Database performance degradation analysis for: "${question}". Analyzed slow query telemetry, connection pool metrics, and transaction lock contention logs.`,
      rootCauseTemplate: `Commit d8819c omitted an index on the foreign key field during schema migration 042, causing full table scans and database connection pool exhaustion under high concurrent load.`,
      recommendations: [
        "Deploy concurrent index migration on foreign key fields immediately.",
        "Increase database connection pool max size and configure idle connection reaping.",
        "Enable query execution plan validation in CI schema migration checks."
      ],
      baseConfidence: 97,
      commits: [
        { id: "c-db-01", message: "Execute Schema Migration 042: Add user metadata relations", date: "2023-07-12T07:45:00Z", authorId: "EMP-105", file: customFile || "DatabaseService.ts", project: "Data Infrastructure", meetingId: "m-db-01", documentId: "d-db-01" }
      ],
      meetings: [
        { id: "m-db-01", title: "Database Scale & Connection Pool Tuning", decision: "Approved new schema additions for user preferences and transaction audit logs.", date: "2023-07-11T11:30:00Z" }
      ],
      documents: [
        { id: "d-db-01", title: "PostgreSQL Indexing Standards & Runbook", summary: "Requires explicit index creation on all FK relationships and soft-delete columns." }
      ]
    }),

    Deployment: (question, customFile) => ({
      category: "Deployment",
      project: "Deployment Engine",
      file: customFile || "DeployPipeline.yml",
      primaryAuthor: { id: "EMP-106", name: "Alex Rivera", role: "Senior DevOps Engineer", team: "Release Engineering" },
      summaryTemplate: `Deployment pipeline failure investigation for question: "${question}". Inspected automated deployment manifests, environment variable injects, and container rollouts.`,
      rootCauseTemplate: `Commit 5c31ab by Alex Rivera updated production release configuration but omitted the required DB_SSL_CERT environment variable, causing deployed pods to fail health checks on boot.`,
      recommendations: [
        "Restore DB_SSL_CERT in production secrets manager.",
        "Implement mandatory secret validation schema prior to triggering container deployment.",
        "Configure automated blue-green rollback upon consecutive health check failures."
      ],
      baseConfidence: 95,
      commits: [
        { id: "c-dep-01", message: "Streamline prod deployment environment secrets payload", date: "2023-07-17T15:20:00Z", authorId: "EMP-106", file: customFile || "DeployPipeline.yml", project: "Deployment Engine", meetingId: "m-dep-01", documentId: "d-dep-01" }
      ],
      meetings: [
        { id: "m-dep-01", title: "Production Release 2.4 Go/No-Go Sync", decision: "Proceed with secret payload refactoring to support multi-region deployments.", date: "2023-07-16T16:00:00Z" }
      ],
      documents: [
        { id: "d-dep-01", title: "Production Deployment Checklist & Secrets Policy", summary: "Specifies strict validation rules for required environment secrets across all stages." }
      ]
    }),

    Performance: (question, customFile) => ({
      category: "Performance",
      project: "Performance Core",
      file: customFile || "QueryOptimizer.ts",
      primaryAuthor: { id: "EMP-107", name: "Marcus Vance", role: "Staff Performance Engineer", team: "Platform Efficiency" },
      summaryTemplate: `High latency & bottleneck investigation for query: "${question}". Analyzed CPU flamegraphs, distributed tracing spans, and unthrottled API loops.`,
      rootCauseTemplate: `Commit b3091f by Marcus Vance disabled secondary Redis caching in QueryOptimizer.ts to fix stale data, resulting in an N+1 database call loop that spiked p99 latency to 4.2 seconds.`,
      recommendations: [
        "Re-enable Redis caching with active cache invalidation pub/sub triggers.",
        "Batch entity data fetching using DataLoader pattern.",
        "Set up p99 latency threshold alerts in Datadog."
      ],
      baseConfidence: 96,
      commits: [
        { id: "c-perf-01", message: "Bypass Redis cache for real-time order queries", date: "2023-07-18T10:15:00Z", authorId: "EMP-107", file: customFile || "QueryOptimizer.ts", project: "Performance Core", meetingId: "m-perf-01", documentId: "d-perf-01" }
      ],
      meetings: [
        { id: "m-perf-01", title: "Latency Reduction & Profiling Review", decision: "Investigate stale order status caused by asynchronous cache invalidation delay.", date: "2023-07-17T14:00:00Z" }
      ],
      documents: [
        { id: "d-perf-01", title: "API Latency SLA & Profiling Architecture", summary: "Enforces max 200ms p95 latency for core read endpoints across all services." }
      ]
    }),

    "Memory Leak": (question, customFile) => ({
      category: "Memory Leak",
      project: "Core Runtime",
      file: customFile || "StreamBuffer.ts",
      primaryAuthor: { id: "EMP-108", name: "Elena Rostova", role: "Principal Node.js Runtime Specialist", team: "Core Infrastructure" },
      summaryTemplate: `Node.js process heap crash investigation for query: "${question}". Evaluated V8 heap snapshots, event listener leak warnings, and unclosed socket connections.`,
      rootCauseTemplate: `Commit 4e1102 by Elena Rostova registered global event listeners inside request scope in StreamBuffer.ts without removing them on response completion, leading to unbounded heap growth and OOM crashes.`,
      recommendations: [
        "Unbind request event listeners in finally block or use abort controllers.",
        "Implement automatic V8 heap snapshot generation upon 85% heap limit reached.",
        "Configure heap memory ceiling alerts on service container pods."
      ],
      baseConfidence: 98,
      commits: [
        { id: "c-mem-01", message: "Add stream buffering listener for large payload downloads", date: "2023-07-19T11:40:00Z", authorId: "EMP-108", file: customFile || "StreamBuffer.ts", project: "Core Runtime", meetingId: "m-mem-01", documentId: "d-mem-01" }
      ],
      meetings: [
        { id: "m-mem-01", title: "Streaming Payload Architecture Review", decision: "Implement chunked buffering for file export API endpoints.", date: "2023-07-18T15:30:00Z" }
      ],
      documents: [
        { id: "d-mem-01", title: "Node.js Memory Leak Diagnostic Runbook", summary: "Outlines heap snapshot analysis and event listener lifecycle management guidelines." }
      ]
    }),

    Security: (question, customFile) => ({
      category: "Security",
      project: "Security Engineering",
      file: customFile || "CorsMiddleware.ts",
      primaryAuthor: { id: "EMP-101", name: "Rahul Kumar", role: "Staff Security Engineer", team: "SecOps" },
      summaryTemplate: `Security vulnerability assessment for query: "${question}". Inspected CORS origins, API gateway header configurations, and credential exposure reports.`,
      rootCauseTemplate: `Commit 99201f by Rahul Kumar added wildcard origin 'Access-Control-Allow-Origin: *' to CorsMiddleware.ts for local debugging but accidentally pushed it to production.`,
      recommendations: [
        "Replace wildcard CORS origin with dynamic whitelist of verified enterprise domains.",
        "Integrate automated SAST security scanner into pre-commit git hook.",
        "Conduct emergency API key secret rotation for compromised test domains."
      ],
      baseConfidence: 99,
      commits: [
        { id: "c-sec-01", message: "Allow cross-origin debugging requests for dev portal", date: "2023-07-20T08:10:00Z", authorId: "EMP-101", file: customFile || "CorsMiddleware.ts", project: "Security Engineering", meetingId: "m-sec-01", documentId: "d-sec-01" }
      ],
      meetings: [
        { id: "m-sec-01", title: "Developer Portal CORS Access Sync", decision: "Enable flexible CORS origins during local dev portal integration phase.", date: "2023-07-19T13:00:00Z" }
      ],
      documents: [
        { id: "d-sec-01", title: "Enterprise API Hardening Security Standard", summary: "Strictly forbids wildcard CORS origins on production endpoints handling sensitive user data." }
      ]
    }),

    "CI/CD": (question, customFile) => ({
      category: "CI/CD",
      project: "CI/CD Infrastructure",
      file: customFile || "WorkflowRunner.yml",
      primaryAuthor: { id: "EMP-106", name: "Alex Rivera", role: "Senior DevOps Engineer", team: "Release Engineering" },
      summaryTemplate: `Build pipeline collapse analysis for: "${question}". Inspected GitHub Actions runner logs, runner container images, and workflow step dependencies.`,
      rootCauseTemplate: `Commit d4af91 by Alex Rivera removed the required AWS_REGION environment variable from WorkflowRunner.yml, breaking automated integration test step execution.`,
      recommendations: [
        "Restore AWS_REGION environment variable in GitHub Actions secret context.",
        "Add pipeline linter step to validate workflow YAML schemas.",
        "Implement backup self-hosted runner pool."
      ],
      baseConfidence: 97,
      commits: [
        { id: "c-cicd-01", message: "Consolidate GitHub Actions pipeline steps", date: "2023-07-15T14:30:00Z", authorId: "EMP-106", file: customFile || "WorkflowRunner.yml", project: "CI/CD Infrastructure", meetingId: "m-cicd-01", documentId: "d-cicd-01" }
      ],
      meetings: [
        { id: "m-cicd-01", title: "CI/CD Pipeline Speed Optimization Sync", decision: "Streamline runner workflow files to reduce test execution duration by 30%.", date: "2023-07-14T10:00:00Z" }
      ],
      documents: [
        { id: "d-cicd-01", title: "CI/CD Pipeline Architecture & Matrix", summary: "Defines required environment variables and runner step execution prerequisites." }
      ]
    }),

    "Build Failure": (question, customFile) => ({
      category: "Build Failure",
      project: "Build & Tooling",
      file: customFile || "package.json",
      primaryAuthor: { id: "EMP-104", name: "Sarah Jenkins", role: "Lead E-Commerce Engineer", team: "Checkout Experience" },
      summaryTemplate: `TypeScript build compilation failure investigation for query: "${question}". Analyzed compiler diagnostics, package lock changes, and breaking type definitions.`,
      rootCauseTemplate: `Commit 77b102 by Sarah Jenkins updated external dependency '@types/node' to v20 without updating TypeScript compiler target settings, triggering 42 syntax compilation errors across core models.`,
      recommendations: [
        "Pin node type definition version in package.json.",
        "Upgrade TypeScript compiler target to ES2022 in tsconfig.json.",
        "Enforce strict lockfile check in CI build steps."
      ],
      baseConfidence: 94,
      commits: [
        { id: "c-bld-01", message: "Bump node dependencies and lockfile", date: "2023-07-21T09:00:00Z", authorId: "EMP-104", file: customFile || "package.json", project: "Build & Tooling", documentId: "d-bld-01" }
      ],
      meetings: [],
      documents: [
        { id: "d-bld-01", title: "Dependency Management & Type Safety Policy", summary: "Requires peer review for major version updates to core type definitions." }
      ]
    }),

    Kubernetes: (question, customFile) => ({
      category: "Kubernetes",
      project: "Cloud Infrastructure",
      file: customFile || "KubernetesIngress.yaml",
      primaryAuthor: { id: "EMP-106", name: "Alex Rivera", role: "Senior DevOps Engineer", team: "Release Engineering" },
      summaryTemplate: `Kubernetes pod crash & ingress failure investigation for: "${question}". Examined pod event streams, resource request limits, and ingress controller logs.`,
      rootCauseTemplate: `Commit c109ef by Alex Rivera set memory request limit to 128Mi in KubernetesIngress.yaml, causing Ingress Controller pods to be continuously OOMKilled under traffic spikes.`,
      recommendations: [
        "Increase ingress pod memory resource limit to 1Gi with auto-scaling enabled.",
        "Deploy Kubernetes PodDisruptionBudget to maintain minimal pod availability.",
        "Set up Prometheus alerts for pod container restart counts."
      ],
      baseConfidence: 98,
      commits: [
        { id: "c-k8s-01", message: "Tune cluster pod resource request limits", date: "2023-07-21T16:20:00Z", authorId: "EMP-106", file: customFile || "KubernetesIngress.yaml", project: "Cloud Infrastructure", meetingId: "m-k8s-01", documentId: "d-k8s-01" }
      ],
      meetings: [
        { id: "m-k8s-01", title: "Cluster Resource Cost Optimization", decision: "Trim idle pod memory allocations to reduce cloud infrastructure spend.", date: "2023-07-20T11:00:00Z" }
      ],
      documents: [
        { id: "d-k8s-01", title: "Kubernetes Production Cluster Spec", summary: "Mandates resource limits and auto-scaling baselines for edge ingress controllers." }
      ]
    }),

    Infrastructure: (question, customFile) => ({
      category: "Infrastructure",
      project: "Cloud Infrastructure",
      file: customFile || "main.tf",
      primaryAuthor: { id: "EMP-105", name: "David Chen", role: "Principal Database Administrator", team: "Core Data" },
      summaryTemplate: `Terraform state drift & cloud infrastructure outage analysis for: "${question}". Analyzed AWS cloudtrail logs, terraform execution plans, and DNS resolution failures.`,
      rootCauseTemplate: `Commit 33a88b by David Chen modified AWS Route53 record set in main.tf, pointing api.echomind.internal to a decommissioned load balancer IP.`,
      recommendations: [
        "Revert Route53 DNS A-record to active ALB endpoint in Terraform.",
        "Enforce terraform plan approval locks before applying infra changes.",
        "Add automated synthetic DNS probe monitoring."
      ],
      baseConfidence: 96,
      commits: [
        { id: "c-inf-01", message: "Refactor core VPC load balancer routing in Terraform", date: "2023-07-22T10:00:00Z", authorId: "EMP-105", file: customFile || "main.tf", project: "Cloud Infrastructure", meetingId: "m-inf-01", documentId: "d-inf-01" }
      ],
      meetings: [
        { id: "m-inf-01", title: "Cloud Load Balancer Migration Plan", decision: "Transition internal microservices to dedicated ALB instance.", date: "2023-07-21T14:00:00Z" }
      ],
      documents: [
        { id: "d-inf-01", title: "Terraform Infrastructure Architecture Standard", summary: "Outlines multi-region failover and DNS routing rules for enterprise APIs." }
      ]
    }),

    Networking: (question, customFile) => ({
      category: "Networking",
      project: "Network Core",
      file: customFile || "FirewallRules.json",
      primaryAuthor: { id: "EMP-101", name: "Rahul Kumar", role: "Staff Security Engineer", team: "SecOps" },
      summaryTemplate: `Network connectivity & TLS handshake failure investigation into query: "${question}". Inspected VPC egress security groups, TLS cipher suites, and firewall packet drops.`,
      rootCauseTemplate: `Commit b8291a by Rahul Kumar blocked port 443 outbound traffic in FirewallRules.json during security isolation testing, causing microservice TLS handshakes to drop.`,
      recommendations: [
        "Re-open outbound port 443 in FirewallRules.json.",
        "Implement automated network topology validation in staging.",
        "Monitor active socket connection timeout rates."
      ],
      baseConfidence: 95,
      commits: [
        { id: "c-net-01", message: "Tighten egress firewall rules for payment subnet", date: "2023-07-22T13:30:00Z", authorId: "EMP-101", file: customFile || "FirewallRules.json", project: "Network Core", documentId: "d-net-01" }
      ],
      meetings: [],
      documents: [
        { id: "d-net-01", title: "Enterprise Network Firewall Matrix", summary: "Defines permitted ingress/egress port ranges for database and payment subnets." }
      ]
    }),

    Logging: (question, customFile) => ({
      category: "Logging",
      project: "Observability Platform",
      file: customFile || "LoggerService.ts",
      primaryAuthor: { id: "EMP-107", name: "Marcus Vance", role: "Staff Performance Engineer", team: "Platform Efficiency" },
      summaryTemplate: `Log pipeline drop & missing trace context investigation for query: "${question}". Analyzed log buffer ring sizes, Winston formatters, and Datadog ingestion telemetry.`,
      rootCauseTemplate: `Commit e3310a by Marcus Vance muted verbose JSON log output in LoggerService.ts, unintentionally stripping x-correlation-id header context from microservice logs.`,
      recommendations: [
        "Restore x-correlation-id extraction in LoggerService metadata formatter.",
        "Add automated log schema verification unit tests.",
        "Configure log volume drop alarm notifications."
      ],
      baseConfidence: 93,
      commits: [
        { id: "c-log-01", message: "Suppress redundant debug logs in production", date: "2023-07-23T08:50:00Z", authorId: "EMP-107", file: customFile || "LoggerService.ts", project: "Observability Platform", documentId: "d-log-01" }
      ],
      meetings: [],
      documents: [
        { id: "d-log-01", title: "Observability Logging & Tracing Standard", summary: "Requires distributed trace ID propagation across all asynchronous worker threads." }
      ]
    }),

    Monitoring: (question, customFile) => ({
      category: "Monitoring",
      project: "Observability Platform",
      file: customFile || "PrometheusAlerts.yml",
      primaryAuthor: { id: "EMP-107", name: "Marcus Vance", role: "Staff Performance Engineer", team: "Platform Efficiency" },
      summaryTemplate: `Silent outage & missing alert monitoring investigation for question: "${question}". Inspected Prometheus scrape rules, alertmanager routing, and health check probes.`,
      rootCauseTemplate: `Commit a1102f by Marcus Vance updated alert severity thresholds in PrometheusAlerts.yml, changing HTTP 5xx error alerts from Critical to Suppressed status.`,
      recommendations: [
        "Revert HTTP 5xx alert status to Critical with immediate PagerDuty dispatch.",
        "Implement alert rule dry-run testing in CI.",
        "Perform weekly alert manager routing validation drills."
      ],
      baseConfidence: 96,
      commits: [
        { id: "c-mon-01", message: "Adjust alerting noise thresholds for non-prod services", date: "2023-07-23T15:10:00Z", authorId: "EMP-107", file: customFile || "PrometheusAlerts.yml", project: "Observability Platform", documentId: "d-mon-01" }
      ],
      meetings: [],
      documents: [
        { id: "d-mon-01", title: "Incident Alerting & On-Call Escalation Standard", summary: "Mandates 24/7 paging alerts for any error rate spike exceeding 2% over 5 minutes." }
      ]
    }),

    API: (question, customFile) => ({
      category: "API",
      project: "API Gateway",
      file: customFile || "ApiSchema.ts",
      primaryAuthor: { id: "EMP-102", name: "Ananya Sharma", role: "Principal Systems Architect", team: "Security Architecture" },
      summaryTemplate: `Breaking API schema change & contract breach analysis for query: "${question}". Evaluated REST OpenAPI definitions, GraphQL payload schemas, and client error spikes.`,
      rootCauseTemplate: `Commit f5512b by Ananya Sharma renamed field 'user_id' to 'userId' in ApiSchema.ts without backward compatibility translation, breaking mobile app client requests.`,
      recommendations: [
        "Add field alias middleware to support legacy 'user_id' payload fields.",
        "Enforce breaking API change detection check in CI build pipeline.",
        "Deprecate legacy API schemas with minimum 90-day grace period."
      ],
      baseConfidence: 97,
      commits: [
        { id: "c-api-01", message: "Standardize JSON response field camelCase formatting", date: "2023-07-24T10:00:00Z", authorId: "EMP-102", file: customFile || "ApiSchema.ts", project: "API Gateway", meetingId: "m-api-01", documentId: "d-api-01" }
      ],
      meetings: [
        { id: "m-api-01", title: "API v2 Payload Normalization Sync", decision: "Adopt camelCase naming convention across all public and internal REST endpoints.", date: "2023-07-23T11:00:00Z" }
      ],
      documents: [
        { id: "d-api-01", title: "API Design & Backward Compatibility Guidelines", summary: "Requires strict non-breaking field additions and alias translation layers." }
      ]
    })
  };

  static createScenario(category: InvestigationCategory, question: string, file?: string): InvestigationScenario {
    const builder = this.scenarioMap[category] || this.scenarioMap.Authentication;
    return builder(question, file);
  }
}
