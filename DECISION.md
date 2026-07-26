# Architecture Decision Record (ADR): Dual-Mode Graph Engine for Mule Network Detection

## Context & Problem Statement
The Aegis Protocol detects "Digital Arrest" scams and associated bank mule accounts by analyzing multi-vector telemetry (telecom metadata, voice biometrics, and financial account topologies). 

Mule accounts often operate in coordinated rings (clusters) linked either by:
1. **Explicit RBI Stated Registry** (`rbi_cluster_id`), or
2. **Device-Inferred Fingerprints** (`device_id` shared across multiple accounts without an explicit RBI flag).

During live hackathon stage demonstrations, hard dependencies on external Docker containers (such as a local Neo4j database instance) present a critical single point of failure. If the container crashes, fails to initialize, or encounters network latency, the entire stage demo could stall.

## Decision
We implemented a **Dual-Mode Graph Engine** inside `src/modules/aegis/graph/neo4j.service.ts`:

### Mode 1: Live Neo4j Graph Database (`USE_NEO4J=true`)
- Default mode when Neo4j is available and reachable at startup (`bolt://localhost:7687`).
- Ingests all `bank_event*.json` files into Neo4j graph nodes (`Account`, `Device`, `Cluster`) and relationships (`SENT`, `USED_DEVICE`, `PART_OF_CLUSTER`).
- Executes Cypher queries for mule network topological mapping.

### Mode 2: In-Memory Union-Find Graph Engine (`USE_NEO4J=false` or Automatic Fallback)
- Active when `USE_NEO4J=false` is set or if Neo4j connection fails at startup.
- Ingests **all** `bank_event*.json` files into an in-memory graph data structure.
- Employs a **Union-Find (Disjoint-Set)** algorithm to calculate connected components across accounts linked by shared device fingerprints.
- Calculates dynamic risk signals, feeder accounts, transaction counts, and identifies `inferred_cluster: true` patterns.

## Key Benefits
1. **Zero-Latency Live Stage Demo Reliability**: Eliminates Docker/Neo4j as a mandatory stage demo dependency.
2. **Identical Downstream API & Schema**: Both modes return the exact same `MuleGraphResult` and `ClusterSummary` interfaces. Tools (`banking.tools.ts`), agent logic, and the `aegis-dashboard` widget operate seamlessly without knowing which engine is active under the hood.
3. **Whole-Dataset Scope**: Always ingests **all** mock files combined, ensuring cross-file entity resolution (e.g. tracking a single device across separate transaction logs) is preserved in both modes.
