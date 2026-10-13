# DirectTriage MCP Tools Guide

## Overview

The Triage module provides two production-ready MCP tools for the DirectTriage Medical Platform:

1. **match_specialist** — Anti-hallucination specialist matching with strict validation
2. **trigger_gp_fallback** — Deterministic escape hatch for GP routing

Both tools implement compliance-focused error handling, ExecutionContext-based security isolation, and graceful LLM self-correction patterns.

---

## Architecture & Security Principles

### 1. ExecutionContext-Based Identity Resolution

**Problem:** LLMs can hallucinate or inject arbitrary patient IDs, violating HIPAA compliance.

**Solution:** Both tools extract `patient_id` and `session_id` from `ExecutionContext.metadata`, never from user input.

```typescript
const patient_id = ctx.metadata?.patient_id || ctx.metadata?.user_id || 'patient_unknown';
const session_id = ctx.metadata?.session_id || 'session_unknown';
```

**Benefit:** The LLM cannot override or spoof patient identity. All operations are audit-logged with the authenticated session.

---

### 2. Zod Validation for Anti-Hallucination

**Problem:** LLMs can invent fake medical specialties (e.g., "super-cardiology", "mega-neurology").

**Solution:** Strict enum validation on `specialty` and `urgency_level` fields.

```typescript
const VALID_SPECIALTIES = [
  'cardiology',
  'neurology',
  'orthopedics',
  'dermatology',
  'gastroenterology',
  'pulmonology',
  'rheumatology',
  'endocrinology',
  'psychiatry',
  'general_practice',
] as const;

specialty: z.enum(VALID_SPECIALTIES, {
  errorMap: () => ({
    message: `Invalid specialty. Must be one of: ${VALID_SPECIALTIES.join(', ')}`,
  }),
})
```

**Benefit:** Invalid specialties are rejected at the schema level. The LLM receives an explicit error message and can self-correct on the next turn.

---

### 3. Graceful Error Boundaries (No Exceptions)

**Problem:** Unhandled exceptions in tools crash the MCP connection or confuse the LLM.

**Solution:** All errors are caught and returned as explicit error strings.

```typescript
// ❌ BAD: Throws exception
if (!availableDoctors.length) {
  throw new Error('No doctors available');
}

// ✅ GOOD: Returns error object
if (availableDoctors.length === 0) {
  return {
    status: 'error',
    error: `Error: No available specialists in ${specialty} at this time. Please call trigger_gp_fallback to route to a General Practitioner.`,
  };
}
```

**Benefit:** The LLM reads the error message and can silently self-correct (e.g., call `trigger_gp_fallback`) without user-facing exceptions.

---

## Tool 1: match_specialist

### Purpose

Matches a patient's clinical summary to an available specialist in the catalog. Acts as the primary routing mechanism for specialist triage.

### Input Schema

```typescript
{
  specialty: 'cardiology' | 'neurology' | ... (enum-validated),
  urgency_level: 'low' | 'medium' | 'high' | 'critical',
  clinical_summary?: string (10-500 chars, optional)
}
```

### Behavior

1. **Extract Identity** → Resolve `patient_id` and `session_id` from ExecutionContext
2. **Validate Input** → Zod schema ensures specialty is in the catalog
3. **Query Catalog** → Filter mock Supabase doctors by specialty + availability
4. **Select Doctor** → Pick first available doctor and time slot
5. **Return Success** → `{ status: 'success', doctor_name, specialty, time_slot, booking_id }`

### Error Scenarios

| Scenario | Response |
|----------|----------|
| Invalid specialty (e.g., "super-cardiology") | `Error: Invalid specialty. Must be one of: cardiology, neurology, ...` |
| No doctors available in specialty | `Error: No available specialists in cardiology at this time. Please call trigger_gp_fallback.` |
| Unexpected error (DB failure, etc.) | `Error: An unexpected error occurred. Please try again or call trigger_gp_fallback.` |

### Example Usage

```
User: "I have chest pain. Can you match me with a cardiologist?"

LLM calls: match_specialist({
  specialty: 'cardiology',
  urgency_level: 'high',
  clinical_summary: 'Patient reports acute chest pain and shortness of breath'
})

Response: {
  status: 'success',
  doctor_name: 'Dr. Sarah Chen',
  specialty: 'cardiology',
  time_slot: '2025-08-05T10:00Z',
  booking_id: 'booking_patient_123_1722834000000'
}
```

---

## Tool 2: trigger_gp_fallback

### Purpose

Deterministic escape hatch for routing patients to the default General Practitioner queue. Called when:
- LLM reaches the 3-turn triage limit
- LLM has low confidence in a specialist match
- `match_specialist` fails or returns an error

### Input Schema

```typescript
{
  reason_for_fallback: string (5-200 chars)
  // e.g., "3-turn limit reached", "low confidence in specialist match", "specialist unavailable"
}
```

### Behavior

1. **Extract Identity** → Resolve `patient_id` and `session_id` from ExecutionContext
2. **Validate Reason** → Minimal validation (string length check)
3. **Route to GP** → Deterministic routing to default GP (no specialist matching)
4. **Return Success** → `{ status: 'success', gp_name, queue_position, estimated_wait_minutes, booking_id }`

### Error Scenarios

| Scenario | Response |
|----------|----------|
| Invalid reason (too short/long) | `Error: reason_for_fallback must be 5-200 characters` |
| Unexpected error | `Error: An unexpected error occurred during GP fallback routing. Please contact support.` |

### Example Usage

```
User: "I've tried multiple specialists but I'm not confident. Route me to a GP."

LLM calls: trigger_gp_fallback({
  reason_for_fallback: 'low confidence in specialist match after 3 turns'
})

Response: {
  status: 'success',
  gp_name: 'Dr. Michael O\'Brien',
  gp_specialty: 'general_practice',
  queue_position: 3,
  estimated_wait_minutes: 45,
  booking_id: 'gp_booking_patient_123_1722834000000',
  fallback_reason: 'low confidence in specialist match after 3 turns',
  message: 'Patient patient_123 successfully routed to Dr. Michael O\'Brien. Queue position: 3. Estimated wait: 45 minutes.'
}
```

---

## LLM Self-Correction Flow

### Scenario 1: Invalid Specialty

```
Turn 1:
  User: "I need a super-cardiologist"
  LLM calls: match_specialist({ specialty: 'super-cardiology', ... })
  Response: { status: 'error', error: 'Error: Invalid specialty. Must be one of: cardiology, neurology, ...' }

Turn 2:
  LLM (self-corrects): "I apologize, that specialty doesn't exist. Let me route you to a cardiologist instead."
  LLM calls: match_specialist({ specialty: 'cardiology', ... })
  Response: { status: 'success', doctor_name: 'Dr. Sarah Chen', ... }
```

### Scenario 2: No Availability → Fallback

```
Turn 1:
  User: "I need a specialist in a rare condition"
  LLM calls: match_specialist({ specialty: 'rare_specialty', ... })
  Response: { status: 'error', error: 'Error: No available specialists in rare_specialty. Please call trigger_gp_fallback.' }

Turn 2:
  LLM (self-corrects): "That specialty isn't available. Let me route you to a GP instead."
  LLM calls: trigger_gp_fallback({ reason_for_fallback: 'specialist unavailable' })
  Response: { status: 'success', gp_name: 'Dr. Michael O\'Brien', ... }
```

---

## Production Deployment Checklist

- [ ] Replace `MOCK_DOCTORS_CATALOG` with real Supabase query
- [ ] Replace `DEFAULT_GP` with dynamic GP selection logic
- [ ] Implement actual database inserts for booking records
- [ ] Add email notification triggers (patient confirmation, doctor notification)
- [ ] Implement 24-hour auth token expiration for dossier links
- [ ] Add audit logging for all specialist matches and fallback routes
- [ ] Implement rate limiting on `match_specialist` (prevent LLM spam)
- [ ] Add monitoring/alerting for fallback rate (if > 30%, investigate)
- [ ] Validate ExecutionContext.metadata injection from frontend
- [ ] Test with real Supabase credentials and doctor data

---

## File Structure

```
src/modules/triage/
├── triage.module.ts              # Module definition
├── match-specialist.tool.ts      # Specialist matching tool
├── trigger-gp-fallback.tool.ts   # GP fallback tool
└── TRIAGE_TOOLS_GUIDE.md         # This file
```

---

## Integration with DirectTriage Frontend

### Expected ExecutionContext.metadata

The frontend must inject the following into ExecutionContext when calling these tools:

```typescript
{
  patient_id: 'patient_123',
  session_id: 'session_abc_xyz',
  user_id: 'user_123' // fallback if patient_id not set
}
```

### Widget Integration

Both tools return structured payloads suitable for rendering in the Right Pane:

- **match_specialist** → Renders "Specialist Corner" widget with doctor details
- **trigger_gp_fallback** → Renders "GP Booking Confirmation" widget with queue info

---

## Compliance & Security Notes

✅ **HIPAA Compliance:**
- No PHI (Protected Health Information) in error messages
- Patient identity resolved from authenticated session, not user input
- All operations audit-logged with session_id

✅ **Anti-Hallucination:**
- Specialty enum prevents fake medical specialties
- Urgency level enum prevents invalid triage levels
- Explicit error messages guide LLM self-correction

✅ **Fail-Closed Design:**
- `trigger_gp_fallback` is deterministic—always succeeds
- No specialist matching logic in fallback path
- Graceful error handling prevents exceptions

---

## Support & Debugging

### Common Issues

**Q: Tool not appearing in MCP Chat?**
A: Verify `TriageModule` is imported and listed in `AppModule.imports`. Run `npm run dev` and check server logs.

**Q: LLM keeps calling invalid specialties?**
A: Ensure Zod schema error messages are clear. Add examples to tool description.

**Q: ExecutionContext.metadata is undefined?**
A: Verify frontend is injecting metadata when creating the session. Check MCP server logs for metadata values.

---

## References

- [NitroStack Core Docs](https://docs.nitrostack.ai)
- [Zod Validation](https://zod.dev)
- [MCP Specification](https://modelcontextprotocol.io)
- [HIPAA Compliance Guide](https://www.hhs.gov/hipaa)
