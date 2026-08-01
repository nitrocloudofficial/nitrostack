// src/widgets/lib/mockData.ts
// Mock data identical in shape to the assess_threat MCP tool response.
// Swap `getMockAssessment()` for `await assess_threat(input)` in useThreatAssessment.ts
// once the backend is wired up — no UI code needs to change.

import type { AssessThreatInput, AssessThreatResponse } from "./types";

export const defaultFormValues: AssessThreatInput = {
  night: true,
  poorLighting: true,
  routeDeviation: false,
  audioThreat: 35,
  latitude: 11.0168,
  longitude: 76.9558,
  guardianPhone: "+91 98765 43210",
};

export const mockAssessThreatResponse: AssessThreatResponse = {
  risk: 78,
  level: "High",
  action:
    "Elevated risk detected. Guardian has been notified and nearby safe locations have been located. Stay in well-lit, populated areas and consider moving toward the nearest safe zone.",
  decision: {
    level: "High",
    action: "notify_and_track",
    verifyUser: true,
    notifyGuardian: true,
    sendSMS: true,
    triggerFakeCall: false,
  },
  safeLocations: [
    {
      id: "loc_police_1",
      name: "Race Course Police Station",
      type: "police",
      distance: 1.2,
      estimatedTime: "6 min",
      latitude: 11.0056,
      longitude: 76.9661,
    },
    {
      id: "loc_hospital_1",
      name: "KMCH Hospital",
      type: "hospital",
      distance: 2.4,
      estimatedTime: "9 min",
      latitude: 11.0198,
      longitude: 76.9412,
    },
    {
      id: "loc_fire_1",
      name: "Coimbatore Fire Station",
      type: "fire_station",
      distance: 3.1,
      estimatedTime: "12 min",
      latitude: 11.0025,
      longitude: 76.9612,
    },
    {
      id: "loc_police_2",
      name: "Gandhipuram Police Outpost",
      type: "police",
      distance: 3.8,
      estimatedTime: "14 min",
      latitude: 11.0176,
      longitude: 76.9674,
    },
  ],
  communication: {
    sms: {
      success: true,
      provider: "Twilio (mock)",
      recipient: "+91 98765 43210",
      timestamp: new Date().toISOString(),
      message: "Your contact may be in danger. Last known location shared.",
    },
    whatsapp: {
      success: true,
      provider: "Meta WhatsApp Cloud API (mock)",
      recipient: "+91 98765 43210",
      timestamp: new Date().toISOString(),
      message: "🚨 Safety Alert: Elevated risk detected. Live location attached.",
    },
    fakeCall: {
      success: false,
      provider: "RakshaNet Voice Engine (mock)",
      recipient: "+91 98765 43210",
      timestamp: new Date().toISOString(),
      message: "Not triggered — risk level did not require a fake call.",
    },
    executed: ["sms", "whatsapp"],
  },
};

/**
 * Returns a mock assessment, lightly varied based on the input so the demo
 * feels responsive rather than static. Replace with a real MCP call:
 *
 *   const response = await assess_threat(input);
 *
 * The return shape is identical, so no downstream component needs to change.
 */
export async function getMockAssessment(
  input: AssessThreatInput
): Promise<AssessThreatResponse> {
  await new Promise((resolve) => setTimeout(resolve, 1800));

  let risk = 20;
  if (input.night) risk += 20;
  if (input.poorLighting) risk += 15;
  if (input.routeDeviation) risk += 20;
  risk += Math.round(input.audioThreat * 0.25);
  risk = Math.min(100, Math.max(0, risk));

  let level: AssessThreatResponse["level"] = "Low";
  if (risk >= 80) level = "Critical";
  else if (risk >= 60) level = "High";
  else if (risk >= 35) level = "Medium";

  return {
    ...mockAssessThreatResponse,
    risk,
    level,
    decision: {
      ...mockAssessThreatResponse.decision,
      level,
      triggerFakeCall: level === "Critical",
      notifyGuardian: risk >= 35,
      sendSMS: risk >= 35,
    },
  };
}
