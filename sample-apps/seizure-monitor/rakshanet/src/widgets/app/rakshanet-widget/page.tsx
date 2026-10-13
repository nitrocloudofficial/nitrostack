'use client';

import {
  useWidgetSDK,
  useMaxHeight,
  useTheme,
} from "@nitrostack/widgets";
import { useEffect, useState } from "react";

import { Hero } from "../../components/rakshanet/Hero";
import { RiskDashboard } from "../../components/rakshanet/RiskDashboard";
import { Recommendation } from "../../components/rakshanet/Recommendation";
import { EmergencyActions } from "../../components/rakshanet/EmergencyActions";
import { SafeLocations } from "../../components/rakshanet/SafeLocations";
import { PlaceholderMap } from "../../components/rakshanet/PlaceholderMap";
import { Timeline } from "../../components/rakshanet/Timeline";
import { EmptyState } from "../../components/rakshanet/Loading";
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

function extractData(rawOutput: any): AssessThreatResponse | null {
  if (!rawOutput) return null;

  if (typeof rawOutput === 'string') {
    try {
      const parsed = JSON.parse(rawOutput);
      return extractData(parsed);
    } catch {
      return null;
    }
  }

  if (typeof rawOutput === 'object') {
    if (typeof rawOutput.risk === 'number' || 'level' in rawOutput || 'decision' in rawOutput) {
      return rawOutput as AssessThreatResponse;
    }
    if (rawOutput.structuredContent) {
      return extractData(rawOutput.structuredContent);
    }
    if (rawOutput.result) {
      return extractData(rawOutput.result);
    }
    if (rawOutput.data && rawOutput.data !== rawOutput) {
      return extractData(rawOutput.data);
    }
    const contents = rawOutput.content || rawOutput.contents;
    if (Array.isArray(contents)) {
      for (const item of contents) {
        if (!item) continue;
        if (typeof item === 'object' && item.text) {
          const parsed = extractData(item.text);
          if (parsed) return parsed;
        }
        if (typeof item === 'string') {
          const parsed = extractData(item);
          if (parsed) return parsed;
        }
      }
    }
  }
  return null;
}

export default function RakshaNetWidgetPage() {
  const theme = useTheme();
  const maxHeight = useMaxHeight();

  const { getToolOutput } = useWidgetSDK();
  const sdkOutput = getToolOutput<AssessThreatResponse>();

  const [data, setData] = useState<AssessThreatResponse | null>(() => {
    const fromSdk = extractData(sdkOutput);
    if (fromSdk) return fromSdk;
    if (typeof window !== 'undefined') {
      const win = window as any;
      return (
        extractData(win.openai?.toolOutput) ||
        extractData(win.__MCP_APP_CONTEXT__?.toolOutput)
      );
    }
    return null;
  });

  useEffect(() => {
    const parsed = extractData(sdkOutput);
    if (parsed) {
      setData(parsed);
    }
  }, [sdkOutput]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;

      const candidate =
        extractData(event.data.globals?.toolOutput) ||
        extractData(event.data.openai?.toolOutput) ||
        extractData(event.data.data?.toolOutput) ||
        extractData(event.data.data) ||
        extractData(event.data.result) ||
        extractData(event.data.toolOutput) ||
        extractData(event.data);

      if (candidate) {
        setData(candidate);
      }
    };

    const handleReady = () => {
      const win = window as any;
      const candidate =
        extractData(win.openai?.toolOutput) ||
        extractData(win.__MCP_APP_CONTEXT__?.toolOutput);
      if (candidate) {
        setData(candidate);
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('openai:ready', handleReady);
    window.addEventListener('openai:set_globals', handleReady);

    // Initial check
    handleReady();

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('openai:ready', handleReady);
      window.removeEventListener('openai:set_globals', handleReady);
    };
  }, []);

  return (
    <div
      style={{
        maxHeight: maxHeight || "800px",
        overflow: "auto",
      }}
      className="bg-[#0F172A] text-slate-100 min-h-screen"
    >
      <Hero />

      <div className="mx-auto max-w-5xl px-6 pb-24">
        {!data ? (
          <EmptyState />
        ) : (
          <div className="space-y-16">
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
              <SafeLocations locations={data.safeLocations ?? []} />
            </div>

            <div>
              <SectionHeading eyebrow="Overview" title="Live Map" />
              <PlaceholderMap
                latitude={data.safeLocations?.[0]?.latitude ?? 11.0168}
                longitude={data.safeLocations?.[0]?.longitude ?? 76.9558}
                locations={data.safeLocations ?? []}
              />
            </div>

            <div>
              <SectionHeading eyebrow="Pipeline" title="Response Timeline" />
              <div className="rounded-2xl border border-slate-800 bg-[#1E293B]/60 p-6 backdrop-blur">
                <Timeline data={data} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
