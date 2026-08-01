// src/widgets/lib/types.ts
// Shared TypeScript types for RakshaNet, mirroring the assess_threat MCP tool contract 1:1.
// Keep this file in sync with the backend RakshaNetService response shape.

export type ThreatLevel = "Low" | "Medium" | "High" | "Critical";

export interface AssessThreatInput {
  night: boolean;
  poorLighting: boolean;
  routeDeviation: boolean;
  audioThreat: number; // 0-100
  latitude: number;
  longitude: number;
  guardianPhone: string;
}

export interface Decision {
  level: string;
  action: string;
  verifyUser: boolean;
  notifyGuardian: boolean;
  sendSMS: boolean;
  triggerFakeCall: boolean;
}

export interface SafeLocation {
  id: string;
  name: string;
  type: "police" | "hospital" | "fire_station" | string;
  distance: number; // in km
  estimatedTime: string; // e.g. "6 min"
  latitude: number;
  longitude: number;
}

export interface CommunicationChannelResult {
  success: boolean;
  provider: string;
  recipient: string;
  timestamp: string; // ISO string
  message?: string;
}

export interface Communication {
  sms: CommunicationChannelResult | null;
  whatsapp: CommunicationChannelResult | null;
  fakeCall: CommunicationChannelResult | null;
  executed: string[];
}

export interface AssessThreatResponse {
  risk: number; // 0-100
  level: ThreatLevel;
  action: string;
  decision: Decision;
  safeLocations: SafeLocation[];
  communication: Communication;
}

// UI-only state wrapper used by the page/hook to track the assessment lifecycle.
export type AssessmentStatus = "idle" | "loading" | "success" | "error";

export interface TimelineStep {
  id: string;
  label: string;
  description: string;
  status: "pending" | "active" | "done";
  icon: "alert" | "cpu" | "map-pin" | "shield" | "message-circle" | "phone";
}
