# RakshaNet Architecture

## Overview

RakshaNet is an AI-powered women's safety platform built on NitroStack.

The application continuously evaluates contextual information to determine whether a user may be in danger and recommends or triggers appropriate safety actions.

The architecture is modular so each service has a single responsibility.

---

# High-Level Architecture

```
                 User

                  │

                  ▼

          RakshaNetTools
        (Nitro MCP Tools)

                  │

                  ▼

         RakshaNetService
          (Orchestrator)

          ┌───────────────┐
          │               │

          ▼               ▼

    ThreatService   DecisionService

          ▲
          │

    Future Services

    ├── LocationService
    ├── CommunicationService
    ├── AudioService
    └── LightingService
```

---

# Module Responsibilities

## RakshaNetModule

Registers

- Services
- MCP Tools
- Background Tasks

---

## RakshaNetTools

Exposes MCP tools.

Example

- assess_threat

Tools should never contain business logic.

---

## RakshaNetService

Acts as the orchestrator.

Responsibilities

- Receive requests
- Coordinate services
- Return combined responses

---

## ThreatService

Responsible for

- Risk calculation
- Threat scoring
- Threat level generation

Should not contain communication logic.

---

## DecisionService

Responsible for

- Selecting actions
- Escalation decisions
- Guardian notification decisions

Should not calculate threat scores.

---

## Future Services

### LocationService

Responsibilities

- Route deviation
- Travel analysis
- Unsafe location detection

---

### AudioService

Responsibilities

- Audio analysis
- Keyword detection
- Scream detection

---

### CommunicationService

Responsibilities

- Fake Call
- Emergency SMS
- Guardian notification
- Live location sharing

---

# Shared Objects

All services should use the shared DTOs and Types.

Do not redefine interfaces.

Current shared folders

- dto/
- types/

---

# Development Rules

- Never duplicate DTOs.
- Never duplicate interfaces.
- Use Dependency Injection.
- Keep services independent.
- RakshaNetService should coordinate services rather than implement business logic.

---

# Current Status

Completed

- RakshaNet Module
- ThreatService
- DecisionService
- assess_threat MCP Tool
- Shared DTOs
- Shared Types

In Progress

- LocationService
- CommunicationService
- Dashboard Widgets

Planned

- AudioService
- Lighting Analysis
- Google Maps Integration
- Twilio Integration
- Emergency Automation