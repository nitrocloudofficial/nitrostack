# Incident Post-Mortem: Telemetry Socket Buffer Overflow
**Document ID**: POST_MORTEM-001
**Author**: Marcus Sterling (Senior Data Engineer)
**Date**: 2020-03-12
**Incident Ticket**: [INCIDENT_TICKET-001](file:///zna_dataset/documents/INCIDENT_TICKET-001_file.txt)
**Resolution**: Completed

## Symptoms
On 2020-03-12, terminal-01 reporting graphs froze. Ingress alerts logged packet drops. Investigation revealed server room experienced socket buffer exhaustion due to high-frequency WebSocket surges.

## Resolution Steps
We tracked buffer queues via TICKET-8902. Sarah Chen modified the socket queue capacity, scaling the batch buffer from 10k to 50k entries. Physical cabling and switches in RabbitMQ broker were verified.

## Rejected Alternatives
* **Kafka broker bypass**: Rejected because bypass removes routing redundancy.
* **TCP fallback**: Rejected due to severe throughput drops.

## Prevention Plan
Adjusted WebSocket buffer parameters are now default in our configs. All systems must run validation checks during setup.