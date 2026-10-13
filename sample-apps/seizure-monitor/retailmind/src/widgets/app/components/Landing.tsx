"use client";

import Header from "./Header";
import BusinessForm, { type BusinessFormData } from "./BusinessForm";

interface LandingProps {
  onAnalyze: (data: BusinessFormData) => void;
}

export default function Landing({ onAnalyze }: LandingProps) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 via-white to-white">
      <div className="mx-auto max-w-6xl px-6">
        <Header />

        <section className="grid items-center gap-12 py-12 md:grid-cols-2 md:py-20">
          {/* Left Section */}
          <div>
            <p className="mb-3 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-green-700">
              Retail Location Intelligence
            </p>

            <h2 className="text-4xl font-bold leading-tight text-gray-900 md:text-5xl">
              Find the right place for your next business.
            </h2>

            <p className="mt-6 max-w-xl text-lg text-gray-600">
              RetailMind analyzes location, competition, demographics,
              and traffic to identify promising retail opportunities.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <span className="rounded-full bg-white px-4 py-2 text-sm text-gray-700 shadow-sm ring-1 ring-gray-100">
                📍 Location Analysis
              </span>

              <span className="rounded-full bg-white px-4 py-2 text-sm text-gray-700 shadow-sm ring-1 ring-gray-100">
                🏪 Competitor Insights
              </span>

              <span className="rounded-full bg-white px-4 py-2 text-sm text-gray-700 shadow-sm ring-1 ring-gray-100">
                🚦 Traffic Intelligence
              </span>
            </div>
          </div>

          {/* Right Section */}
          <div className="rounded-2xl bg-white p-6 shadow-xl shadow-gray-200/60 ring-1 ring-gray-100 sm:p-8">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Analyze a Location
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Tell RetailMind what kind of business you&apos;re planning.
              </p>
            </div>

            <BusinessForm onAnalyze={onAnalyze} />
          </div>
        </section>
      </div>
    </main>
  );
}
