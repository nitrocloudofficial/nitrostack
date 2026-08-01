"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Landing from "./components/Landing";
import Loading from "./components/Loading";
import type { BusinessFormData } from "./components/BusinessForm";
import { requestAnalysis, storeAnalysis } from "./lib/api";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (data: BusinessFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await requestAnalysis(data);
      storeAnalysis(result);
      router.push("/analysis");
    } catch (err) {
      // Surfaced rather than replaced with placeholder results, so a backend
      // or provider failure is visible instead of looking like a real answer.
      setError(err instanceof Error ? err.message : String(err));
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      {error && (
        <div className="mx-auto max-w-2xl px-6 pt-6">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-800">Analysis failed</p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <Landing onAnalyze={handleAnalyze} />
    </>
  );
}
