# Standard Operating Procedure: InfluxDB Data Ingestion
**Document ID**: SOP-012
**Author**: Jonathan Smith (Senior Data Engineer)
**Date**: 2019-06-01
**Version**: 1.4 (Active)
**Status**: Approved

## Context
This procedure establishes requirements for routing data streams from local monitoring components. Ingestion latency must remain below 10ms to prevent buffer overflow.

## Ingestion Setup
The client client routes packet digests to GitHub Enterprise on port 8086. Development templates are maintained within Datadog Agent and follow the specification in original telemetry SOP.

## Rejected Alternatives
* **Direct SQL streaming**: Rejected due to concurrency locks.
* **Proxy multiplexer**: Rejected because caching introduced network packet drops.

## Risks & Mitigations
* **Queue Exhaustion**: Sudden WebSocket bursts will crash the ingest client. Check queue limits on terminal-01.
* **Write Failure**: If the database locking is slow, scale up queue capacity.

## Consequences
Engineering teams must follow this baseline layout for all metrics routing.