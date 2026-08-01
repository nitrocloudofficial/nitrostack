"use client";

import AgentStatus from "./AgentStatus";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-2xl">

        {/* Heading */}
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-green-600">
            RetailMind Intelligence
          </p>

          <h2 className="text-3xl font-bold text-gray-900">
            Analyzing your retail opportunity
          </h2>

          <p className="mt-3 text-gray-500">
            Our specialized agents are evaluating the market for your business.
          </p>
        </div>

        {/* Agent Status Card */}
        <div className="rounded-2xl bg-white p-6 shadow-lg">
          <div className="space-y-3">

            <AgentStatus
              name="Location Analysis"
              description="Evaluating geographic suitability and accessibility"
              status="complete"
            />

            <AgentStatus
              name="Competitor Analysis"
              description="Finding and evaluating nearby competitors"
              status="complete"
            />

            <AgentStatus
              name="Demographic Analysis"
              description="Analyzing customer demographics and market fit"
              status="running"
            />

            <AgentStatus
              name="Traffic Analysis"
              description="Estimating traffic and potential footfall"
              status="waiting"
            />

          </div>

          {/* Bottom Loading Indicator */}
          <div className="mt-7 text-center">
            <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-green-600" />

            <p className="text-sm text-gray-500">
              Building your opportunity recommendation...
            </p>
          </div>
        </div>

      </div>
    </main>
  );
}