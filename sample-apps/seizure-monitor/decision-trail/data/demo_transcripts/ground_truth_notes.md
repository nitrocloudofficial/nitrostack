# Ground-Truth Evaluation Notes (Expanded Dataset: 22 Transcripts)

| File | Primary Topic | Decided Option | Non-Selected Alternatives | Decision Owner | Relationship | Ground-Truth Notes |
|:---|:---|:---|:---|:---|:---|:---|
| `01_vendor_selection.txt` | Vendor / Payments | Stripe | Adyen | Charlie Davis | Baseline | Stripe selected for 3-day launch & pre-built Checkout pages. |
| `02_database_selection.txt` | Database | PostgreSQL (pgvector) | MongoDB | Bob Smith | Baseline | Initial vector & relational DB choice. |
| `03_scattered_context.txt` | Caching | Redis | Memcached | Alice Chen | Baseline | Redis selected across multi-turn scattered context. |
| `04_architecture_evolution.txt` | Vector Indexing / Host | Pinecone & RDS | Self-hosted vector | Alice Chen | Supersedes `02` | Pinecone replaces pgvector; RDS hosts Postgres. |
| `05_watercooler_chat.txt` | Miscellaneous | Deferred (Vercel) | Netlify | None (Refusal) | None | Explicitly deferred preview deployment choice. |
| `06_vector_db_switch.txt` | Vector Database | Pinecone | PostgreSQL pgvector, Qdrant, Milvus | Alice Chen | Supersedes `02` | Pinecone selected for scale latency (<45ms). |
| `07_kafka_vs_rabbitmq.txt` | Event Streaming | Apache Kafka | RabbitMQ | Bob Smith | Independent | Kafka selected for log retention & offset replay. |
| `08_kubernetes_migration.txt` | Orchestration | AWS EKS | ECS, Self-managed K8s | Frank Wright | Independent | EKS chosen for standardized Helm charts & GitOps. |
| `09_engineering_hiring_loop.txt` | Hiring Process | 4-Stage Practical Loop | 8-Hour Take-home | Grace Lee | Process | 90-min live pair programming replaces take-home. |
| `10_oncall_rotation_revamp.txt` | SRE / On-Call | 12-Hour Primary/Secondary | 24/7 Single-person | Team Consensus | Process | Team consensus transition to follow-the-sun on-call. |
| `11_remote_work_stipend.txt` | HR Policy | Postponed / None | Equipment Stipend | None (Refusal) | None | Budget postponed until next quarter. No decision. |
| `12_realtime_collaboration.txt` | Realtime Infrastructure | Server-Sent Events (SSE) | WebSockets | Bob Smith | Independent | SSE selected for lower TCP gateway memory overhead. |
| `13_search_indexing_engine.txt` | Search Engine | Typesense | Elasticsearch | Eve Johnson | Independent | Typesense selected for <500MB RAM C++ speed. |
| `14_auth_provider_migration.txt` | Authentication | Clerk | Auth0 | Charlie Davis | Independent | Clerk approved after Auth0 40% tier price surge. |
| `15_feature_flag_platform.txt` | Feature Management | GrowthBook | LaunchDarkly | Dave Miller | Security | GrowthBook self-hosted for strict GDPR compliance. |
| `16_datadog_vs_grafana.txt` | Observability | Grafana Cloud | DataDog | Frank Wright | Infrastructure | Grafana Cloud cuts monthly telemetry bill by $12k. |
| `17_snyk_vulnerability_scanner.txt` | Security / CI | Snyk CLI | Manual review | Dave Miller | Security | Mandatory Snyk PR scanning blocking High/Critical CVEs. |
| `18_copilot_enterprise_seats.txt` | AI Tooling | Postponed / None | GitHub Copilot | None (Refusal) | None | Withheld approval pending IP compliance audit. |
| `19_api_gateway_evolution_part1.txt` | API Gateway | Kong Gateway | NGINX custom | Frank Wright | Chain 1 | Kong selected for rate limiting & TLS termination. |
| `20_api_gateway_evolution_part2.txt` | API Gateway | Envoy Proxy | Kong Gateway | Alice Chen | Supersedes `19` | Envoy replaces Kong due to gRPC latency spikes. |
| `21_api_gateway_evolution_part3.txt` | API Gateway | Cloudflare Workers | Envoy Edge | Team Consensus | Supersedes `20` | Cloudflare Workers at edge, Envoy internal mesh. |
| `22_design_system_tokens.txt` | Frontend Styling | Abandoned / None | Tailwind, Vanilla Extract | None (Refusal) | None | Meeting timed out with unclear speaker. No decision. |
