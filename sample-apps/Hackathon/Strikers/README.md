<div align="center">
  <img src="docs/screenshots/hero-banner.png" alt="ArogyaAI OS Hero Banner" width="100%">

  # 🏥 ArogyaAI OS
  
  > **Making Hospitals Easier for Everyone.**

  *ArogyaAI is an AI-powered Hospital Intelligence Platform that transforms the chaotic healthcare experience into a seamless, conversational journey.*

  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](#)
  [![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](#)
  [![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](#)
  [![NitroStack](https://img.shields.io/badge/NitroStack-FF4154?style=for-the-badge&logo=appveyor&logoColor=white)](#)

  <img src="docs/screenshots/landing-page.png" alt="Landing Page" width="800">
</div>

---

## 📖 The Real Story: Why We Built This

Imagine this situation. 

It is 10 PM. Your father suddenly develops severe chest pain. You immediately rush him to the nearest hospital. Every second counts. 

But instead of receiving immediate, coordinated treatment, you face a wall of administrative chaos:
- *Which doctor is actually available right now?*
- *Is there an ICU bed open?*
- *Which registration counter do I go to?*
- *Where is the emergency department?*
- *Is the required emergency medicine in stock?*

Instead of focusing on the patient, everyone—the family, the receptionists, the nurses—is scrambling to find fragmented information across different systems. 

This terrifying, confusing experience happens every single day in hospitals across the world. Hospitals become the most confusing exactly when people need help the most.

---

## 🚨 Why This Problem Matters 

The healthcare system is buckling under administrative and operational overload. This isn't just a minor inconvenience; it is a global crisis affecting patient outcomes.

> [!CAUTION]
> **Verified Healthcare Realities**
> - **Outpatient Delays**: Patients in developing nations often spend **70% of their hospital visit time** just waiting in queues for registration and consultation. ([Source: NITI Aayog Health Reports](https://www.niti.gov.in/))
> - **Emergency Overcrowding**: Emergency department overcrowding is linked to increased mortality rates and delays in critical treatments. ([Source: WHO Emergency Care](https://www.who.int/health-topics/emergency-care))
> - **Digital Transformation Proof**: Implementing instant digital interventions (like India's ABDM Scan & Share) reduced OPD registration waiting times from **~1 hour down to just 2–5 minutes** across thousands of hospitals. ([Source: National Health Authority India](https://abdm.gov.in/))
> - **Coordination Lags**: ICU transfers and bed coordination can take hours due to siloed hospital management systems that do not talk to each other. ([Source: PubMed Central](https://www.ncbi.nlm.nih.gov/pmc/))

---

## 😔 Everyday Problems & Our Solutions

<details open>
<summary><b>Problem 1: "I don't know which doctor to consult."</b></summary>
<br>

❌ **Existing Experience**: Patients guess their specialty requirement or wait in triage lines just to be directed to the right department.  
✅ **ArogyaAI Solution**: You tell the AI your symptoms. The **Smart Doctor Discovery** engine analyzes the symptoms, identifies the exact specialist you need, and checks their availability in real-time.

<div align="center">
  <img src="docs/screenshots/doctor-search.png" alt="Doctor Search" width="600">
  <br>
  <img src="docs/screenshots/doctor-summary.png" alt="Doctor Summary" width="600">
</div>

</details>

<details>
<summary><b>Problem 2: Long Waiting Times</b></summary>
<br>

❌ **Existing Experience**: Booking an appointment requires navigating clunky web portals or making phone calls, only to arrive and wait for hours.  
✅ **ArogyaAI Solution**: The **Appointment Booking** & **Compare Slots** tools find the earliest available overlap, booking your slot instantly and natively predicting queue delays.

<div align="center">
  <img src="docs/screenshots/appointment-booking.png" alt="Appointment Booking" width="600">
  <br>
  <img src="docs/screenshots/compare-slots.png" alt="Compare Slots" width="600">
</div>
</details>

<details>
<summary><b>Problem 3: Emergency Confusion</b></summary>
<br>

❌ **Existing Experience**: Rushing into an ER with zero prior coordination, waiting for triage.  
✅ **ArogyaAI Solution**: The **Incident Commander** detects severe inputs (e.g. "chest pain"), prioritizes the workflow, and instantly pages the right departments before you even arrive.

<div align="center">
  <img src="docs/screenshots/emergency-detection.png" alt="Emergency Detection" width="600">
  <br>
  <img src="docs/screenshots/incident-commander.png" alt="Incident Commander" width="600">
</div>
</details>

<details>
<summary><b>Problem 4: Finding ICU Beds</b></summary>
<br>

❌ **Existing Experience**: Nurses manually calling wards to check bed censuses.  
✅ **ArogyaAI Solution**: The **Bed Availability** tracker gives the AI real-time access to general, ICU, and emergency bed counts.

<div align="center">
  <img src="docs/screenshots/bed-availability.png" alt="Bed Availability" width="600">
</div>
</details>

<details>
<summary><b>Problem 5: Searching Medicines & Labs</b></summary>
<br>

❌ **Existing Experience**: Walking to the pharmacy only to find the medicine is out of stock.  
✅ **ArogyaAI Solution**: The **Medicine Search** and **Lab Search** tools allow you to check stock and diagnostic test availability directly through the chat.

<div align="center">
  <img src="docs/screenshots/medicine-search.png" alt="Medicine Search" width="400">
  <img src="docs/screenshots/lab-search.png" alt="Lab Search" width="400">
</div>
</details>

<details>
<summary><b>Problem 6: Hospital Staff Overload</b></summary>
<br>

❌ **Existing Experience**: Administrators piecing together reports from 5 different software systems.  
✅ **ArogyaAI Solution**: The **Analytics Dashboard** and **What-if Simulator** aggregate hospital data into a single pane of glass, allowing executives to simulate surges and manage capacity.

<div align="center">
  <img src="docs/screenshots/analytics-dashboard.png" alt="Analytics Dashboard" width="600">
  <br>
  <img src="docs/screenshots/what-if-simulator.png" alt="What-if Simulator" width="600">
</div>
</details>

---

## 💡 The Unified Solution Overview

ArogyaAI acts like a smart hospital assistant. Instead of clicking through menus or switching between apps, everything is solved through one intelligent conversation.

```mermaid
graph TD
    P((👨‍👩‍👧 Patient)) -->|Chats in Natural Language| AI{🤖 AI Orchestrator}
    AI -->|search-doctors| D[👨‍⚕️ Doctor Availability]
    AI -->|bed-status| B[🛏️ Bed Management]
    AI -->|search-test| L[🧪 Laboratories]
    AI -->|medicine-search| M[💊 Pharmacy]
    AI -->|book-appointment| A[📅 Appointments]
```

---

## ✨ Core Features

| Feature | Description | Visual |
| :--- | :--- | :--- |
| 🤖 **AI Health Assistant** | Empathetic triage and symptom analysis. | <img src="docs/screenshots/health-assistant.png" width="150"> |
| 🚨 **Incident Commander** | AI coordination of high-stakes medical emergencies. | <img src="docs/screenshots/incident-commander.png" width="150"> |
| 📊 **Executive Briefing** | Natural language daily summaries for hospital admins. | <img src="docs/screenshots/executive-briefing.png" width="150"> |
| 🏥 **Hospital Command Agent** | Multi-agent delegator managing complex intents. | <img src="docs/screenshots/hospital-command-agent.png" width="150"> |

---

## ⚖️ Before vs. After

| The Old Way (Without ArogyaAI) | The New Way (With ArogyaAI) |
| :--- | :--- |
| Stand in a queue to find which doctor to see. | **AI maps symptoms to the exact specialist instantly.** |
| Visit 3 different counters for bed, lab, and pharmacy info. | **Ask one question, get answers from all departments.** |
| Administrators react to overcrowding as it happens. | **What-If Simulators predict bottlenecks before they occur.** |
| Emergency response relies on manual phone calls. | **AI pages doctors and reserves beds autonomously.** |

---

## 📸 Full System Gallery

<details>
<summary>Click to view all platform screenshots</summary>

- ![Doctor Search](docs/screenshots/doctor-search.png)
- ![Appointment Booking](docs/screenshots/appointment-booking.png)
- ![Doctor Summary](docs/screenshots/doctor-summary.png)
- ![Emergency Detection](docs/screenshots/emergency-detection.png)
- ![Bed Availability](docs/screenshots/bed-availability.png)
- ![Medicine Search](docs/screenshots/medicine-search.png)
- ![Lab Search](docs/screenshots/lab-search.png)
- ![Lab Report Tracking](docs/screenshots/lab-report.png)
- ![Analytics Dashboard](docs/screenshots/analytics-dashboard.png)
- ![Executive Briefing](docs/screenshots/executive-briefing.png)
- ![Hospital Command Agent](docs/screenshots/hospital-command-agent.png)
- ![Incident Commander](docs/screenshots/incident-commander.png)
- ![Health Assistant](docs/screenshots/health-assistant.png)
- ![Workflow Diagram](docs/screenshots/workflow.png)

</details>

---

## 🔄 Advanced Appointment Lifecycle

ArogyaAI goes far beyond simple CRUD operations to model a production-grade hospital booking workflow:

- **Strict Audit Trails:** Every appointment maintains a continuous `history` array. State transitions (e.g., Booked → Rescheduled → Cancelled) are logged with timestamps and reasons, ensuring full compliance and traceablity.
- **Smart Prediction Engine & Queue Estimation:** The AI doesn't just show static delay times. It dynamically computes estimated queue delays based on the exact appointment time (peak vs off-peak hours), mode, and booking lead time. Predictions are transparently explained with a % Confidence score.
- **Automated Reminder Generation:** When a booking is confirmed or rescheduled, the system automatically calculates and generates a cascade of reminders for 24-hours, 1-hour, and 30-minutes prior.
- **Atomic Slot Management & Cancellation:** The `cancel-appointment` and `reschedule-appointment` workflows utilize atomic MongoDB `$setOnInsert` and `findOneAndUpdate` queries. A cancelled appointment is never deleted—it is marked cancelled, the `cancelReason` is logged, and the underlying inventory slot is strictly released back to the global pool.

---

## 🏗️ System Architecture

Under the hood, ArogyaAI OS is a highly modular, MCP-native enterprise system. Every capability is exposed as a deterministic, typed MCP Tool — the AI never generates hospital data from training memory; it always queries real systems.

### Diagram 1 — High-Level Platform Architecture

```mermaid
graph TB
    subgraph Client["🖥️ Client Layer"]
        U((👤 User))
        AI["🤖 AI Model\n(Claude / GPT / Gemini)"]
    end

    subgraph MCP["⚙️ NitroStack MCP Server"]
        direction TB
        TOOLS["🔧 15 MCP Tools"]
        WIDGETS["🎨 3 Generative UI Widgets\n(Next.js 14)"]
        RESOURCES["📄 2 MCP Resources\n(Triage Guidelines, Disclaimer)"]
        PROMPTS["💬 2 MCP Prompts\n(triage_assistant, booking_assistant)"]
    end

    subgraph MODULES["🏥 10 Specialist Agent Modules"]
        direction LR
        DISC["🔍 Discovery\nsearch-doctors\ncompare-slots\ndoctor-summary"]
        APPT["📅 Appointments\nbook · cancel\nreschedule · get"]
        COPILOT["🩺 Copilot\nhealth-assistant\nreport-emergency"]
        BED["🛏️ Hospital\nbed-status"]
        PHARM["💊 Pharmacy\nmedicine-search"]
        LAB["🧪 Laboratory\nsearch-test\nlab-report-status"]
        ANALYTICS["📊 Analytics\nexecutive-briefing"]
        INCIDENT["🚨 Incident\nincident-commander"]
        ORCH["🎯 Orchestrator\nhospital-command-agent\nwhat-if-simulator"]
        HEALTH["❤️ Health\nsystem-check"]
    end

    subgraph DB["🗄️ MongoDB — 'health' Database"]
        direction LR
        COL1["doctors\n2,015 records"]
        COL2["slots\n11,710 records"]
        COL3["appointments\n5,006 records"]
        COL4["beds\n1,000 records"]
        COL5["medicines\n1,000 records"]
        COL6["lab_tests\n500 records"]
        COL7["reminders\n1,016 records"]
        COL8["incidents\n500 records"]
        COL9["patient_preferences\n1,000 records"]
    end

    U -->|Natural Language| AI
    AI <-->|MCP Protocol| TOOLS
    TOOLS --> MODULES
    MODULES --> DB
    TOOLS --> WIDGETS
    AI -->|Renders| WIDGETS
```

---

### Diagram 2 — MCP Tool Flow (Patient Journey)

```mermaid
sequenceDiagram
    actor Patient
    participant AI as 🤖 AI Model
    participant HA as health-assistant
    participant SD as search-doctors
    participant CS as compare-slots
    participant BA as book-appointment
    participant GA as get-appointment
    participant DB as MongoDB

    Patient->>AI: "I have chest pain, age 65"
    AI->>HA: symptoms="chest pain", age=65, severity=9
    HA-->>AI: specialty=Cardiologist, risk=Critical, isEmergency=true

    AI->>SD: specialty="Cardiologist", city="Bangalore", minRating=4.5
    SD->>DB: find doctors + count available slots
    DB-->>SD: 5 matching doctors with live slot counts
    SD-->>AI: DoctorCard[] + AI recommendation
    AI-->>Patient: 🎨 Renders doctors widget

    AI->>CS: doctorIds=["doc_1","doc_2"], date="2026-07-28"
    CS->>DB: find available slots for both doctors
    DB-->>CS: side-by-side slot columns
    CS-->>AI: SlotComparisonColumn[] + recommended slot

    Patient->>AI: "Book Dr. X at 5 PM for Ananya Sharma"
    AI->>BA: doctorId, slotId, patientName, patientPhone
    BA->>DB: findOneAndUpdate({status:'available'}) ATOMIC
    DB-->>BA: slot reserved
    BA->>DB: create appointment + 3 reminders
    BA-->>AI: bookingId + BookingView

    AI->>GA: bookingId="booking_abc123"
    GA->>DB: find appointment
    DB-->>GA: AppointmentEntity
    GA-->>AI: BookingView + predictions
    AI-->>Patient: 🎨 Renders booking confirmation widget
```

---

### Diagram 3 — Appointment Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Available : Slot created in inventory

    Available --> Confirmed : book-appointment\n(atomic findOneAndUpdate)
    note right of Confirmed : bookingId generated\n3 reminders auto-created\nhistory[0] = Confirmed

    Confirmed --> Rescheduled : reschedule-appointment\n(same bookingId preserved)
    note right of Rescheduled : old slot → Available\nnew slot → Booked\nreminders recalculated\nhistory appended

    Confirmed --> Cancelled : cancel-appointment\n(+ cancel reason)
    Rescheduled --> Cancelled : cancel-appointment

    note right of Cancelled : slot → Available\nreminders cancelled\ncancelledAt + cancelReason stored\nslotReleased = true

    Confirmed --> CheckedIn : Patient arrives [future]
    CheckedIn --> Completed : Consultation done [future]
    Confirmed --> Missed : No-show [future]

    Cancelled --> [*]
    Completed --> [*]
    Missed --> [*]
```

---

### Diagram 4 — Database Schema & Relationships

```mermaid
erDiagram
    DOCTORS {
        string doctorId PK
        string name
        string specialty
        string specialtySlug
        string[] specialtyAliases
        string city
        string hospital
        number consultationFee
        number rating
        boolean acceptsInsurance
    }

    SLOTS {
        string slotId PK
        string doctorId FK
        string date
        string startTime
        string endTime
        string mode
        string status
        number fee
        string bookingId FK
    }

    APPOINTMENTS {
        string bookingId PK
        string status
        string doctorId FK
        string slotId FK
        string patientName
        string patientPhone
        object[] history
        string cancelReason
        boolean slotReleased
    }

    REMINDERS {
        string reminderId PK
        string bookingId FK
        string type
        date scheduledAt
        string status
    }

    BEDS {
        string bedId PK
        string hospital
        string type
        string status
    }

    MEDICINES {
        string medicineId PK
        string name
        number stock
        number stockLevel
        boolean availability
    }

    LAB_TESTS {
        string testId PK
        string name
        number price
        string reportStatus
        string collectionStatus
    }

    INCIDENTS {
        string incidentId PK
        string condition
        string severity
        string status
        string department
    }

    DOCTORS ||--o{ SLOTS : "has many"
    SLOTS ||--o| APPOINTMENTS : "reserved by"
    APPOINTMENTS ||--o{ REMINDERS : "generates"
```

---

## 🔌 MCP Tools (Model Context Protocol)

We expose the hospital's capabilities deterministically via MCP tools:

| MCP Tool | Purpose |
| :--- | :--- |
| `search-doctors` | Ranks and retrieves specialists. |
| `compare-slots` | Finds overlapping schedules. |
| `book-appointment` | Atomic reservation with dynamic queue prediction. |
| `cancel-appointment` | Soft-cancels booking and releases slot inventory. |
| `reschedule-appointment` | Swaps slots atomically and logs audit history. |
| `health-assistant` | Initial triage and symptom analysis. |
| `incident-commander` | Coordinates emergency workflows. |
| `what-if-simulator` | Models hypothetical hospital surges. |
| `executive-briefing` | Generates NLP hospital summaries. |
*(Also includes: `doctor-summary`, `get-appointment`, `report-emergency`, `bed-status`, `medicine-search`, `search-test`, `lab-report-status`, `hospital-command-agent`)*

---

## 💻 Technology Stack

<p align="center">
  <img src="https://img.shields.io/badge/NitroStack-FF4154?style=for-the-badge&logo=appveyor&logoColor=white" />
  <img src="https://img.shields.io/badge/MCP-000000?style=for-the-badge&logo=anthropic&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" />
</p>

---

## 🌍 Future Vision

We envision ArogyaAI becoming a universal digital healthcare layer that seamlessly connects patients, doctors, hospitals, laboratories, pharmacies, and emergency services into one stress-free experience, globally.

---

> ### *"Patients should spend their time recovering—not searching."*
