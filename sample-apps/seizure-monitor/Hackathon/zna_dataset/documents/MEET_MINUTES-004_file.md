# Kickoff: Project Titan Database Migration
**Date**: 2025-11-05
**Attendees**: Marcus Sterling, Jonathan Smith, Alistair Vance
**Missing**: Rajesh Patel (Network maintenance)

## Notes
The team reviewed [ADR-001](file:///zna_dataset/documents/ADR-001_file.md) regarding migration of telemetry from legacy Elasticsearch Index to the new TimescaleDB_Cluster instance. Alistair Vance raised friction regarding IT Operations' cloud budget: AWS us-east-1 costs are expected to surge, which requires budget clearance. Jonathan Smith will monitor migration progress under Epic Datadog log collector.

## Action Items
* [ ] Deploy TimescaleDB dev instances (Assigned to: Jonathan Smith)
* [ ] Set up billing alerts for storage partitions (Assigned to: Alistair Vance)