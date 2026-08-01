// src/modules/triage/triage.tasks.ts
import { OnEvent } from '@nitrostack/core';

export class TriageTasks {
  @OnEvent('emergency.detected')
  async onEmergencyDetected(payload: any) {
    // hook point: call hospital-finder tool, notification tool, etc.
    console.log(`[EMERGENCY] ${payload.patientName} — severity: ${payload.severity}`);
    // next: orchestrate hospital-finder + notification modules from here
  }
}