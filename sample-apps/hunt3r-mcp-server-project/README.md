# HUNT3R-T: AI-Powered Threat Hunting & Incident Response Platform

**HUNT3R-T** is an advanced MCP (Model Context Protocol) server that provides real-time threat hunting, incident reconstruction, and preemptive containment capabilities for enterprise security operations centers (SOCs).

---

## 🎯 Purpose

HUNT3R-T enables security teams to:

- **Detect APT attacks** by hunting for MITRE ATT&CK techniques across SIEM logs
- **Reconstruct attack timelines** to identify patient zero and measure dwell time
- **Predict lateral movement** using network simulations before breaches spread
- **Execute preemptive containment** with validated, low-risk actions
- **Generate audit trails** for compliance and post-incident analysis

---

## 🏗️ Architecture

HUNT3R-T is built on the **Model Context Protocol (MCP)** and provides:

- **7 Core Tools** for threat hunting and response
- **3 Reference Resources** for static lookup data
- **Integrated SIEM, network topology, and threat intelligence** backends
- **Digital twin simulation engine** for blast radius prediction

```
┌─────────────────────────────────────────────────────────────┐
│                     HUNT3R-T MCP Server                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐         ┌──────────────────┐           │
│  │   Tools (7)     │         │  Resources (3)   │           │
│  ├─────────────────┤         ├──────────────────┤           │
│  │ hunt_technique  │         │ network-topology │           │
│  │ temporal_rec.   │         │ siem-logs        │           │
│  │ spin_twin       │         │ apt-profiles     │           │
│  │ simulate_mov.   │         │ action-history   │           │
│  │ execute_block   │         │                  │           │
│  │ generate_chain  │         │                  │           │
│  │ read_resource   │         │                  │           │
│  └─────────────────┘         └──────────────────┘           │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │            Digital Twin Simulation Engine               ││
│  │      (Network modeling, lateral movement prediction)    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
              │              │              │
              ▼              ▼              ▼
        ┌────────┐     ┌─────────┐    ┌──────────┐
        │  SIEM  │     │ Network │    │  Threat  │
        │  Logs  │     │Topology │    │ Intel DB │
        └────────┘     └─────────┘    └──────────┘
```

---

## 🔧 Core Tools

### 1. **hunt_technique** — Find Attack Patterns
Hunt for specific MITRE ATT&CK techniques across SIEM logs.

**Parameters:**
- `technique_id` (required): MITRE technique ID (e.g., `T1059`, `T1021.002`)
- `timeframe_hours` (required): How far back to search (e.g., `24`, `72`)
- `host_filter` (optional): Restrict search to specific hosts

**Example:**
```json
{
  "technique_id": "T1059.001",
  "timeframe_hours": 24,
  "host_filter": ["HOST-42", "PROD-DB"]
}
```

**Returns:**
```json
{
  "technique_id": "T1059.001",
  "total_hits": 12,
  "severity": "HIGH",
  "corroborated_evidence": [
    {
      "host_id": "HOST-42",
      "timestamp": "2026-07-24T02:15:01Z",
      "command": "powershell.exe -enc UwB0AGEAcgB0AC0AUwBsAGUAZQBwAA==",
      "user": "SYSTEM"
    }
  ],
  "recommended_next_steps": ["isolate_host", "revoke_credentials"]
}
```

---

### 2. **temporal_reconstruction** — Build Attack Timeline
Reconstruct the exact sequence of attacker actions on a compromised host.

**Parameters:**
- `host_id` (required): The compromised host to analyze
- `lookback_hours` (required): Timeline lookback window (e.g., `72`)

**Example:**
```json
{
  "host_id": "HOST-42",
  "lookback_hours": 72
}
```

**Returns:**
```json
{
  "host_id": "HOST-42",
  "patient_zero": {
    "timestamp": "2026-07-24T02:15:01Z",
    "technique": "T1059.001",
    "description": "Encoded PowerShell execution"
  },
  "dwell_time_hours": 46.35,
  "total_events": 6,
  "suspicious_events": 4,
  "key_moments": [
    {
      "timestamp": "2026-07-24T02:15:01Z",
      "type": "T1059.001",
      "severity": "high",
      "description": "Initial shell access"
    },
    {
      "timestamp": "2026-07-24T02:42:18Z",
      "type": "T1071.004",
      "severity": "high",
      "description": "C2 communication"
    },
    {
      "timestamp": "2026-07-24T05:17:44Z",
      "type": "T1218.011",
      "severity": "critical",
      "description": "Living off the land exploitation"
    },
    {
      "timestamp": "2026-07-24T08:33:12Z",
      "type": "T1021.002",
      "severity": "high",
      "description": "Lateral movement to DC-01"
    }
  ]
}
```

**Interpretation:**
- **Patient Zero:** First malicious activity detected (02:15 UTC)
- **Dwell Time:** 46+ hours before detection
- **Key Moments:** Critical attack phases in chronological order

---

### 3. **spin_twin** — Create Digital Twin
Build a simulation model of your network around a compromised host.

**Parameters:**
- `seed_host_id` (required): Center of the twin (e.g., `HOST-42`)
- `depth_hops` (required): Trust relationship hops to include (e.g., `3`)

**Example:**
```json
{
  "seed_host_id": "HOST-42",
  "depth_hops": 3
}
```

**Returns:**
```json
{
  "twin_id": "TWIN-1785026148859",
  "seed_host": "HOST-42",
  "depth": 3,
  "total_hosts": 4,
  "critical_assets_in_scope": 1,
  "hosts": [
    {
      "host_id": "HOST-42",
      "compromised": true,
      "criticality": "LOW",
      "trust_relationships": ["HOST-17", "DC-01"]
    },
    {
      "host_id": "HOST-17",
      "compromised": false,
      "criticality": "HIGH",
      "trust_relationships": ["HOST-42", "HOST-08", "DC-01"]
    },
    {
      "host_id": "DC-01",
      "compromised": false,
      "criticality": "CRITICAL",
      "trust_relationships": ["HOST-17", "HOST-08"]
    },
    {
      "host_id": "HOST-08",
      "compromised": false,
      "criticality": "MEDIUM",
      "trust_relationships": ["HOST-17", "DC-01"]
    }
  ],
  "simulation_ready": true
}
```

**Key Insight:** Shows that HOST-42 (LOW) can reach DC-01 (CRITICAL) in 2 hops via HOST-17 — high risk!

---

### 4. **simulate_lateral_movement** — Predict Attacker Path
Use the digital twin to simulate how an APT would move laterally through your network.

**Parameters:**
- `twin_id` (required): From `spin_twin` output
- `attacker_profile` (required): APT profile name (e.g., `APT29`, `Lazarus`)
- `entry_point` (required): Starting host (e.g., `HOST-42`)
- `simulation_duration_minutes` (required): Max simulation time (e.g., `30`)

**Example:**
```json
{
  "twin_id": "TWIN-1785026148859",
  "attacker_profile": "APT29",
  "entry_point": "HOST-42",
  "simulation_duration_minutes": 30
}
```

**Returns:**
```json
{
  "twin_id": "TWIN-1785026148859",
  "attacker_profile": "APT29",
  "simulation_id": "SIM-1785026203456",
  "duration_minutes": 30,
  "predicted_path": [
    {
      "phase": 1,
      "minute": 0,
      "host_id": "HOST-42",
      "action": "INITIAL_ACCESS",
      "technique": "T1566.002"
    },
    {
      "phase": 2,
      "minute": 5,
      "host_id": "HOST-42",
      "action": "PRIVILEGE_ESCALATION",
      "technique": "T1548.002"
    },
    {
      "phase": 3,
      "minute": 12,
      "host_id": "HOST-17",
      "action": "LATERAL_MOVEMENT",
      "technique": "T1570",
      "risk": "HIGH"
    },
    {
      "phase": 4,
      "minute": 24,
      "host_id": "DC-01",
      "action": "PERSISTENCE",
      "technique": "T1547.001",
      "risk": "CRITICAL"
    }
  ],
  "critical_window": "12-24 minutes",
  "recommended_block": "HOST-17 → DC-01"
}
```

**Action:** You have **12 minutes** to block the HOST-17 → DC-01 connection before critical systems are compromised!

---

### 5. **execute_preemptive_block** — Stop the Attack
Execute containment actions with confidence (validated against digital twin).

**Parameters:**
- `action` (required): `BLOCK_DOMAIN`, `ISOLATE_HOST`, or `REVOKE_CRED`
- `target` (required): Domain, host_id, or credential to block
- `justification` (required): Why this action is necessary
- `twin_validation_id` (required): twin_id or simulation result that validates this action

**Example:**
```json
{
  "action": "ISOLATE_HOST",
  "target": "HOST-42",
  "justification": "Confirmed compromise with 46h dwell time. Lateral movement to DC-01 predicted in 12 min.",
  "twin_validation_id": "SIM-1785026203456"
}
```

**Returns:**
```json
{
  "action": "ISOLATE_HOST",
  "target": "HOST-42",
  "status": "EXECUTED",
  "timestamp": "2026-07-24T10:45:32Z",
  "impact": {
    "network_changes": 1,
    "users_affected": 3,
    "services_stopped": ["smb", "rdp", "wmi"]
  },
  "validation": {
    "simulation_id": "SIM-1785026203456",
    "risk_prevented": "CRITICAL",
    "dwell_time_saved_hours": 24.5
  }
}
```

---

### 6. **generate_decision_chain** — Create Audit Trail
Generate a complete causal record of observations → reasoning → actions.

**Parameters:**
- `incident_id` (required): Unique incident identifier
- `observations` (required): Array of observed evidence records
- `actions_taken` (required): List of actions executed
- `hypothesis` (optional): Working hypothesis with APT attribution

**Example:**
```json
{
  "incident_id": "INC-2026-07-001",
  "observations": [
    {
      "timestamp": "2026-07-24T02:15:01Z",
      "type": "T1059.001",
      "host": "HOST-42",
      "severity": "high"
    },
    {
      "timestamp": "2026-07-24T02:42:18Z",
      "type": "T1071.004",
      "host": "HOST-42",
      "severity": "high"
    }
  ],
  "actions_taken": [
    "ISOLATE_HOST HOST-42",
    "REVOKE_CRED admin-service"
  ],
  "hypothesis": {
    "apt_attribution": "APT29",
    "time_to_critical": 12
  }
}
```

**Returns:**
```json
{
  "incident_id": "INC-2026-07-001",
  "decision_chain": {
    "perceive": {
      "observations": 4,
      "corroborated": true,
      "confidence": 0.95
    },
    "reason": {
      "hypothesis": "APT29 conducting espionage campaign",
      "ttps_matched": ["T1059.001", "T1071.004", "T1021.002"],
      "blast_radius": "CRITICAL"
    },
    "act": {
      "actions": 2,
      "risk_prevented": "CRITICAL",
      "estimated_damage_prevented": "$2.5M"
    }
  },
  "audit_trail": [
    {
      "timestamp": "2026-07-24T10:45:32Z",
      "action": "ISOLATE_HOST",
      "justification": "Confirmed APT29 compromise",
      "approved_by": "SOC-LEAD"
    },
    {
      "timestamp": "2026-07-24T10:46:05Z",
      "action": "REVOKE_CRED",
      "justification": "Service account compromised",
      "approved_by": "SOC-LEAD"
    }
  ]
}
```

---

### 7. **read_resource** — Fetch Reference Data
Retrieve one of the reference resources listed below by URI.

---

## 📚 Reference Resources

### 1. **network-topology** (`hunt3r://network-topology`)
Current in-memory network topology graph (hosts, trust relationships, criticality).

**Example:**
```json
{
  "critical_assets": [
    {
      "host_id": "DC-01",
      "hostname": "DC-PRIMARY",
      "ip": "10.0.1.1",
      "criticality": "CRITICAL",
      "os": "windows",
      "domain_role": "dc",
      "services": [
        {
          "name": "ldap",
          "port": 389,
          "protocol": "tcp"
        }
      ],
      "trust_relationships": ["HOST-17", "HOST-08"],
      "exposed_ports": [88, 389, 53]
    }
  ]
}
```

### 2. **siem-logs/recent** (`hunt3r://siem-logs/recent`)
Most recent SIEM events loaded into memory, sorted by timestamp.

### 3. **apt-profiles** (`hunt3r://threat-intel/apt-profiles`)
Loaded APT actor profiles including TTPs and kill-chain phase timing.

### 4. **action-history** (`hunt3r://action-history`)
Log of pre-emptive containment actions executed by HUNT3R-T.

---

## 🚀 Quick Start

### Basic Workflow

#### **Step 1: Detect the Breach**
```javascript
// Hunt for T1059 (Command Execution) in the last 24 hours
hunt_technique({
  technique_id: "T1059",
  timeframe_hours: 24
})
// → Returns 12 hits on HOST-42
```

#### **Step 2: Understand the Timeline**
```javascript
// Reconstruct what happened on HOST-42
temporal_reconstruction({
  host_id: "HOST-42",
  lookback_hours: 72
})
// → Returns patient zero at 02:15 UTC, 46h dwell time
```

#### **Step 3: Assess Blast Radius**
```javascript
// Create digital twin around HOST-42
spin_twin({
  seed_host_id: "HOST-42",
  depth_hops: 3
})
// → Returns TWIN-1785026148859 with 4 hosts, 1 CRITICAL asset (DC-01)
```

#### **Step 4: Predict Lateral Movement**
```javascript
// Simulate APT29 behavior from HOST-42
simulate_lateral_movement({
  twin_id: "TWIN-1785026148859",
  attacker_profile: "APT29",
  entry_point: "HOST-42",
  simulation_duration_minutes: 30
})
// → Returns attack path reaching DC-01 in 24 minutes
```

#### **Step 5: Block Preemptively**
```javascript
// Isolate HOST-42 before lateral movement happens
execute_preemptive_block({
  action: "ISOLATE_HOST",
  target: "HOST-42",
  justification: "Confirmed APT29. DC-01 compromise in 24 min.",
  twin_validation_id: "SIM-1785026203456"
})
// → Returns EXECUTED with impact analysis
```

#### **Step 6: Document Everything**
```javascript
// Generate audit trail for compliance
generate_decision_chain({
  incident_id: "INC-2026-07-001",
  observations: [...],
  actions_taken: ["ISOLATE_HOST HOST-42"],
  hypothesis: { apt_attribution: "APT29" }
})
// → Returns decision chain with audit trail
```

---

## 🎯 Use Cases

### Incident Response
1. **Detection:** Hunt for anomalous techniques
2. **Timeline:** Reconstruct attack sequence
3. **Containment:** Block with validated actions
4. **Documentation:** Generate audit trail

### Threat Hunting
1. **Proactive hunt** for known APT TTPs
2. **Identify patient zero** and dwell time
3. **Assess risk** using digital twins
4. **Prioritize incidents** by blast radius

### Security Posture Assessment
1. **Map network criticality** and trust relationships
2. **Identify high-risk lateral movement paths**
3. **Validate containment strategies** before incidents
4. **Plan defensive improvements**

---

## 🔒 Security Features

| Feature | Benefit |
|---------|---------|
| **Twin Validation** | Never execute containment without simulation proof |
| **Causal Decision Chains** | Full audit trail for compliance and post-mortems |
| **Blast Radius Prediction** | Understand impact before taking action |
| **Patient Zero Identification** | Find where breach started, not just where it spread |
| **Dwell Time Measurement** | Understand how long attacker was inside |
| **APT Attribution** | Match TTPs to known threat actors |

---

## 📊 MITRE ATT&CK Technique Support

HUNT3R-T supports all MITRE ATT&CK Framework techniques:

### Reconnaissance
- T1592 (Gather Victim Info)
- T1589 (Gather Victim Identity Info)

### Initial Access
- T1566 (Phishing)
- T1200 (Hardware Additions)

### Execution
- T1059 (Command and Scripting Interpreter)
- T1059.001 (PowerShell)
- T1059.003 (Windows Command Shell)

### Persistence
- T1547 (Boot or Logon Autostart Execution)
- T1547.001 (Registry Run Keys)

### Privilege Escalation
- T1548 (Abuse Elevation Control Mechanism)
- T1548.002 (Bypass User Account Control)

### Defense Evasion
- T1197 (BITS Jobs)
- T1140 (Deobfuscate/Decode Files)

### Lateral Movement
- T1570 (Lateral Tool Transfer)
- T1021 (Remote Service Session Initiation)
- T1021.002 (SMB/Windows Admin Shares)

### Collection
- T1113 (Screen Capture)
- T1115 (Clipboard Data)

### Command & Control
- T1071 (Application Layer Protocol)
- T1071.004 (DNS)

### Exfiltration
- T1041 (Exfiltration Over C2)
- T1030 (Data Transfer Size Limits)

### Impact
- T1531 (Account Access Removal)
- T1490 (Inhibit System Recovery)

---

## 🏥 Health Checks

Monitor HUNT3R-T health:

```bash
curl http://localhost:3000/health
```

**Returns:**
```json
{
  "checks": [
    {
      "name": "siem_connected",
      "status": "healthy",
      "latency_ms": 45
    },
    {
      "name": "network_topology",
      "status": "healthy",
      "hosts_loaded": 247
    },
    {
      "name": "simulation_engine",
      "status": "healthy",
      "simulations_running": 0
    }
  ]
}
```

---

## 📝 Examples

### Example 1: Respond to Phishing Email
```javascript
// Step 1: Hunt for execution after phishing (T1566 → T1059)
hunt_technique({ technique_id: "T1059", timeframe_hours: 24 })

// Step 2: Find patient zero
temporal_reconstruction({ host_id: "HOST-42", lookback_hours: 72 })

// Step 3: Assess impact
spin_twin({ seed_host_id: "HOST-42", depth_hops: 3 })

// Step 4: Prevent lateral movement
simulate_lateral_movement({
  twin_id: "TWIN-...",
  attacker_profile: "Generic",
  entry_point: "HOST-42",
  simulation_duration_minutes: 30
})

// Step 5: Contain
execute_preemptive_block({
  action: "ISOLATE_HOST",
  target: "HOST-42",
  justification: "Phishing + execution detected",
  twin_validation_id: "SIM-..."
})
```

### Example 2: Hunt for APT29 Campaign
```javascript
// Hunt for known APT29 TTPs
hunt_technique({ technique_id: "T1071.004", timeframe_hours: 168 }) // DNS C2
hunt_technique({ technique_id: "T1021.002", timeframe_hours: 168 }) // SMB lateral move

// If found, reconstruct timeline on each host
temporal_reconstruction({ host_id: "HOST-17", lookback_hours: 72 })
temporal_reconstruction({ host_id: "HOST-08", lookback_hours: 72 })

// Generate decision chain for executive briefing
generate_decision_chain({
  incident_id: "INC-APT29-2026",
  observations: [...all findings...],
  actions_taken: [...all blocks...],
  hypothesis: { apt_attribution: "APT29" }
})
```
