import { IncidentReport } from "./models.js";

export class HistoricalMemoryAgent {
  public agentId: string;
  public incidents: IncidentReport[] = [];
  private vocab: Map<string, number> = new Map();
  private idf: number[] = [];
  private indexVectors: number[][] = [];
  private isFitted: boolean = false;

  constructor(agentId: string = "HistoricalMemory_01") {
    this.agentId = agentId;
    this._seedDefaultIncidents();
  }

  private _seedDefaultIncidents(): void {
    const defaultIncidents: IncidentReport[] = [
      {
        id: "INC-2024-089",
        title: "Machine #4 Bearing Failure & Thermal Runaway",
        domain: "Plant Maintenance",
        description: "Operated Machine #4 CNC spindle without lubrication monitoring under 4x production throughput peak. Thermal expansion caused bearing lockup and conveyor line jam.",
        outcome: "FAILURE: Production line suffered 42-minute factory floor shutdown.",
        risk_score: 0.88,
        lessons_learned: [
          "Enforce strict per-machine thermal and vibration limits.",
          "Mandate predictive maintenance policies with automatic safety interlocks.",
          "Never deploy production speed increases without load-test proof."
        ],
        tags: ["manufacturing", "machine_4", "bearing_failure", "interlock", "shutdown"]
      },
      {
        id: "INC-2025-014",
        title: "Uncapped CNC Tooling Budget Allocation",
        domain: "Plant Operations",
        description: "Approved $120k tooling upgrade budget without dynamic spend safety limits or ROI benchmarks during Q2 production run.",
        outcome: "PARTIAL LOSS: Overspent by $45k with sub-1.0 ROI.",
        risk_score: 0.75,
        lessons_learned: [
          "Cap total unhedged tooling budget at $50,000.",
          "Require SafetyAgent SOP approval for all tier-1 capital equipment changes."
        ],
        tags: ["budget", "plant_operations", "overspend", "sop_violation"]
      },
      {
        id: "INC-2025-042",
        title: "PLC Lockup under High Concurrent Conveyor Feed Rate",
        domain: "Automation / PLC",
        description: "Disabled redundant sensor checks during peak production run to save power costs, causing PLC input lock contention.",
        outcome: "CRITICAL: Robot arm assembly failure rate hit 68%.",
        risk_score: 0.92,
        lessons_learned: [
          "Redundant PLC sensor feeds must remain active during any high-throughput event.",
          "Staged rollout strategy required for PLC firmware and sensor updates."
        ],
        tags: ["plc", "sensor_drift", "conveyor", "high_throughput", "redundancy"]
      },
      {
        id: "INC-2025-103",
        title: "Successful Machine #4 Predictive Maintenance & Interlock Rollout",
        domain: "Predictive Maintenance",
        description: "Deployed gradual staged rollout on Machine #4 with 20% conveyor load, automated interlock triggers, and active sensor monitoring.",
        outcome: "SUCCESS: Handled 5x production throughput with 99.99% operational uptime.",
        risk_score: 0.15,
        lessons_learned: [
          "Staged rollouts reduce blast radius on assembly lines effectively.",
          "Pre-calibrated sensors mitigate calibration drift during scaling."
        ],
        tags: ["staged_rollout", "predictive_maintenance", "success", "machine_4", "interlock"]
      }
    ];

    for (const inc of defaultIncidents) {
      this.addIncident(inc);
    }
    this.buildIndex();
  }

  public addIncident(incident: IncidentReport): void {
    this.incidents.push(incident);
    this.isFitted = false;
  }

  private _tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);
  }

  public buildIndex(): void {
    if (this.incidents.length === 0) return;

    const documents = this.incidents.map((inc) =>
      `${inc.title} ${inc.domain} ${inc.description} ${inc.tags.join(" ")} ${inc.lessons_learned.join(" ")}`
    );

    const tokenizedDocs = documents.map((doc) => this._tokenize(doc));

    // Build vocabulary
    this.vocab.clear();
    let termId = 0;
    for (const tokens of tokenizedDocs) {
      for (const t of tokens) {
        if (!this.vocab.has(t)) {
          this.vocab.set(t, termId++);
        }
      }
    }

    const vocabSize = this.vocab.size;
    const numDocs = documents.length;

    // Calculate IDF
    const docFreq = new Array(vocabSize).fill(0);
    for (const tokens of tokenizedDocs) {
      const uniqueTokens = new Set(tokens);
      for (const t of uniqueTokens) {
        const id = this.vocab.get(t);
        if (id !== undefined) {
          docFreq[id]++;
        }
      }
    }

    this.idf = docFreq.map((df) => Math.log((numDocs + 1) / (df + 1)) + 1.0);

    // Compute TF-IDF vectors for index
    this.indexVectors = tokenizedDocs.map((tokens) => {
      const vec = new Array(vocabSize).fill(0);
      const tf = new Map<string, number>();
      for (const t of tokens) {
        tf.set(t, (tf.get(t) || 0) + 1);
      }
      for (const [t, count] of tf.entries()) {
        const id = this.vocab.get(t);
        if (id !== undefined) {
          vec[id] = (count / tokens.length) * this.idf[id];
        }
      }
      // L2 Normalize
      const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
      return norm > 0 ? vec.map((v) => v / norm) : vec;
    });

    this.isFitted = true;
  }

  public queryMidReasoning(query: string, topK: number = 2): [IncidentReport, number][] {
    if (!this.isFitted || this.indexVectors.length === 0) {
      this.buildIndex();
    }

    const queryTokens = this._tokenize(query);
    const vocabSize = this.vocab.size;
    const queryVec = new Array(vocabSize).fill(0);

    const tf = new Map<string, number>();
    for (const t of queryTokens) {
      tf.set(t, (tf.get(t) || 0) + 1);
    }
    for (const [t, count] of tf.entries()) {
      const id = this.vocab.get(t);
      if (id !== undefined) {
        queryVec[id] = (count / queryTokens.length) * this.idf[id];
      }
    }

    // L2 Normalize query vector
    const norm = Math.sqrt(queryVec.reduce((sum, v) => sum + v * v, 0));
    const normalizedQuery = norm > 0 ? queryVec.map((v) => v / norm) : queryVec;

    // Calculate Cosine Similarity scores
    const scored: [IncidentReport, number][] = this.incidents.map((inc, i) => {
      const docVec = this.indexVectors[i];
      let dotProduct = 0;
      for (let j = 0; j < vocabSize; j++) {
        dotProduct += normalizedQuery[j] * docVec[j];
      }
      return [inc, dotProduct];
    });

    // Sort descending by similarity score
    scored.sort((a, b) => b[1] - a[1]);

    return scored.slice(0, Math.min(topK, scored.length));
  }
}
