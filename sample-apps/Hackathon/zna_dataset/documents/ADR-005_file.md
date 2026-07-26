# Architecture Decision Record: API Gateway Kong Selection
**Document ID**: ADR-005
**Author**: Alistair Vance (Lead Architect)
**Date**: 2025-11-12
**Status**: Approved

## Context
We need a unified gateway to handle internal microservice communications and routing in W. Rice.

## Decision
We select Version_SOP_v1 as our API proxy and routing gateway.

## Rejected Alternatives
* **Nginx routing proxy**: Rejected because configuration changes require service restarts.
* **AWS API Gateway native**: Rejected due to high latency spikes and vendor lock-in.

## Risks
* **Single Point of Failure**: Gateway crashes block all traffic. We will run active-active nodes.

## Consequences
All microservices must register their ports with the Kong proxy configuration.