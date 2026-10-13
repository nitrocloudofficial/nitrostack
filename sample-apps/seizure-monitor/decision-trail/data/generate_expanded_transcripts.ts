import fs from 'fs';
import path from 'path';

const TRANSCRIPT_DIR = path.join(process.cwd(), 'data', 'demo_transcripts');

const NEW_TRANSCRIPTS = [
  {
    filename: '06_vector_db_switch.txt',
    content: `[00:00] Alice (Infra Tech Lead): Thanks everyone. As discussed last month, we initially selected PostgreSQL with pgvector. But at 10M vectors, query latency degrades to 800ms under concurrent write load.
[00:45] Bob: We evaluated Qdrant, Milvus, and Pinecone over the past 2 weeks.
[01:30] Alice: I am officially deciding to replace PostgreSQL pgvector with Pinecone for vector indexing.
[02:15] Dave: What about data isolation?
[02:50] Alice: Pinecone's serverless pods handle namespace isolation and give us p99 latency under 45ms. We will keep PostgreSQL for relational data.`
  },
  {
    filename: '07_kafka_vs_rabbitmq.txt',
    content: `[00:00] Bob Smith: We need to settle on an event streaming broker for our async order processing.
[00:40] Frank: RabbitMQ is much simpler to deploy and manage for basic pub/sub.
[01:15] Bob: RabbitMQ deletes messages after acknowledgement, but we need log retention and offset replay for event sourcing and audit logs.
[02:00] Bob: I am deciding to adopt Apache Kafka over RabbitMQ.
[02:40] Frank: Agreed, Kafka log compaction is essential for our transaction log.`
  },
  {
    filename: '08_kubernetes_migration.txt',
    content: `[00:00] Frank Wright: Our ECS tasks are becoming difficult to manage across multi-region deployments.
[00:50] Alice: Are we looking at self-managed Kubernetes or AWS EKS?
[01:30] Frank: I am making the call to migrate our container workloads from ECS to AWS EKS.
[02:10] Alice: EKS gives us standardized Helm charts and GitOps with ArgoCD without the master node maintenance overhead.`
  },
  {
    filename: '09_engineering_hiring_loop.txt',
    content: `[00:00] Grace (Engineering Director): Candidates are dropping out of our hiring pipeline due to the 8-hour take-home project.
[00:45] Charlie: Other companies use 1-hour live pair programming sessions instead.
[01:25] Grace Lee: I am standardizing our engineering hiring on a 4-stage practical interview loop, replacing take-home assignments with a 90-minute live pair programming session.
[02:10] Charlie: Excellent, this will reduce our offer turnaround from 14 days to 4 days.`
  },
  {
    filename: '10_oncall_rotation_revamp.txt',
    content: `[00:00] Frank: Burnout is high on the single-person 24/7 weekly on-call shift.
[00:50] Alice: If we split into a follow-the-sun rotation with EMEA contractors, nobody has to wake up at 3 AM.
[01:40] Team Consensus: The engineering team unanimously agrees to transition from 24/7 single-person shifts to a 12-hour primary/secondary rotation starting next Monday.
[02:20] Bob: Great team call, schedule updated in PagerDuty.`
  },
  {
    filename: '11_remote_work_stipend.txt',
    content: `[00:00] Grace: Some engineers requested a $500 home office equipment stipend while others prefer co-working pass reimbursements.
[00:45] Charlie: Can we offer both or a hybrid budget?
[01:30] Grace: Finance hasn't approved the Q4 budget allocation yet. We are explicitly postponing this remote work policy discussion until next quarter's sync. No decision today.`
  },
  {
    filename: '12_realtime_collaboration.txt',
    content: `[00:00] Bob (Backend): We need real-time document cursor and presence updates for the multi-user editor.
[00:50] Dave: WebSockets give us bi-directional channels, but maintaining 50k open TCP connections requires a massive gateway tier.
[01:40] Bob Smith: I am selecting Server-Sent Events (SSE) over WebSockets for presence and status updates.
[02:25] Dave: Makes sense — HTTP/2 multiplexing handles SSE out of the box with automatic browser reconnects.`
  },
  {
    filename: '13_search_indexing_engine.txt',
    content: `[00:00] Eve (Data): Elasticsearch cluster memory usage is hovering at 85% on 16GB nodes.
[00:45] Charlie: Typesense is C++ native and runs instantly with far lower memory requirements.
[01:35] Eve Johnson: I am deciding to adopt Typesense over Elasticsearch for our UI instant search indexing.
[02:15] Charlie: Benchmarks show sub-10ms query speeds with under 500MB memory footprint.`
  },
  {
    filename: '14_auth_provider_migration.txt',
    content: `[00:00] Charlie Davis: Auth0 pricing jumped 40% after crossing 50,000 active monthly users.
[00:50] Dave: Clerk provides pre-built React components, B2B multi-tenancy, and organization switching natively.
[01:40] Charlie Davis: I am approving the migration from Auth0 to Clerk for user authentication and multi-tenancy.
[02:20] Dave: We will complete the token migration script by Friday.`
  },
  {
    filename: '15_feature_flag_platform.txt',
    content: `[00:00] Dave (Security): LaunchDarkly sends user analytics to external US servers, triggering GDPR compliance flags.
[00:55] Bob: GrowthBook is open-source and can be self-hosted inside our VPC.
[01:35] Dave Miller: I am deciding to adopt GrowthBook over LaunchDarkly for feature flagging and A/B testing.
[02:15] Bob: Perfect, we keep 100% data residency control inside AWS EU.`
  },
  {
    filename: '16_datadog_vs_grafana.txt',
    content: `[00:00] Frank Wright: DataDog monthly bill reached $18,000, exceeding our total AWS infrastructure cost.
[00:50] Alice: Grafana Cloud with Prometheus metrics and Loki logs covers 95% of our dashboard needs.
[01:40] Frank Wright: I am consolidating our telemetry on Grafana Cloud and canceling DataDog.
[02:20] Alice: This saves us $12,000 per month.`
  },
  {
    filename: '17_snyk_vulnerability_scanner.txt',
    content: `[00:00] Dave Miller: Recent npm dependency supply chain attacks require automated vulnerability scanning in our PR build checks.
[00:45] Frank: Should we block PR merges on high/critical CVEs?
[01:30] Dave Miller: I am mandating Snyk CLI integration into GitHub Actions to block PRs containing Critical or High CVEs.
[02:10] Frank: Rule added to repository security policies.`
  },
  {
    filename: '18_copilot_enterprise_seats.txt',
    content: `[00:00] Grace: Engineering requested GitHub Copilot Enterprise licenses for all 50 developers.
[00:50] Dave: Security needs to verify that telemetry opt-out guarantees proprietary code is not used for model training.
[01:40] Grace: We are withholding approval for Copilot seats until legal and security complete their audit next month. No purchase approved today.`
  },
  {
    filename: '19_api_gateway_evolution_part1.txt',
    content: `[00:00] Frank Wright: We need a centralized API gateway to handle rate limiting and TLS termination at the edge.
[00:45] Bob: Kong API Gateway is built on NGINX and Lua, very battle-tested.
[01:30] Frank Wright: I am selecting Kong API Gateway for edge routing and API key verification.
[02:15] Bob: Deploying Kong Helm chart to staging.`
  },
  {
    filename: '20_api_gateway_evolution_part2.txt',
    content: `[00:00] Alice Chen: Kong API Gateway is experiencing severe latency spikes on gRPC streaming connections under high load.
[00:50] Frank: Envoy Proxy has native HTTP/2 and gRPC multiplexing with zero-downtime hot reloads.
[01:35] Alice Chen: I am deciding to replace Kong API Gateway with Envoy Proxy for our edge routing layer.
[02:20] Frank: Superseding Kong deployment with Envoy proxy configuration.`
  },
  {
    filename: '21_api_gateway_evolution_part3.txt',
    content: `[00:00] Alice: As our global traffic grows, running Envoy EC2 instances in 3 regions is adding latency for Asian users.
[00:55] Bob: Cloudflare Workers execute V8 isolates at 300 edge locations worldwide.
[01:45] Team Consensus: The architecture team unanimously agreed to move global edge routing to Cloudflare Workers while keeping Envoy as an internal mesh.
[02:30] Alice: Superseding global Envoy ingress; global p95 latency drops to 18ms.`
  },
  {
    filename: '22_design_system_tokens.txt',
    content: `[00:00] Unclear Speaker: We should refactor our CSS modules to Tailwind or Vanilla Extract.
[00:45] Speaker 2: Tailwind pollutes HTML classnames, but Vanilla Extract requires build step config.
[01:30] Speaker 3: We ran out of time in the meeting. Nobody took ownership and no consensus was reached.`
  }
];

function generateFiles() {
  if (!fs.existsSync(TRANSCRIPT_DIR)) {
    fs.mkdirSync(TRANSCRIPT_DIR, { recursive: true });
  }

  for (const item of NEW_TRANSCRIPTS) {
    const filePath = path.join(TRANSCRIPT_DIR, item.filename);
    fs.writeFileSync(filePath, item.content, 'utf8');
    console.log(`Created ${item.filename}`);
  }
  console.log(`\n✅ Generated ${NEW_TRANSCRIPTS.length} synthetic transcripts.`);
}

generateFiles();
