# Changelog

All notable changes to the RemitWise AI project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-07-26 (NitroStack x Amrita University Hackathon MVP)

### Added
- **Multi-Agent Orchestrator**: Fast, intelligent orchestrator coordinating Exchange, Provider, and Compliance agents.
- **3-Tier Fallback Mechanism**: Resilient fallback engine (`OllamaProvider` -> `MockProvider` -> `RuleBasedPlanner`) ensuring zero downtime during LLM outages.
- **Live Exchange Rate Engine**: Real-time mid-market exchange rate lookup and historical rate time-series via Frankfurter API integration.
- **Provider Comparison Engine**: Comprehensive comparison across 5 remittance providers (Wise, Remitly, Western Union, Revolut, OFX) calculating net payout, transfer fees, and delivery speeds.
- **Compliance & KYC Verification**: Country-specific regulatory verification for 10 nations (US, IN, PH, MX, GB, CA, AU, EU, AE, SG) specifying required documentation and caps.
- **MCP Server Tools**: NitroStack / Model Context Protocol (MCP) server tool specifications for AI SDK client integration.
- **Modern React Dashboard**: React 19 + TypeScript + Vite frontend featuring interactive rate charts (Recharts), Confidence Meter, Best Deal cards, live rate ticker, and savings calculator.
- **Comprehensive Test Suite**: 64 passing unit and integration tests covering agent planning, API endpoints, schema validation, and fallback logic.
