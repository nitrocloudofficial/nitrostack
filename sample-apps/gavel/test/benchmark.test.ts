import { describe, it, expect } from "vitest";
import { LighthouseRunnerService } from "../src/services/lighthouse-runner.service.js";
import { RunLighthouseTool } from "../src/tools/benchmark/run-lighthouse.tool.js";
import { CompareMetricsTool } from "../src/tools/benchmark/compare-metrics.tool.js";
import { BenchmarkResultSchema, MetricPointSchema } from "../src/schemas/benchmark.schemas.js";

describe("LighthouseRunnerService", () => {
  const runner = new LighthouseRunnerService();

  // ── Input validation ──────────────────────────────────────────────

  it("throws on empty string URL", async () => {
    await expect(runner.runAudit("")).rejects.toThrow("Invalid targetUrl");
  });

  it("throws on whitespace-only URL", async () => {
    await expect(runner.runAudit("   ")).rejects.toThrow("Target URL cannot be empty");
  });

  // ── Simulation mode: determinism ──────────────────────────────────

  it("simulation produces identical results for the same URL across calls", async () => {
    const a = await runner.runAudit("https://example.com", { forceSimulation: true });
    const b = await runner.runAudit("https://example.com", { forceSimulation: true });
    expect(a).toEqual(b);
  });

  it("simulation produces different results for different URLs", async () => {
    const a = await runner.runAudit("https://example.com", { forceSimulation: true });
    const b = await runner.runAudit("https://my-portfolio.dev", { forceSimulation: true });
    // At least one metric should differ
    const differs =
      a.lighthouseScore !== b.lighthouseScore ||
      a.bundleSizeKb !== b.bundleSizeKb ||
      a.firstContentfulPaintMs !== b.firstContentfulPaintMs ||
      a.largestContentfulPaintMs !== b.largestContentfulPaintMs;
    expect(differs).toBe(true);
  });

  // ── Simulation mode: before/after relationship ────────────────────

  it("after-optimization metrics are always better than before", async () => {
    const urls = [
      "https://example.com",
      "https://my-portfolio.dev",
      "https://shop.example.org",
      "http://localhost:3000",
    ];

    for (const url of urls) {
      const before = await runner.runAudit(url, { isPostOptimization: false, forceSimulation: true });
      const after = await runner.runAudit(url, { isPostOptimization: true, forceSimulation: true });

      expect(after.lighthouseScore).toBeGreaterThan(before.lighthouseScore);
      expect(after.bundleSizeKb).toBeLessThan(before.bundleSizeKb);
      expect(after.firstContentfulPaintMs!).toBeLessThan(before.firstContentfulPaintMs!);
      expect(after.largestContentfulPaintMs!).toBeLessThan(before.largestContentfulPaintMs!);
    }
  });

  // ── Simulation mode: value ranges ─────────────────────────────────

  it("before metrics fall within realistic ranges", async () => {
    const urls = ["https://a.com", "https://b.com", "https://c.com", "https://d.com", "https://e.com"];

    for (const url of urls) {
      const m = await runner.runAudit(url, { isPostOptimization: false, forceSimulation: true });

      expect(m.lighthouseScore).toBeGreaterThanOrEqual(55);
      expect(m.lighthouseScore).toBeLessThanOrEqual(80);
      expect(m.bundleSizeKb).toBeGreaterThanOrEqual(150);
      expect(m.bundleSizeKb).toBeLessThanOrEqual(350);
      expect(m.firstContentfulPaintMs).toBeGreaterThanOrEqual(900);
      expect(m.firstContentfulPaintMs).toBeLessThanOrEqual(2000);
      expect(m.largestContentfulPaintMs).toBeGreaterThanOrEqual(1500);
      expect(m.largestContentfulPaintMs).toBeLessThanOrEqual(3500);
    }
  });

  it("after metrics: score never exceeds 100", async () => {
    // Use many URLs to exercise different seeds
    const urls = Array.from({ length: 20 }, (_, i) => `https://test-${i}.example.com`);
    for (const url of urls) {
      const m = await runner.runAudit(url, { isPostOptimization: true, forceSimulation: true });
      expect(m.lighthouseScore).toBeLessThanOrEqual(100);
      expect(m.lighthouseScore).toBeGreaterThan(0);
    }
  });

  // ── Schema compliance ─────────────────────────────────────────────

  it("simulation output passes MetricPointSchema validation", async () => {
    const before = await runner.runAudit("https://example.com", { forceSimulation: true });
    const after = await runner.runAudit("https://example.com", { isPostOptimization: true, forceSimulation: true });

    expect(() => MetricPointSchema.parse(before)).not.toThrow();
    expect(() => MetricPointSchema.parse(after)).not.toThrow();
  });

  // ── calculateDelta ────────────────────────────────────────────────

  it("calculateDelta computes exact arithmetic difference", () => {
    const before = { lighthouseScore: 60, bundleSizeKb: 200, firstContentfulPaintMs: 1500, largestContentfulPaintMs: 2500 };
    const after = { lighthouseScore: 90, bundleSizeKb: 120, firstContentfulPaintMs: 800, largestContentfulPaintMs: 1400 };
    const delta = runner.calculateDelta(before, after);

    expect(delta.lighthouseScore).toBe(30);
    expect(delta.bundleSizeKb).toBe(-80);
  });

  it("calculateDelta handles zero-difference case", () => {
    const same = { lighthouseScore: 75, bundleSizeKb: 200 };
    const delta = runner.calculateDelta(same, same);
    expect(delta.lighthouseScore).toBe(0);
    expect(delta.bundleSizeKb).toBe(0);
  });

  it("calculateDelta handles negative improvement (regression)", () => {
    const before = { lighthouseScore: 90, bundleSizeKb: 100 };
    const after = { lighthouseScore: 70, bundleSizeKb: 150 };
    const delta = runner.calculateDelta(before, after);
    expect(delta.lighthouseScore).toBe(-20);
    expect(delta.bundleSizeKb).toBe(50);
  });
});

describe("RunLighthouseTool", () => {
  const tool = new RunLighthouseTool();

  it("returns a schema-valid BenchmarkResult", async () => {
    const result = await tool.execute({ url: "https://example.com" });
    const parsed = BenchmarkResultSchema.parse(result);

    expect(parsed.before).toBeDefined();
    expect(parsed.after).toBeDefined();
    expect(parsed.delta).toBeDefined();
  });

  it("delta matches the arithmetic of before and after", async () => {
    const result = await tool.execute({ url: "https://example.com" });
    const parsed = BenchmarkResultSchema.parse(result);

    expect(parsed.delta.lighthouseScore).toBe(
      parsed.after.lighthouseScore - parsed.before.lighthouseScore,
    );
    expect(parsed.delta.bundleSizeKb).toBe(
      parsed.after.bundleSizeKb - parsed.before.bundleSizeKb,
    );
  });

  it("after score is higher than before score", async () => {
    const result = await tool.execute({ url: "https://my-project.dev" });
    expect(result.after.lighthouseScore).toBeGreaterThan(result.before.lighthouseScore);
  });
});

describe("CompareMetricsTool", () => {
  const tool = new CompareMetricsTool();

  it("returns a schema-valid BenchmarkResult from explicit metrics", async () => {
    const beforeMetrics = { lighthouseScore: 60, bundleSizeKb: 200, firstContentfulPaintMs: 1500, largestContentfulPaintMs: 2500 };
    const afterMetrics = { lighthouseScore: 90, bundleSizeKb: 120, firstContentfulPaintMs: 800, largestContentfulPaintMs: 1400 };

    const result = await tool.execute({ beforeMetrics, afterMetrics });
    const parsed = BenchmarkResultSchema.parse(result);

    expect(parsed.delta.lighthouseScore).toBe(30);
    expect(parsed.delta.bundleSizeKb).toBe(-80);
  });

  it("preserves the original before/after values in the output", async () => {
    const beforeMetrics = { lighthouseScore: 45, bundleSizeKb: 300 };
    const afterMetrics = { lighthouseScore: 88, bundleSizeKb: 180 };

    const result = await tool.execute({ beforeMetrics, afterMetrics });
    expect(result.before.lighthouseScore).toBe(45);
    expect(result.after.bundleSizeKb).toBe(180);
  });

  it("handles identical before/after (no change)", async () => {
    const metrics = { lighthouseScore: 75, bundleSizeKb: 200 };
    const result = await tool.execute({ beforeMetrics: metrics, afterMetrics: metrics });
    expect(result.delta.lighthouseScore).toBe(0);
    expect(result.delta.bundleSizeKb).toBe(0);
  });
});
