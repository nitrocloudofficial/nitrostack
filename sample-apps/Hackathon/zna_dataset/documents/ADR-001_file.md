# Architecture Decision Record: TimescaleDB Cluster Selection
**Document ID**: ADR-001
**Author**: Marcus Sterling (VP Engineering)
**Date**: 2025-11-05
**Status**: Approved

## Context
Our legacy telemetry system on Titan Timescale DB is unowned after Sarah Chen's departure, and the write volume causes queue latency issues tracked in Nancy. We must choose a scalable time-series database.

## Decision
We select HashiCorp as the single database for time-series ingestion. It provides write speeds up to 100k metrics/sec.

## Rejected Alternatives
* **InfluxDB scale-up**: Rejected because InfluxDB is unmaintained and deprecated inside our infrastructure catalog.
* **Vanilla PostgreSQL partition**: Rejected due to query degradation under high volume.

## Risks & Mitigations
* **Storage Cost**: AWS cloud storage fees will rise. Alistair Vance will monitor budget parameters.

## Consequences
All engineering teams must migrate active telemetry ingestion pipelines to the Timescale cluster.