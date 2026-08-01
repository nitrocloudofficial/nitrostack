import { Injectable } from '@nestjs/common';

/**
 * ─────────────────────────────────────────────────────────────────────────
 * TYPES & CONTRACTS
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Emergency payload assembled by the orchestrator (RakshaNetService) and
 * passed down to CommunicationService whenever a guardian needs to be
 * notified of a potential threat.
 */
export interface EmergencyPayload {
  risk: number;
  level: string;
  latitude: number;
  longitude: number;
  mapsLink: string;
  message: string;
}

/**
 * Minimal shape of the object produced by DecisionService that
 * CommunicationService depends on. Only the flags relevant to communication
 * are declared here — if DecisionService already exports a richer
 * `DecisionResult` type, that import should replace this local declaration.
 */
export interface DecisionResult {
  notifyGuardian: boolean;
  sendSMS: boolean;
  triggerFakeCall: boolean;
  risk: number;
  level: string;
  latitude: number;
  longitude: number;
  message?: string;
}

/**
 * Generic result contract returned by every outbound-communication
 * primitive (SMS, WhatsApp, fake call). Keeping this shape provider-agnostic
 * means the mock implementations and any future real integrations
 * (Twilio, Meta WhatsApp Cloud API, etc.) can be swapped in without
 * touching any calling code.
 */
export interface CommunicationResult {
  success: boolean;
  provider: string;
  recipient: string;
  timestamp: string;
}

/**
 * Result contract for triggerFakeCall — deliberately distinct from
 * CommunicationResult since a "call" has no message payload, just a
 * start/stop lifecycle.
 */
export interface FakeCallResult {
  started: boolean;
  provider: string;
  timestamp: string;
}

/**
 * Aggregate result returned by notifyGuardian(), bundling both channels
 * used to reach the guardian.
 */
export interface GuardianNotificationResult {
  sms: CommunicationResult;
  whatsapp: CommunicationResult;
}

/**
 * Aggregate result returned by executeEmergencyActions(), reflecting
 * exactly which actions were run based on the DecisionResult flags.
 */
export interface EmergencyActionsResult {
  sms: CommunicationResult | null;
  whatsapp: CommunicationResult | null;
  fakeCall: FakeCallResult | null;
  executed: string[];
}

/**
 * ─────────────────────────────────────────────────────────────────────────
 * PROVIDER ABSTRACTION (Dependency Inversion)
 * ─────────────────────────────────────────────────────────────────────────
 *
 * These interfaces define WHAT a communication channel must do, not HOW.
 * CommunicationService depends only on these abstractions. Swapping a mock
 * provider for a real one (Twilio for SMS, Meta Cloud API for WhatsApp,
 * a telephony/IVR provider for fake calls) means writing a new class that
 * implements the relevant interface and wiring it up in the constructor —
 * no changes required anywhere else in this file or in calling code.
 */

export interface SmsProvider {
  send(phone: string, message: string): Promise<CommunicationResult>;
}

export interface WhatsAppProvider {
  send(phone: string, message: string): Promise<CommunicationResult>;
}

export interface CallProvider {
  triggerCall(phone: string): Promise<FakeCallResult>;
}

/**
 * ─────────────────────────────────────────────────────────────────────────
 * MOCK PROVIDER IMPLEMENTATIONS
 * ─────────────────────────────────────────────────────────────────────────
 *
 * These stand in for real integrations during development / hackathon
 * demos. Each one implements the corresponding provider interface above,
 * so replacing a mock with a real integration (e.g. `TwilioSmsProvider`,
 * `WhatsAppCloudApiProvider`) is a one-line change in this file's
 * constructor default — nothing else needs to be touched.
 */

class MockSmsProvider implements SmsProvider {
  async send(phone: string, _message: string): Promise<CommunicationResult> {
    // NOTE: no real network call is made here. In production this method
    // body is the ONLY place that needs to change — e.g. call the Twilio
    // Messages API and map its response onto CommunicationResult.
    return {
      success: true,
      provider: 'mock',
      recipient: phone,
      timestamp: new Date().toISOString(),
    };
  }
}

class MockWhatsAppProvider implements WhatsAppProvider {
  async send(phone: string, _message: string): Promise<CommunicationResult> {
    // NOTE: swap this body for a call to the Meta WhatsApp Cloud API
    // (or any BSP) when going to production.
    return {
      success: true,
      provider: 'mock-whatsapp',
      recipient: phone,
      timestamp: new Date().toISOString(),
    };
  }
}

class MockCallProvider implements CallProvider {
  async triggerCall(_phone: string): Promise<FakeCallResult> {
    // NOTE: swap this body for a real telephony/IVR provider call
    // (e.g. Twilio Voice, Exotel) when going to production.
    return {
      started: true,
      provider: 'mock-call',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────
 * COMMUNICATION SERVICE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Single Responsibility: this service is responsible ONLY for dispatching
 * outbound communications (SMS, WhatsApp, fake calls) and formatting
 * guardian-facing emergency messages. It does not calculate risk
 * (ThreatService), decide which actions to take (DecisionService), or
 * resolve nearby locations (LocationService) — those responsibilities stay
 * in their own services, and this one is composed by RakshaNetService.
 */
@Injectable()
export class CommunicationService {
  /**
   * Providers are injected via the constructor (Dependency Inversion +
   * easy testability). Defaults to the mock implementations so the
   * service works out of the box in development/hackathon mode; pass
   * real provider implementations in production wiring (e.g. a NestJS
   * module `useFactory`/`useClass` provider) without changing this class.
   */
  constructor(
    private readonly smsProvider: SmsProvider = new MockSmsProvider(),
    private readonly whatsAppProvider: WhatsAppProvider = new MockWhatsAppProvider(),
    private readonly callProvider: CallProvider = new MockCallProvider(),
  ) {}

  /**
   * Sends an emergency SMS to the given phone number.
   * Currently backed by a mock provider — see MockSmsProvider for the
   * single place to change when integrating a real SMS gateway.
   */
  async sendEmergencySMS(
    phone: string,
    message: string,
  ): Promise<CommunicationResult> {
    return this.smsProvider.send(phone, message);
  }

  /**
   * Sends an emergency alert over WhatsApp to the given phone number.
   * Currently backed by a mock provider — see MockWhatsAppProvider for the
   * single place to change when integrating a real WhatsApp Business API.
   */
  async sendWhatsAppAlert(
    phone: string,
    message: string,
  ): Promise<CommunicationResult> {
    return this.whatsAppProvider.send(phone, message);
  }

  /**
   * Triggers a fake incoming call to the given phone number, used as a
   * distraction/escape mechanism for the user in a threatening situation.
   * Currently backed by a mock provider — see MockCallProvider for the
   * single place to change when integrating a real telephony/IVR provider.
   */
  async triggerFakeCall(phone: string): Promise<FakeCallResult> {
    return this.callProvider.triggerCall(phone);
  }

  /**
   * Builds a Google Maps link from a latitude/longitude pair.
   * Extracted as its own method so the URL format has a single
   * source of truth.
   */
  private buildMapsLink(latitude: number, longitude: number): string {
    return `https://maps.google.com/?q=${latitude},${longitude}`;
  }

  /**
   * Formats the human-readable guardian alert message from an
   * EmergencyPayload. Kept separate from notifyGuardian() so the
   * message template can be unit-tested or restyled independently.
   */
  private buildGuardianMessage(payload: EmergencyPayload): string {
    return (
      `🚨 RakshaNet Emergency Alert\n\n` +
      `Risk Level: ${payload.level}\n\n` +
      `Location:\n${payload.mapsLink}\n\n` +
      `The user may require immediate assistance.`
    );
  }

  /**
   * Notifies a guardian of an emergency by:
   *  1. Generating a Google Maps link from the payload's coordinates
   *     (if one hasn't already been supplied).
   *  2. Composing a formatted alert message.
   *  3. Dispatching that message over both SMS and WhatsApp.
   *
   * Both channel results are returned so the caller can inspect
   * per-channel delivery success independently.
   */
  async notifyGuardian(
    phone: string,
    emergency: EmergencyPayload,
  ): Promise<GuardianNotificationResult> {
    const mapsLink =
      emergency.mapsLink ||
      this.buildMapsLink(emergency.latitude, emergency.longitude);

    const enrichedPayload: EmergencyPayload = { ...emergency, mapsLink };
    const message = this.buildGuardianMessage(enrichedPayload);

    // Both channels are dispatched concurrently since they are
    // independent operations — this keeps guardian notification latency
    // to roughly a single round trip instead of two sequential ones.
    const [sms, whatsapp] = await Promise.all([
      this.sendEmergencySMS(phone, message),
      this.sendWhatsAppAlert(phone, message),
    ]);

    return { sms, whatsapp };
  }

  /**
   * Orchestrates all communication side-effects for a given emergency
   * decision. Only executes the actions the DecisionService has flagged
   * as enabled (decision.notifyGuardian / decision.sendSMS /
   * decision.triggerFakeCall), and reports back exactly which actions
   * ran via the `executed` list.
   *
   * Guardian notification (SMS + WhatsApp) and the plain SMS action are
   * intentionally treated as distinct flags: a caller may want to alert
   * the guardian over both channels while independently deciding whether
   * a bare SMS action should also fire (e.g. to a different recipient or
   * for a different purpose). If both flags target the same phone number
   * in your flow, the SMS will simply be sent twice — once per action —
   * which mirrors DecisionService's explicit intent rather than silently
   * deduplicating it.
   */
  async executeEmergencyActions(
    decision: DecisionResult,
    guardianPhone: string,
  ): Promise<EmergencyActionsResult> {
    const executed: string[] = [];

    let sms: CommunicationResult | null = null;
    let whatsapp: CommunicationResult | null = null;
    let fakeCall: FakeCallResult | null = null;

    const payload: EmergencyPayload = {
      risk: decision.risk,
      level: decision.level,
      latitude: decision.latitude,
      longitude: decision.longitude,
      mapsLink: this.buildMapsLink(decision.latitude, decision.longitude),
      message: decision.message ?? '',
    };

    if (decision.notifyGuardian) {
      const guardianResult = await this.notifyGuardian(guardianPhone, payload);
      sms = guardianResult.sms;
      whatsapp = guardianResult.whatsapp;
      executed.push('notifyGuardian');
    }

    if (decision.sendSMS) {
      const message = this.buildGuardianMessage(payload);
      sms = await this.sendEmergencySMS(guardianPhone, message);
      executed.push('sendSMS');
    }

    if (decision.triggerFakeCall) {
      fakeCall = await this.triggerFakeCall(guardianPhone);
      executed.push('triggerFakeCall');
    }

    return { sms, whatsapp, fakeCall, executed };
  }
}