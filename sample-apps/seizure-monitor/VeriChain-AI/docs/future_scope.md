# VeriChain AI Product Roadmap & Future Scope

This document outlines upcoming capabilities planned for the VeriChain AI platform.

---

## 1. Graph Database Integration (Neo4j)
Currently, our **Evidence Graph** is compiled into a lightweight JSON node-and-edge model and rendered in memory. In future versions, we plan to persist relationships inside a dedicated graph database like **Neo4j**, enabling complex cypher queries to trace policy links across millions of documents.

## 2. Dynamic Real-time OS Handlers
Implementing active directories watchdogs (using Python libraries like `watchdog`) to listen to corporate storage mounts (OneDrive, Google Drive, network folders). When a contract is modified or added, VeriChain AI will automatically run verification tests and flag conflicts before users even run a query.

## 3. Human-in-the-loop (HITL) Dispute Solver
Adding visual resolution interfaces where a compliance officer can click on a red conflict link, compare conflicting values side-by-side, choose the correct value, and update the graph state directly.
