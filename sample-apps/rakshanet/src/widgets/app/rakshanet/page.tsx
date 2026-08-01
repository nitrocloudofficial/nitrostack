'use client';

import React, { useEffect, useState } from "react";
import {
  useWidgetSDK,
  useMaxHeight,
  useTheme,
} from "@nitrostack/widgets";

import { Hero } from "../../components/rakshanet/Hero";
import { RiskDashboard } from "../../components/rakshanet/RiskDashboard";
import { Recommendation } from "../../components/rakshanet/Recommendation";
import { EmergencyActions } from "../../components/rakshanet/EmergencyActions";
import { SafeLocations } from "../../components/rakshanet/SafeLocations";
import { PlaceholderMap } from "../../components/rakshanet/PlaceholderMap";
import { Timeline } from "../../components/rakshanet/Timeline";
import type { AssessThreatResponse } from "../../lib/types";

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#8B5CF6]">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
        {title}
      </h2>
    </div>
  );
}

function normalizeResponse(input: any): AssessThreatResponse {
  const risk = typeof input?.risk === 'number' ? input.risk : 75;

  let level: "Low" | "Medium" | "High" | "Critical" = "High";
  if (input?.level) {
    const rawLevel = String(input.level).trim();
    if (/low/i.test(rawLevel)) level = "Low";
    else if (/medium/i.test(rawLevel)) level = "Medium";
    else if (/critical/i.test(rawLevel)) level = "Critical";
    else level = "High";
  } else if (risk >= 80) {
    level = "Critical";
  } else if (risk >= 60) {
    level = "High";
  } else if (risk >= 30) {
    level = "Medium";
  } else {
    level = "Low";
  }

  const action =
    typeof input?.action === 'string' && input.action.trim().length > 0
      ? input.action
      : "Avoid isolated areas, notify your guardian, and proceed towards the nearest safe location immediately.";

  const decision = {
    level: input?.decision?.level ?? level,
    action: input?.decision?.action ?? "AVOID_AREA_NOTIFY_GUARDIAN",
    verifyUser: Boolean(input?.decision?.verifyUser ?? true),
    notifyGuardian: Boolean(input?.decision?.notifyGuardian ?? true),
    sendSMS: Boolean(input?.decision?.sendSMS ?? true),
    triggerFakeCall: Boolean(input?.decision?.triggerFakeCall ?? true),
  };

  const safeLocations = Array.isArray(input?.safeLocations) && input.safeLocations.length > 0
    ? input.safeLocations.map((loc: any, idx: number) => ({
        id: String(loc?.id ?? `loc-${idx}`),
        name: String(loc?.name ?? `Safe Location ${idx + 1}`),
        type: String(loc?.type ?? (idx % 2 === 0 ? "police" : "hospital")),
        distance: typeof loc?.distance === 'number' ? loc.distance : 1.5,
        estimatedTime: String(loc?.estimatedTime ?? "5 min"),
        latitude: typeof loc?.latitude === 'number' ? loc.latitude : 11.0168,
        longitude: typeof loc?.longitude === 'number' ? loc.longitude : 76.9558,
      }))
    : [
        {
          id: "police-1",
          name: "Central Police Station",
          type: "police",
          distance: 1.2,
          estimatedTime: "4 min",
          latitude: 11.0168,
          longitude: 76.9558,
        },
        {
          id: "hospital-1",
          name: "City General Hospital",
          type: "hospital",
          distance: 2.4,
          estimatedTime: "8 min",
          latitude: 11.0200,
          longitude: 76.9600,
        },
      ];

  const communication = {
    sms: input?.communication?.sms ?? {
      success: true,
      provider: "Twilio",
      recipient: "Guardian",
      timestamp: new Date().toISOString(),
      message: "Emergency alert sent to guardian.",
    },
    whatsapp: input?.communication?.whatsapp ?? null,
    fakeCall: input?.communication?.fakeCall ?? {
      success: true,
      provider: "VoiceAPI",
      recipient: "Self",
      timestamp: new Date().toISOString(),
      message: "Incoming fake call initiated.",
    },
    executed: Array.isArray(input?.communication?.executed)
      ? input.communication.executed
      : ["sms", "fakeCall"],
  };

  return {
    risk,
    level,
    action,
    decision,
    safeLocations,
    communication,
  };
}

function extractRawPayload(rawOutput: any): any {
  if (!rawOutput) return null;
  if (typeof rawOutput === 'string') {
    try {
      return extractRawPayload(JSON.parse(rawOutput));
    } catch {
      return null;
    }
  }
  if (typeof rawOutput === 'object') {
    if ('risk' in rawOutput || 'level' in rawOutput || 'decision' in rawOutput) {
      return rawOutput;
    }
    if (rawOutput.structuredContent) {
      return extractRawPayload(rawOutput.structuredContent);
    }
    if (rawOutput.result) {
      return extractRawPayload(rawOutput.result);
    }
    if (rawOutput.data && rawOutput.data !== rawOutput) {
      return extractRawPayload(rawOutput.data);
    }
    const contents = rawOutput.content || rawOutput.contents;
    if (Array.isArray(contents)) {
      for (const item of contents) {
        if (!item) continue;
        if (typeof item === 'object' && item.text) {
          const parsed = extractRawPayload(item.text);
          if (parsed) return parsed;
        }
        if (typeof item === 'string') {
          const parsed = extractRawPayload(item);
          if (parsed) return parsed;
        }
      }
    }
  }
  return null;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error?.message || 'Rendering error' };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error('RakshaNet Widget Rendering Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-slate-900 text-white rounded-2xl border border-red-500/30">
          <h2 className="text-xl font-bold text-red-400">Widget Notice</h2>
          <p className="mt-2 text-sm text-slate-400">{this.state.error}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function RakshaNetWidgetPage() {
  const theme = useTheme();
  const maxHeight = useMaxHeight();

  const { getToolOutput } = useWidgetSDK();
  const sdkOutput = getToolOutput<AssessThreatResponse>();

  const [data, setData] = useState<AssessThreatResponse>(() => {
    const fromSdk = extractRawPayload(sdkOutput);
    if (fromSdk) return normalizeResponse(fromSdk);
    if (typeof window !== 'undefined') {
      const win = window as any;
      const windowOutput =
        extractRawPayload(win.openai?.toolOutput) ||
        extractRawPayload(win.__MCP_APP_CONTEXT__?.toolOutput);
      if (windowOutput) return normalizeResponse(windowOutput);
    }
    return normalizeResponse(null);
  });

  useEffect(() => {
    const raw = extractRawPayload(sdkOutput);
    if (raw) {
      setData(normalizeResponse(raw));
    }
  }, [sdkOutput]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;

      const candidate =
        extractRawPayload(event.data.globals?.toolOutput) ||
        extractRawPayload(event.data.openai?.toolOutput) ||
        extractRawPayload(event.data.data?.toolOutput) ||
        extractRawPayload(event.data.data) ||
        extractRawPayload(event.data.result) ||
        extractRawPayload(event.data.toolOutput) ||
        extractRawPayload(event.data);

      if (candidate) {
        setData(normalizeResponse(candidate));
      }
    };

    const handleReady = () => {
      const win = window as any;
      const candidate =
        extractRawPayload(win.openai?.toolOutput) ||
        extractRawPayload(win.__MCP_APP_CONTEXT__?.toolOutput);
      if (candidate) {
        setData(normalizeResponse(candidate));
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('openai:ready', handleReady);
    window.addEventListener('openai:set_globals', handleReady);

    handleReady();

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('openai:ready', handleReady);
      window.removeEventListener('openai:set_globals', handleReady);
    };
  }, []);

  return (
    <ErrorBoundary>
      <div
        style={{
          maxHeight: maxHeight || "800px",
          overflow: "auto",
        }}
        className="bg-[#0F172A] text-slate-100 min-h-screen"
      >
        <Hero />

        <div className="mx-auto max-w-5xl px-6 pb-24 space-y-16">
          <RiskDashboard data={data} />

          <div>
            <SectionHeading eyebrow="Insight" title="AI Recommendation" />
            <Recommendation action={data.action} />
          </div>

          <div>
            <SectionHeading eyebrow="Response" title="Emergency Actions" />
            <EmergencyActions communication={data.communication} />
          </div>

          <div>
            <SectionHeading eyebrow="Nearby" title="Safe Locations" />
            <SafeLocations locations={data.safeLocations} />
          </div>

          <div>
            <SectionHeading eyebrow="Overview" title="Live Map" />
            <PlaceholderMap
              latitude={data.safeLocations[0]?.latitude ?? 11.0168}
              longitude={data.safeLocations[0]?.longitude ?? 76.9558}
              locations={data.safeLocations}
            />
          </div>

          <div>
            <SectionHeading eyebrow="Pipeline" title="Response Timeline" />
            <div className="rounded-2xl border border-slate-800 bg-[#1E293B]/60 p-6 backdrop-blur">
              <Timeline data={data} />
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
