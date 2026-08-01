// src/widgets/hooks/useThreatAssessment.ts
"use client";
import { useWidgetSDK } from "@nitrostack/widgets";
import { useCallback, useState } from "react";
import { getMockAssessment } from "../lib/mockData";
import type {
  AssessThreatInput,
  AssessThreatResponse,
  AssessmentStatus,
} from "../lib/types";

interface UseThreatAssessmentReturn {
  status: AssessmentStatus;
  data: AssessThreatResponse | null;
  error: string | null;
  runAssessment: (input: AssessThreatInput) => Promise<void>;
  reset: () => void;
}

export function useThreatAssessment(): UseThreatAssessmentReturn {
  const [status, setStatus] = useState<AssessmentStatus>("idle");
  const [data, setData] = useState<AssessThreatResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAssessment = useCallback(async (input: AssessThreatInput) => {
    setStatus("loading");
    setError(null);
    try {
      // ---- Backend integration point ----
      // Replace the line below with:
      //   const response = await assess_threat(input);
      // The response shape is identical, so no other code changes are needed.
      const response = await getMockAssessment(input);

      setData(response);
      setStatus("success");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while assessing risk. Please try again."
      );
      setStatus("error");
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setData(null);
    setError(null);
  }, []);

  return { status, data, error, runAssessment, reset };
}
