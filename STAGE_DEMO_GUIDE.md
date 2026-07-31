# 🛡️ AEGIS PROTOCOL — STAGE DEMO GUIDE

## 3-Minute Stage Runbook

### Pre-Show Checklist (5 min before)

```powershell
# 1. Clear old logs
Remove-Item -Path "logs\stream.log" -ErrorAction SilentlyContinue

# 2. Verify mock data is in place
Get-ChildItem mocks\*.json | Format-Table Name, Length

# 3. Quick sanity check — run safe scenario
node scripts\trigger.mjs safe
```

---

## THE THREE-ACT DEMO

### 🟢 Act 1: "Business as Usual" (45 seconds)

**Talk Track:** _"This is a normal day at a bank's fraud monitoring desk. Transactions are clearing, everything looks green."_

```powershell
# Fire the safe transaction
node scripts\trigger.mjs safe
```

**What Happens:**
- Score: **12/100** (LOW)
- Pipeline runs through all 3 agents
- Transaction **clears normally**
- No guard activation, no alerts
- Console shows green checkmarks

**Key Point to Say:** _"Score 12. Below threshold. The system lets it pass — no friction for legitimate customers."_

---

### 🟡 Act 2: "Something's Off" (45 seconds)

**Talk Track:** _"Now a slightly suspicious transaction comes in. SBI gateway call, partial KYC, geographic mismatch."_

```powershell
# Fire the medium-risk transaction
node scripts\trigger.mjs medium
```

**What Happens:**
- Score: **~55/100** (MEDIUM)
- Flagged for **asynchronous review**
- No live interception — just queued for analyst team
- Yellow warnings in console

**Key Point to Say:** _"Score 55. Suspicious enough to flag, but not enough to block the customer. Queued for a human analyst to review within 24 hours."_

---

### 🔴 Act 3: THE DIGITAL ARREST (90 seconds)

**Talk Track:** _"And now — a Digital Arrest scam. A victim receives a call from what appears to be a CBI officer. The voice is AI-generated. The destination is a 3-day-old mule account. Watch what happens."_

```powershell
# 🚨 THE STAGE DEMO
node scripts\trigger.mjs critical
```

**What Happens:**
1. **Agent 1 (Investigator)** detects:
   - Cambodia VoIP spoofing CBI number `+91-11-24368305`
   - STIR/SHAKEN Level B (failed verification)
   - 97% deepfake probability — **AI voice confirmed**
   - 7 telecom anomalies including coercion keywords

2. **Agent 2 (Adjudicator)** scores:
   - Telecom: 30/30 ⚡
   - Deepfake: 34/35 ⚡
   - Financial: 35/35 ⚡
   - **Total: 95/100 — CRITICAL** 🚨

3. **@ThreatScoreGuard FIRES:**
   - Red HITL modal blocks the pipeline
   - 3-second simulated wait for fraud officer approval
   - MHA cybercrime alert dispatched to I4C

**Key Point to Say:** _"Score 95. The @Guard fires — the system literally STOPS the money transfer and puts it in front of a human fraud officer. Only after they click FREEZE & REPORT does the MHA alert go out. The victim's money is saved."_

---

## Split-Screen Setup (Windows Terminal)

### Option A: Two Terminal Tabs
1. **Left Tab**: Run `node scripts\stream_logs.mjs --follow` (log viewer)
2. **Right Tab**: Fire trigger scripts

### Option B: Windows Terminal Split Panes
```powershell
# Open Windows Terminal, then:
# Ctrl+Shift+D  → Split pane right
# Left pane:    node scripts\stream_logs.mjs --follow
# Right pane:   node scripts\trigger.mjs critical
```

### Option C: Two Separate Windows
```powershell
# Window 1: Start log viewer
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; node scripts\stream_logs.mjs --follow"

# Window 2: Fire triggers from here
node scripts\trigger.mjs critical
```

---

## Backup Plans

### If Node.js fails:
```powershell
# Check Node version
node --version  # Should be 18+

# If node_modules missing
npm install
```

### If logs aren't appearing:
```powershell
# Check if log file exists
Get-Content logs\stream.log -Tail 5

# Reset log file
"" | Out-File logs\stream.log
```

### If you need to restart fresh:
```powershell
# Clear everything
Remove-Item logs\stream.log -ErrorAction SilentlyContinue
node scripts\trigger.mjs critical
```

---

## Quick Reference — Scores & Commands

| Scenario | npm Shortcut | Direct Command | Score | Level | What Happens |
|----------|--------------|----------------|-------|-------|-------------|
| Safe | `npm run demo:safe` | `node scripts\trigger.mjs safe` | ~12 | LOW | Clears normally |
| Medium | `npm run demo:medium` | `node scripts\trigger.mjs medium` | ~55 | MEDIUM | Auto-flagged |
| Critical | `npm run demo:critical` | `node scripts\trigger.mjs critical` | ~95 | CRITICAL | 🚨 Guard + MHA |
| Stream Logs | `npm run demo:stream` | `node scripts\stream_logs.mjs` | - | - | Live JSON-RPC log viewer |

---

## Files Inventory

### Mock Data (`mocks/`)
| File | Scenario |
|------|----------|
| `telecom_event.json` | 🔴 Digital Arrest — Cambodia VoIP |
| `telecom_event_safe.json` | 🟢 Safe — HDFC verified |
| `telecom_event_medium.json` | 🟡 Medium — SBI gateway |
| `bank_event.json` | 🔴 Digital Arrest — 3-day mule |
| `bank_event_safe.json` | 🟢 Safe — 7yr ICICI account |
| `bank_event_medium.json` | 🟡 Medium — 8mo partial KYC |

### Scripts (`scripts/`)
| File | Purpose |
|------|---------|
| `trigger.mjs` | Core trigger engine |
| `stream_logs.mjs` | JSON-RPC log viewer |
| `trigger_safe_txn.sh/.ps1` | Safe trigger |
| `trigger_medium_txn.sh/.ps1` | Medium trigger |
| `trigger_digital_arrest.sh/.ps1` | 🚨 Stage demo trigger |
| `demo.sh/.ps1` | Universal launcher |
