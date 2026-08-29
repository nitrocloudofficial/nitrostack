# Synthetic Enterprise Knowledge Base Data

This directory contains the synthetic enterprise knowledge base used by the Knowledge Integrity MCP Server.

| File | Description |
|------|-------------|
| `authoritative_sources.json` | Current version (v2) of all authoritative enterprise sources and their facts |
| `authoritative_sources_v1.json` | Previous version (v1) of authoritative sources — used for change detection |
| `documents.json` | 23 enterprise documents with claims, dependencies, and metadata |
| `dependencies.json` | Pre-computed dependency graph mapping source facts to dependent document claims |
| `pending_updates.json` | Proposed remediation updates awaiting human approval (starts empty) |
| `audit_log.json` | History of all approved and applied knowledge changes (starts empty) |
