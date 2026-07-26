# Post-Mortem Review: Telemetry Outage
**Date**: 2020-03-12
**Attendees**: Marcus Sterling, Sarah Chen, Alistair Vance
**Missing**: Sarah Jenkins (Compliance sync conflict)

## Summary of Discussion
Sarah Chen detailed the WebSocket surge that crashed server room ingestion client. The immediate fix was scaling the socket buffer. Alistair Vance raised friction regarding IT Operations' monitoring: IT was not updated regarding this buffer tweak, impacting Incident TICKET-8902 logging feeds. Alistair requested IT Ops approval before telemetry configs are modified.

## Action Items
* [ ] Update config template in repository (Assigned to: Sarah Chen)
* [ ] Verify monitoring status on Janet (Assigned to: Marcus Sterling)