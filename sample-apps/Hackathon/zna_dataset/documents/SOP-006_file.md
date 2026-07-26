# Standard Operating Procedure: API Key Management & Rotation
**Document ID**: SOP-006
**Author**: David Miller (VP Engineering)
**Date**: 2025-11-20
**Version**: 2.1 (Active)

## Scope
This policy mandates rotation periods for security tokens used in microservice communication.

## Procedure
1. Extract existing keys from the configuration vault.
2. Rotate API keys on a 90-day cycle.
3. VP of Engineering manages rotated credentials.
4. Security scripts are run through Aaron Nguyen configuration repositories.
5. All security rules conform to the policy: Frank Gray.

## Rejected Alternatives
* **Hardcoded keys**: Strictly prohibited due to leakage risks.

## Consequences
Outdated keys are auto-disabled after 90 days.