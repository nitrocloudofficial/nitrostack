// Types mirroring PostHog + MCP server schemas
export interface SessionData {
  id: string;
  customerId: string;
  customerName: string;
  cif: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  startTime: string;
  duration: number; // minutes
  currentPage: string;
  riskScore: number; // 0-100
  status: "active" | "ended" | "escalated";
  rageClicks: number;
  failedSubmissions: number;
  navigationLoops: number;
}

export interface SessionEvent {
  id: string;
  sessionId: string;
  timestamp: string;
  type: "page_view" | "click" | "form_submit" | "form_error" | "rage_click" | "navigation_loop" | "api_error" | "nudge_shown" | "nudge_engaged";
  page: string;
  detail: string;
  severity: "info" | "warning" | "critical";
}

export interface NudgeRecord {
  id: string;
  sessionId: string;
  timestamp: string;
  type: "contextual_help" | "proactive_chat" | "tooltip" | "banner";
  message: string;
  trigger: string;
  engaged: boolean;
  escalationPrevented: boolean;
}

export interface RiskBreakdown {
  rageClicks: { count: number; weight: number; score: number };
  failedForms: { count: number; weight: number; score: number };
  navLoops: { count: number; weight: number; score: number };
  timeOnPage: { seconds: number; avgSeconds: number; weight: number; score: number };
  backAndForth: { count: number; weight: number; score: number };
}

// --- Mock Sessions ---
export const mockSessions: SessionData[] = [
  { id: "sess_a1b2c3", customerId: "CUST001", customerName: "Ramesh Kumar Sharma", cif: "30014782291", device: "Windows 11 / Chrome 126", browser: "Chrome", ip: "103.42.xx.xx", location: "New Delhi", startTime: "2026-07-25T12:30:00", duration: 42, currentPage: "/dashboard — Fund Transfer", riskScore: 89, status: "active", rageClicks: 7, failedSubmissions: 4, navigationLoops: 3 },
  { id: "sess_d4e5f6", customerId: "CUST002", customerName: "Priya Mehta", cif: "30014893102", device: "iPhone 15 / Safari", browser: "Safari", ip: "49.36.xx.xx", location: "Mumbai", startTime: "2026-07-25T12:45:00", duration: 28, currentPage: "/dashboard — Add Beneficiary", riskScore: 76, status: "active", rageClicks: 5, failedSubmissions: 3, navigationLoops: 2 },
  { id: "sess_g7h8i9", customerId: "CUST003", customerName: "Arun Patel", cif: "30015001847", device: "Android / Chrome 126", browser: "Chrome", ip: "122.172.xx.xx", location: "Ahmedabad", startTime: "2026-07-25T11:20:00", duration: 95, currentPage: "/dashboard — IMPS Transfer", riskScore: 94, status: "escalated", rageClicks: 12, failedSubmissions: 6, navigationLoops: 5 },
  { id: "sess_j1k2l3", customerId: "CUST004", customerName: "Sunita Devi", cif: "30015112938", device: "Windows 10 / Edge", browser: "Edge", ip: "59.89.xx.xx", location: "Lucknow", startTime: "2026-07-25T13:00:00", duration: 15, currentPage: "/dashboard — Balance Enquiry", riskScore: 22, status: "active", rageClicks: 0, failedSubmissions: 0, navigationLoops: 0 },
  { id: "sess_m4n5o6", customerId: "CUST005", customerName: "Vikram Singh", cif: "30015224019", device: "MacBook / Safari", browser: "Safari", ip: "106.51.xx.xx", location: "Bengaluru", startTime: "2026-07-25T12:10:00", duration: 55, currentPage: "/login — Login Page", riskScore: 61, status: "active", rageClicks: 3, failedSubmissions: 2, navigationLoops: 1 },
  { id: "sess_p7q8r9", customerId: "CUST006", customerName: "Meera Krishnan", cif: "30015335100", device: "iPad / Safari", browser: "Safari", ip: "117.193.xx.xx", location: "Chennai", startTime: "2026-07-25T10:45:00", duration: 120, currentPage: "/dashboard — e-Statement", riskScore: 35, status: "ended", rageClicks: 1, failedSubmissions: 0, navigationLoops: 1 },
  { id: "sess_s1t2u3", customerId: "CUST007", customerName: "Rajesh Gupta", cif: "30015446291", device: "Windows 11 / Firefox", browser: "Firefox", ip: "203.122.xx.xx", location: "Kolkata", startTime: "2026-07-25T13:10:00", duration: 8, currentPage: "/branches", riskScore: 12, status: "active", rageClicks: 0, failedSubmissions: 0, navigationLoops: 0 },
  { id: "sess_v4w5x6", customerId: "CUST008", customerName: "Fatima Begum", cif: "30015557382", device: "Android / Samsung Browser", browser: "Samsung", ip: "43.247.xx.xx", location: "Hyderabad", startTime: "2026-07-25T11:55:00", duration: 70, currentPage: "/dashboard — Card Services", riskScore: 83, status: "active", rageClicks: 9, failedSubmissions: 5, navigationLoops: 4 },
  { id: "sess_y7z8a1", customerId: "CUST009", customerName: "Deepak Joshi", cif: "30015668473", device: "Linux / Chrome", browser: "Chrome", ip: "14.139.xx.xx", location: "Jaipur", startTime: "2026-07-25T12:55:00", duration: 20, currentPage: "/dashboard — My Accounts", riskScore: 18, status: "active", rageClicks: 0, failedSubmissions: 0, navigationLoops: 0 },
  { id: "sess_b2c3d4", customerId: "CUST010", customerName: "Anita Sharma", cif: "30015779564", device: "Windows 10 / Chrome", browser: "Chrome", ip: "223.238.xx.xx", location: "Patna", startTime: "2026-07-25T09:30:00", duration: 180, currentPage: "/dashboard — KYC Update", riskScore: 71, status: "escalated", rageClicks: 6, failedSubmissions: 3, navigationLoops: 2 },
];

// --- Mock Events for session sess_a1b2c3 (Ramesh - high risk) ---
export const mockEvents: Record<string, SessionEvent[]> = {
  "sess_a1b2c3": [
    { id: "ev1", sessionId: "sess_a1b2c3", timestamp: "2026-07-25T12:30:00", type: "page_view", page: "/", detail: "Landed on homepage", severity: "info" },
    { id: "ev2", sessionId: "sess_a1b2c3", timestamp: "2026-07-25T12:30:45", type: "click", page: "/", detail: "Clicked 'Net Banking Login'", severity: "info" },
    { id: "ev3", sessionId: "sess_a1b2c3", timestamp: "2026-07-25T12:31:10", type: "page_view", page: "/login", detail: "Login page loaded", severity: "info" },
    { id: "ev4", sessionId: "sess_a1b2c3", timestamp: "2026-07-25T12:32:30", type: "form_submit", page: "/login", detail: "Login form submitted successfully", severity: "info" },
    { id: "ev5", sessionId: "sess_a1b2c3", timestamp: "2026-07-25T12:33:00", type: "page_view", page: "/dashboard", detail: "Dashboard loaded", severity: "info" },
    { id: "ev6", sessionId: "sess_a1b2c3", timestamp: "2026-07-25T12:35:00", type: "click", page: "/dashboard", detail: "Clicked 'Fund Transfer' in menu", severity: "info" },
    { id: "ev7", sessionId: "sess_a1b2c3", timestamp: "2026-07-25T12:36:00", type: "click", page: "/dashboard", detail: "Selected beneficiary 'SUNITA SHARMA (HDFC)'", severity: "info" },
    { id: "ev8", sessionId: "sess_a1b2c3", timestamp: "2026-07-25T12:37:00", type: "click", page: "/dashboard", detail: "Selected IMPS transfer mode", severity: "info" },
    { id: "ev9", sessionId: "sess_a1b2c3", timestamp: "2026-07-25T12:38:00", type: "form_submit", page: "/dashboard", detail: "Submitted IMPS transfer ₹25,000", severity: "info" },
    { id: "ev10", sessionId: "sess_a1b2c3", timestamp: "2026-07-25T12:38:05", type: "form_error", page: "/dashboard", detail: "Error: Beneficiary name mismatch — bank records show 'SUNITA DEVI SHARMA'", severity: "critical" },
    { id: "ev11", sessionId: "sess_a1b2c3", timestamp: "2026-07-25T12:39:00", type: "rage_click", page: "/dashboard", detail: "Rage clicked 'Submit' button 4 times rapidly", severity: "critical" },
    { id: "ev12", sessionId: "sess_a1b2c3", timestamp: "2026-07-25T12:40:00", type: "navigation_loop", page: "/dashboard", detail: "Back-and-forth: Fund Transfer → Add Beneficiary → Fund Transfer (3 loops)", severity: "warning" },
    { id: "ev13", sessionId: "sess_a1b2c3", timestamp: "2026-07-25T12:42:00", type: "form_submit", page: "/dashboard", detail: "Re-submitted IMPS transfer with same details", severity: "info" },
    { id: "ev14", sessionId: "sess_a1b2c3", timestamp: "2026-07-25T12:42:05", type: "form_error", page: "/dashboard", detail: "Error: Beneficiary name mismatch (same error)", severity: "critical" },
    { id: "ev15", sessionId: "sess_a1b2c3", timestamp: "2026-07-25T12:43:00", type: "rage_click", page: "/dashboard", detail: "Rage clicked error close button 3 times", severity: "critical" },
    { id: "ev16", sessionId: "sess_a1b2c3", timestamp: "2026-07-25T12:45:00", type: "navigation_loop", page: "/dashboard", detail: "Navigated to Help → back to Fund Transfer → Help again", severity: "warning" },
    { id: "ev17", sessionId: "sess_a1b2c3", timestamp: "2026-07-25T12:48:00", type: "form_error", page: "/dashboard", detail: "3rd failed IMPS attempt — same beneficiary name error", severity: "critical" },
    { id: "ev18", sessionId: "sess_a1b2c3", timestamp: "2026-07-25T12:50:00", type: "nudge_shown", page: "/dashboard", detail: "AI Nudge: 'It looks like the beneficiary name doesn\\'t match bank records. Try using the exact name as registered with HDFC Bank.'", severity: "info" },
  ],
  "sess_g7h8i9": [
    { id: "ev20", sessionId: "sess_g7h8i9", timestamp: "2026-07-25T11:20:00", type: "page_view", page: "/", detail: "Landed on homepage", severity: "info" },
    { id: "ev21", sessionId: "sess_g7h8i9", timestamp: "2026-07-25T11:22:00", type: "page_view", page: "/login", detail: "Login page loaded", severity: "info" },
    { id: "ev22", sessionId: "sess_g7h8i9", timestamp: "2026-07-25T11:23:00", type: "form_error", page: "/login", detail: "Login failed: incorrect CAPTCHA", severity: "warning" },
    { id: "ev23", sessionId: "sess_g7h8i9", timestamp: "2026-07-25T11:24:00", type: "form_error", page: "/login", detail: "Login failed: incorrect password", severity: "warning" },
    { id: "ev24", sessionId: "sess_g7h8i9", timestamp: "2026-07-25T11:25:00", type: "rage_click", page: "/login", detail: "Rage clicked login button 6 times", severity: "critical" },
    { id: "ev25", sessionId: "sess_g7h8i9", timestamp: "2026-07-25T11:28:00", type: "form_submit", page: "/login", detail: "Login successful on 3rd attempt", severity: "info" },
    { id: "ev26", sessionId: "sess_g7h8i9", timestamp: "2026-07-25T11:30:00", type: "page_view", page: "/dashboard", detail: "Dashboard loaded", severity: "info" },
    { id: "ev27", sessionId: "sess_g7h8i9", timestamp: "2026-07-25T11:35:00", type: "click", page: "/dashboard", detail: "Clicked IMPS/NEFT in services", severity: "info" },
    { id: "ev28", sessionId: "sess_g7h8i9", timestamp: "2026-07-25T11:40:00", type: "form_error", page: "/dashboard", detail: "IMPS transfer failed: daily limit exceeded", severity: "critical" },
    { id: "ev29", sessionId: "sess_g7h8i9", timestamp: "2026-07-25T11:42:00", type: "rage_click", page: "/dashboard", detail: "Rage clicked on error dialog 6 times", severity: "critical" },
    { id: "ev30", sessionId: "sess_g7h8i9", timestamp: "2026-07-25T11:50:00", type: "navigation_loop", page: "/dashboard", detail: "Looped: Transfer → Limits → Transfer → Limits (5 times)", severity: "warning" },
  ],
};

// Default events for sessions without specific events
const defaultEvents: SessionEvent[] = [
  { id: "def1", sessionId: "", timestamp: "", type: "page_view", page: "/", detail: "Landed on homepage", severity: "info" },
  { id: "def2", sessionId: "", timestamp: "", type: "page_view", page: "/login", detail: "Login page loaded", severity: "info" },
  { id: "def3", sessionId: "", timestamp: "", type: "form_submit", page: "/login", detail: "Login successful", severity: "info" },
  { id: "def4", sessionId: "", timestamp: "", type: "page_view", page: "/dashboard", detail: "Dashboard loaded", severity: "info" },
];

export function getEventsForSession(sessionId: string): SessionEvent[] {
  return mockEvents[sessionId] || defaultEvents.map((e, i) => ({
    ...e, id: `${sessionId}_def${i}`, sessionId,
    timestamp: new Date(Date.now() - (4 - i) * 600000).toISOString(),
  }));
}

export function getRiskBreakdown(session: SessionData): RiskBreakdown {
  return {
    rageClicks: { count: session.rageClicks, weight: 0.3, score: Math.min(session.rageClicks * 8, 30) },
    failedForms: { count: session.failedSubmissions, weight: 0.25, score: Math.min(session.failedSubmissions * 7, 25) },
    navLoops: { count: session.navigationLoops, weight: 0.2, score: Math.min(session.navigationLoops * 8, 20) },
    timeOnPage: { seconds: session.duration * 60, avgSeconds: 300, weight: 0.15, score: session.duration > 30 ? 15 : Math.round(session.duration / 2) },
    backAndForth: { count: Math.floor(session.navigationLoops * 1.5), weight: 0.1, score: Math.min(session.navigationLoops * 4, 10) },
  };
}

// --- Mock Nudges ---
export const mockNudges: NudgeRecord[] = [
  { id: "nudge1", sessionId: "sess_a1b2c3", timestamp: "2026-07-25T12:50:00", type: "contextual_help", message: "It looks like the beneficiary name doesn't match bank records. Try using the exact name as registered with HDFC Bank.", trigger: "3 failed IMPS attempts + rage clicks", engaged: true, escalationPrevented: true },
  { id: "nudge2", sessionId: "sess_g7h8i9", timestamp: "2026-07-25T11:52:00", type: "contextual_help", message: "Your daily IMPS limit is ₹2,00,000. You can increase it under Settings → Transaction Limits, or use NEFT for higher amounts.", trigger: "Daily limit error + navigation loops", engaged: false, escalationPrevented: false },
  { id: "nudge3", sessionId: "sess_d4e5f6", timestamp: "2026-07-25T13:05:00", type: "tooltip", message: "To add a new beneficiary, you'll need the exact account number and IFSC code. Find IFSC codes at our Branch Locator.", trigger: "3 failed beneficiary additions", engaged: true, escalationPrevented: true },
  { id: "nudge4", sessionId: "sess_v4w5x6", timestamp: "2026-07-25T12:30:00", type: "proactive_chat", message: "Having trouble with card services? Your card 4471-XXXX-8823 expires Dec 2026 — would you like to request a replacement?", trigger: "Repeated card page visits + rage clicks", engaged: true, escalationPrevented: true },
  { id: "nudge5", sessionId: "sess_b2c3d4", timestamp: "2026-07-25T10:15:00", type: "banner", message: "KYC update requires: Aadhaar, PAN, and a recent photograph. You can also visit your nearest branch for in-person verification.", trigger: "KYC form abandoned 3 times", engaged: false, escalationPrevented: false },
];

// --- Analytics Aggregates ---
export const analyticsData = {
  totalSessionsToday: 1247,
  activeNow: 89,
  avgRiskScore: 34,
  escalationsToday: 12,
  escalationsPrevented: 31,
  nudgesTriggered: 43,
  nudgeEngagementRate: 72,
  avgResolutionTime: 4.2, // minutes
  preventionRate: 72, // percent
  topFrustrationPoints: [
    { page: "IMPS Transfer", issue: "Beneficiary name mismatch", count: 47, percentage: 34 },
    { page: "Add Beneficiary", issue: "Invalid IFSC code", count: 31, percentage: 22 },
    { page: "Login", issue: "CAPTCHA failures", count: 28, percentage: 20 },
    { page: "KYC Update", issue: "Document upload timeout", count: 18, percentage: 13 },
    { page: "Card Services", issue: "Card block/unblock confusion", count: 15, percentage: 11 },
  ],
  dailyTrend: [
    { day: "Mon", escalations: 18, prevented: 24, nudges: 42 },
    { day: "Tue", escalations: 15, prevented: 28, nudges: 43 },
    { day: "Wed", escalations: 22, prevented: 19, nudges: 41 },
    { day: "Thu", escalations: 12, prevented: 31, nudges: 43 },
    { day: "Fri", escalations: 14, prevented: 33, nudges: 47 },
    { day: "Sat", escalations: 8, prevented: 22, nudges: 30 },
    { day: "Sun", escalations: 5, prevented: 15, nudges: 20 },
  ],
};

export function getRiskLevel(score: number): "low" | "medium" | "high" | "critical" {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function getRiskColor(score: number): string {
  if (score >= 80) return "#ef4444";
  if (score >= 60) return "#f97316";
  if (score >= 40) return "#eab308";
  return "#22c55e";
}
