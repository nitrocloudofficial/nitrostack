/**
 * InvoiceX-Ray — React Integration Hook
 *
 * Orchestrates the full TBML evaluation pipeline for a trade transaction.
 * Connects to the MCP server and runs the detection tools sequentially,
 * accumulating weak signals into a multi-factor risk assessment.
 *
 * Pipeline:
 *   1. Fetch transaction via resource (trade-invoice-feed://{id})
 *   2. check_price_deviation → counterfactual view + statistical analysis
 *   3. check_timeline_risk → FEMA 2026 realization exposure
 *   4. check_counterparty_pattern → multiple-invoicing / carousel detection
 *   5. verify_dgft_iec → Live exporter status check
 *   6. verify_icegate_customs → Live customs matching check
 *   7. check_sanctions → Live global PEP/sanctions screening
 *   8. If flags accumulate → draft_str → near-submittable STR
 *
 * Usage:
 *   const { evaluateTransaction, loading, results, error } = useInvoiceXRay();
 *   await evaluateTransaction("INV-2026-0042");
 */

import { useState, useCallback, useRef } from "react";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type {
  PriceDeviationResult,
  TimelineRiskResult,
  CounterpartyPatternResult,
  AccumulatedFlag,
} from "../data/domainSchemas.js";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface EvaluationResults {
  /** The invoice that was evaluated */
  invoice_id: string;

  /** Price deviation analysis with counterfactual view */
  priceDeviation: PriceDeviationResult | null;

  /** EDPMS timeline risk under FEMA 2026 */
  timelineRisk: TimelineRiskResult | null;

  /** Counterparty pattern analysis */
  counterpartyPattern: CounterpartyPatternResult | null;

  /** DGFT validation status */
  dgftStatus: any | null;

  /** ICEGATE customs matching status */
  customsStatus: any | null;

  /** Sanctions check matches */
  sanctionsStatus: any | null;

  /** Port routing validation risk */
  routingStatus: any | null;

  /** Double financing checks */
  doubleFinancingStatus: any | null;

  /** Structured STR draft (only if flags accumulated) */
  str: Record<string, unknown> | null;

  /** All accumulated red flags from all tools */
  flags: AccumulatedFlag[];

  /** Overall risk: CRITICAL / HIGH / ELEVATED / CLEAR */
  overallRisk: "CRITICAL" | "HIGH" | "ELEVATED" | "CLEAR";

  /** Total FEMA 2026 penalty exposure across all flags */
  totalPenaltyExposure: number;

  /** Counterfactual manipulation gap (from price deviation) */
  manipulationGap: {
    declared: number;
    benchmark: number;
    gap: number;
    direction: string;
  } | null;

  /** Timestamp of evaluation */
  evaluatedAt: string;
}

export interface UseInvoiceXRayReturn {
  evaluateTransaction: (invoiceId: string) => Promise<EvaluationResults>;
  loading: boolean;
  results: EvaluationResults | null;
  error: string | null;
  reset: () => void;
  generateCounterfactualReport: (invoiceId: string) => Promise<string>;
  generateRBIFormETX: (invoiceId: string) => Promise<string>;
  listAllTransactions: () => Promise<any[]>;
  listAllBenchmarks: () => Promise<any[]>;
  getCommodityBenchmark: (hsCode: string, description: string) => Promise<any>;
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

async function callTool<T>(
  client: Client,
  toolName: string,
  args: Record<string, unknown>
): Promise<T> {
  const response = await client.callTool({ name: toolName, arguments: args });
  const textContent = response.content as Array<{ type: string; text: string }>;
  const text = textContent?.[0]?.text;
  if (!text) throw new Error(`Empty response from tool: ${toolName}`);
  return JSON.parse(text) as T;
}

// ─────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────

export function useInvoiceXRay(): UseInvoiceXRayReturn {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<EvaluationResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<Client | null>(null);

  const getClient = useCallback(async (): Promise<Client> => {
    if (clientRef.current) return clientRef.current;

    const client = new Client({
      name: "invoicex-ray-dashboard",
      version: "1.0.0",
    });

    const mcpUrl =
      (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_MCP_SERVER_URL) ||
      (typeof process !== "undefined" && process.env?.MCP_SERVER_URL) ||
      "http://localhost:3000/sse";

    const transport = new SSEClientTransport(new URL(mcpUrl));

    await client.connect(transport);
    clientRef.current = client;
    return client;
  }, []);

  const evaluateTransaction = useCallback(
    async (invoiceId: string): Promise<EvaluationResults> => {
      setLoading(true);
      setError(null);

      try {
        const client = await getClient();
        const flags: AccumulatedFlag[] = [];

        // ── Step 1: Fetch transaction via resource ──
        const txnResource = await client.readResource({
          uri: `trade-invoice-feed://${invoiceId}`,
        });
        const txnText = (txnResource.contents as Array<{ text: string }>)?.[0]?.text;
        if (!txnText) throw new Error(`Transaction not found: ${invoiceId}`);
        const txn = JSON.parse(txnText);

        // ── Parallel Execution of Independent Detection Tools ──
        const [
          priceResult,
          timelineResult,
          patternResult,
          dgftResult,
          customsResult,
          sanctionsResult,
          routingResult,
          doubleFinancingResult,
        ] = await Promise.all([
          callTool<PriceDeviationResult>(client, "check_price_deviation", { invoice_id: invoiceId }),
          callTool<TimelineRiskResult>(client, "check_timeline_risk", { exporter_id: txn.exporter_id }),
          callTool<CounterpartyPatternResult>(client, "check_counterparty_pattern", { entity_id: txn.counterparty_id }),
          callTool<any>(client, "verify_dgft_iec", { iec: txn.exporter_iec, pan: "ABCDE1234F" }),
          callTool<any>(client, "verify_icegate_customs", {
            shipping_bill_no: txn.shipping_bill_no,
            port_of_loading: txn.port_of_loading,
            declared_weight: txn.quantity,
          }),
          callTool<any>(client, "check_sanctions", {
            entity_name: txn.counterparty_name,
            country_code: txn.counterparty_country,
          }),
          callTool<any>(client, "check_routing_risk", {
            port_of_loading: txn.port_of_loading,
            port_of_discharge: txn.port_of_discharge,
          }),
          callTool<any>(client, "check_double_financing", {
            shipping_bill_no: txn.shipping_bill_no,
            ad_bank_code: txn.ad_bank_code,
          }),
        ]);

        // ── Accumulate Flags ──
        if (priceResult.status === "RED_FLAG" || priceResult.status === "AMBER") {
          flags.push({
            flag_type: priceResult.counterfactual.direction === "UNDER_INVOICED"
              ? "PRICE_DEVIATION_UNDER" : "PRICE_DEVIATION_OVER",
            severity: priceResult.status === "RED_FLAG" ? "CRITICAL" : "HIGH",
            confidence: priceResult.confidence_level,
            detail: priceResult.detail,
            supporting_data: {
              z_score: priceResult.z_score,
              deviation_percent: priceResult.deviation_percent,
              counterfactual: priceResult.counterfactual,
            },
          });
        }

        if (timelineResult.status === "RED_FLAG" || timelineResult.status === "AMBER") {
          flags.push({
            flag_type: "TIMELINE_PRESSURE",
            severity: timelineResult.status === "RED_FLAG" ? "CRITICAL" : "HIGH",
            confidence: "HIGH",
            detail: timelineResult.summary,
            supporting_data: {
              penalty_exposure: timelineResult.fema_penalty_exposure_usd,
              unrealized: timelineResult.total_unrealized_usd,
              flagged_count: timelineResult.flagged_count,
            },
          });
        }

        if (patternResult.status === "RED_FLAG" || patternResult.status === "AMBER") {
          if (patternResult.patterns_detected) {
            for (const pattern of patternResult.patterns_detected) {
              flags.push({
                flag_type: pattern.pattern_type === "IDENTICAL_VALUE_REPEAT" ? "MULTIPLE_INVOICING"
                  : pattern.pattern_type === "RAPID_SUCCESSION" ? "RAPID_SUCCESSION"
                  : "VALUE_CLUSTERING",
                severity: pattern.severity,
                confidence: pattern.severity === "CRITICAL" ? "HIGH" : "MEDIUM",
                detail: pattern.detail,
                supporting_data: {
                  invoice_ids: pattern.invoice_ids,
                  total_exposure: pattern.total_exposure_usd,
                },
              });
            }
          }
        }

        if (dgftResult.status === "RED_FLAG") {
          flags.push({
            flag_type: "ROUND_TRIP_INDICATOR",
            severity: "CRITICAL",
            confidence: "HIGH",
            detail: dgftResult.risk_details || dgftResult.message,
            supporting_data: { iec: txn.exporter_iec },
          });
        }

        if (customsResult.status === "RED_FLAG") {
          flags.push({
            flag_type: "ROUND_TRIP_INDICATOR",
            severity: "CRITICAL",
            confidence: "HIGH",
            detail: customsResult.risk_details,
            supporting_data: {
              shipping_bill_no: txn.shipping_bill_no,
              variance_percentage: customsResult.variance_percentage,
            },
          });
        }

        if (sanctionsResult.status === "RED_FLAG") {
          flags.push({
            flag_type: "ROUND_TRIP_INDICATOR",
            severity: "CRITICAL",
            confidence: "HIGH",
            detail: sanctionsResult.risk_details,
            supporting_data: {
              entity_name: txn.counterparty_name,
              match_score: sanctionsResult.match_score,
            },
          });
        }

        if (routingResult.status === "RED_FLAG") {
          flags.push({
            flag_type: "ROUND_TRIP_INDICATOR",
            severity: "CRITICAL",
            confidence: "HIGH",
            detail: routingResult.detail,
            supporting_data: { risk_score: routingResult.risk_score },
          });
        }

        if (doubleFinancingResult.status === "RED_FLAG") {
          flags.push({
            flag_type: "ROUND_TRIP_INDICATOR",
            severity: "CRITICAL",
            confidence: "HIGH",
            detail: doubleFinancingResult.risk_details,
            supporting_data: {
              flagged_duplicates_count: doubleFinancingResult.flagged_duplicates_count,
              supporting_evidence: doubleFinancingResult.supporting_evidence,
            },
          });
        }

        // ── Step 8: Draft STR if flags accumulated ──
        let str: Record<string, unknown> | null = null;
        if (flags.length > 0) {
          str = await callTool<Record<string, unknown>>(
            client, "draft_str", {
              flags_list: flags,
              transaction_details: {
                invoice_id: txn.invoice_id,
                lc_number: txn.lc_number,
                exporter_id: txn.exporter_id,
                exporter_name: txn.exporter_name,
                counterparty_id: txn.counterparty_id,
                counterparty_name: txn.counterparty_name,
                counterparty_country: txn.counterparty_country,
                hs_code: txn.hs_code,
                commodity_description: txn.commodity_description,
                declared_value_usd: txn.declared_value_usd,
                quantity: txn.quantity,
                declared_unit_price_usd: txn.declared_unit_price_usd,
                unit_of_measurement: txn.unit_of_measurement,
                incoterms: txn.incoterms,
                invoice_date: txn.invoice_date,
              },
              counterfactual: priceResult.status !== "ERROR" ? {
                benchmark_total_value: priceResult.counterfactual.benchmark_total_value,
                manipulation_gap_usd: priceResult.counterfactual.manipulation_gap_usd,
                manipulation_gap_percent: priceResult.counterfactual.manipulation_gap_percent,
                direction: priceResult.counterfactual.direction,
              } : undefined,
            }
          );
        }

        // ── Compute overall risk ──
        const hasCritical = flags.some((f) => f.severity === "CRITICAL");
        const hasHigh = flags.some((f) => f.severity === "HIGH");
        const overallRisk = hasCritical ? "CRITICAL" as const
          : hasHigh ? "HIGH" as const
          : flags.length > 0 ? "ELEVATED" as const
          : "CLEAR" as const;

        // ── Compute total penalty exposure ──
        const totalPenaltyExposure = (timelineResult.fema_penalty_exposure_usd ?? 0) +
          Math.abs(priceResult.counterfactual?.manipulation_gap_usd ?? 0) * 3;

        // ── Build manipulation gap summary ──
        const manipulationGap = priceResult.counterfactual ? {
          declared: priceResult.counterfactual.declared_total_value,
          benchmark: priceResult.counterfactual.benchmark_total_value,
          gap: priceResult.counterfactual.manipulation_gap_usd,
          direction: priceResult.counterfactual.direction,
        } : null;

        const evaluation: EvaluationResults = {
          invoice_id: invoiceId,
          priceDeviation: priceResult,
          timelineRisk: timelineResult,
          counterpartyPattern: patternResult,
          dgftStatus: dgftResult,
          customsStatus: customsResult,
          sanctionsStatus: sanctionsResult,
          routingStatus: routingResult,
          doubleFinancingStatus: doubleFinancingResult,
          str,
          flags,
          overallRisk,
          totalPenaltyExposure,
          manipulationGap,
          evaluatedAt: new Date().toISOString(),
        };

        setResults(evaluation);
        return evaluation;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getClient]
  );

  const reset = useCallback(() => {
    setResults(null);
    setError(null);
    setLoading(false);
  }, []);

  const generateCounterfactualReport = useCallback(
    async (invoiceId: string): Promise<string> => {
      const client = await getClient();
      const res = await callTool<{ html: string }>(
        client, "generate_counterfactual_report", { invoice_id: invoiceId }
      );
      return res.html;
    },
    [getClient]
  );

  const generateRBIFormETX = useCallback(
    async (invoiceId: string): Promise<string> => {
      const client = await getClient();
      const res = await callTool<{ filing: string }>(
        client, "generate_rbi_filing", { invoice_id: invoiceId }
      );
      return res.filing;
    },
    [getClient]
  );

  const listAllTransactions = useCallback(async (): Promise<any[]> => {
    const client = await getClient();
    return await callTool<any[]>(client, "list_all_transactions", {});
  }, [getClient]);

  const listAllBenchmarks = useCallback(async (): Promise<any[]> => {
    const client = await getClient();
    return await callTool<any[]>(client, "list_all_benchmarks", {});
  }, [getClient]);

  const getCommodityBenchmark = useCallback(
    async (hsCode: string, description: string): Promise<any> => {
      const client = await getClient();
      return await callTool<any>(client, "get_commodity_benchmark", {
        hs_code: hsCode,
        commodity_description: description,
      });
    },
    [getClient]
  );

  return {
    evaluateTransaction,
    loading,
    results,
    error,
    reset,
    generateCounterfactualReport,
    generateRBIFormETX,
    listAllTransactions,
    listAllBenchmarks,
    getCommodityBenchmark,
  };
}

export default useInvoiceXRay;
