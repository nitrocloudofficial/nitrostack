import { InvestigationCategory } from "./investigation.types.js";

export class InvestigationClassifier {
  private static rules: { category: InvestigationCategory; patterns: RegExp[] }[] = [
    {
      category: "Authentication",
      patterns: [/auth/i, /login/i, /oauth/i, /sso/i, /jwt/i, /token/i, /password/i, /credential/i, /identity/i, /session/i]
    },
    {
      category: "Authorization",
      patterns: [/rbac/i, /permission/i, /role/i, /privilege/i, /access control/i, /forbidden/i, /unauthorized/i, /scope/i]
    },
    {
      category: "Payment",
      patterns: [/payment/i, /stripe/i, /gateway/i, /billing/i, /transaction/i, /charge/i, /merchant/i, /card/i]
    },
    {
      category: "Checkout",
      patterns: [/checkout/i, /cart/i, /basket/i, /order/i, /purchase/i, /inventory lock/i]
    },
    {
      category: "Database",
      patterns: [/database/i, /db/i, /sql/i, /query/i, /postgres/i, /pool/i, /migration/i, /mongo/i, /redis/i, /index/i]
    },
    {
      category: "Deployment",
      patterns: [/deploy/i, /release/i, /rollback/i, /env/i, /environment/i, /canary/i, /staging/i, /production/i]
    },
    {
      category: "Performance",
      patterns: [/latency/i, /slow/i, /performance/i, /timeout/i, /throughput/i, /lag/i, /response time/i, /spike/i, /cpu/i]
    },
    {
      category: "Memory Leak",
      patterns: [/memory/i, /leak/i, /heap/i, /gc/i, /oom/i, /allocation/i, /overflow/i]
    },
    {
      category: "Security",
      patterns: [/security/i, /vulnerability/i, /cve/i, /exploit/i, /cors/i, /injection/i, /secret/i, /breach/i]
    },
    {
      category: "CI/CD",
      patterns: [/ci/i, /cd/i, /pipeline/i, /workflow/i, /github action/i, /jenkins/i, /runner/i]
    },
    {
      category: "Build Failure",
      patterns: [/build/i, /compile/i, /tsc/i, /typescript/i, /webpack/i, /vite/i, /package/i, /dependency/i]
    },
    {
      category: "Kubernetes",
      patterns: [/k8s/i, /kubernetes/i, /pod/i, /ingress/i, /helm/i, /cluster/i, /container/i, /oomkilled/i]
    },
    {
      category: "Infrastructure",
      patterns: [/infra/i, /infrastructure/i, /terraform/i, /aws/i, /cloud/i, /dns/i, /vpc/i, /subnet/i]
    },
    {
      category: "Networking",
      patterns: [/network/i, /socket/i, /tcp/i, /tls/i, /ssl/i, /handshake/i, /firewall/i, /egress/i]
    },
    {
      category: "Logging",
      patterns: [/log/i, /logging/i, /trace/i, /datadog/i, /splunk/i, /winston/i, /elk/i]
    },
    {
      category: "Monitoring",
      patterns: [/monitor/i, /metric/i, /prometheus/i, /grafana/i, /alert/i, /health check/i]
    },
    {
      category: "API",
      patterns: [/api/i, /endpoint/i, /rest/i, /graphql/i, /grpc/i, /schema/i, /contract/i, /payload/i]
    }
  ];

  static classify(question: string, file?: string): InvestigationCategory {
    const textToAnalyze = `${question} ${file || ""}`;

    for (const rule of this.rules) {
      for (const pattern of rule.patterns) {
        if (pattern.test(textToAnalyze)) {
          return rule.category;
        }
      }
    }

    // Default fallback based on common keywords
    if (/service|microservice|app/i.test(textToAnalyze)) {
      return "Payment";
    }

    if (/crash|down|outage|fail|break/i.test(textToAnalyze)) {
      return "Deployment";
    }

    return "Authentication";
  }
}
