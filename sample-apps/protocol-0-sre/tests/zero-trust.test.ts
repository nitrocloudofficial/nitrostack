import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ActionAgent } from "../src/modules/action.agent.js";
import { ProtocolZeroService } from "../src/modules/protocol-zero.service.js";
import { AgentState } from "../src/modules/protocol-zero.types.js";
import { createHmac } from "crypto";

describe("ActionAgent - Zero-Trust Execution Gate", () => {
  let actionAgent: ActionAgent;
  let mockService: any;
  const SECRET = process.env.ZERO_TRUST_SECRET || "dummy-key-for-testing-purposes";

  beforeEach(() => {
    mockService = {
      logAgentAction: vi.fn(),
    };
    actionAgent = new ActionAgent(
      mockService as unknown as ProtocolZeroService,
    );
    process.env.ZERO_TRUST_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.ZERO_TRUST_SECRET;
  });

  const getMockState = () => {
    return {
      incident: {
        incidentId: "INC-999",
        status: "investigating",
        title: "Test",
        category: "Test",
        severity: "medium",
        timestamp: new Date().toISOString(),
        affectedDepartments: [],
        affectedSystems: [],
        trigger: "test",
        rootCause: "test",
        confidenceScore: 100,
        businessImpact: {
          summary: "test",
          engineeringRisk: "healthy",
          launchDelay: "unlikely",
          customerImpact: "healthy",
          revenueRisk: "healthy",
          projectedHealthScore: 100,
        },
        timeline: [],
        recommendations: [
          {
            recommendationId: "REC-1",
            incidentId: "INC-999",
            priority: "high",
            title: "Scale Up",
            description: "Scale up",
            mcpServer: "kubernetes",
            status: "approved",
          },
        ],
      },
      logs: [],
    } as unknown as AgentState;
  };

  it("should execute if HMAC signature is valid", async () => {
    const state = getMockState();
    const payload = JSON.stringify(state.incident.recommendations);
    const expectedHash = createHmac("sha256", SECRET).update(payload).digest("hex");
    (state as any).zeroTrustToken = expectedHash;

    await expect(actionAgent.execute(state)).resolves.not.toThrow();

    expect(state.incident.status).toBe("resolved");
    expect(state.incident.recommendations[0].status).toBe("executed");
    expect(mockService.logAgentAction).toHaveBeenCalledWith(
      "Action Agent",
      expect.stringContaining("Zero-Trust Gate Passed"),
      expect.any(String),
    );
  });

  it("should block execution if HMAC signature is tampered", async () => {
    const state = getMockState();
    (state as any).zeroTrustToken = "invalid_hash_value";

    await expect(actionAgent.execute(state)).rejects.toThrow(/Zero-Trust Gate Check Failed/);
  });

  it("should block execution if server is missing SECRET configuration", async () => {
    delete process.env.ZERO_TRUST_SECRET;
    const state = getMockState();
    (state as any).zeroTrustToken = "any_hash";

    await expect(actionAgent.execute(state)).rejects.toThrow(/missing ZERO_TRUST_SECRET/);
  });
});
