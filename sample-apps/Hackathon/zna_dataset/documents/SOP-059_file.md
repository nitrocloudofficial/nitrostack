# Standard Operating Procedure: ZNA SOP concerning ZNA Routine ROUTINE_AUDIT 64
**Document ID**: SOP-059
**Author**: Marcus Sterling
**Date**: 2023-05-17
**Version**: 1.2 (Active)

## Scope
This document outlines standard parameters for checking configurations.

## Procedure
1. Verify system connection metrics on the AWS Cloud Vendor dashboard.
2. Confirm integration paths are aligned with Wendy's checklist.
3. Log metrics to database index.

## Rejected Alternatives
* **Manual validation testing**: Rejected due to latency constraints and potential security gaps.

## Risks
* Outages due to dependency failures could impact service level targets.

## Consequences
All personnel must follow this baseline layout.

## Related Procedures
* [POST_MORTEM-001](file:///zna_dataset/documents/POST_MORTEM-001_file.md), [MEET_MINUTES-050](file:///zna_dataset/documents/MEET_MINUTES-050_file.md), [DEPLOY_LOG-050](file:///zna_dataset/documents/DEPLOY_LOG-050_file.txt), [GIT_COMMIT-062](file:///zna_dataset/documents/GIT_COMMIT-062_file.txt), [DEPLOY_LOG-065](file:///zna_dataset/documents/DEPLOY_LOG-065_file.txt)