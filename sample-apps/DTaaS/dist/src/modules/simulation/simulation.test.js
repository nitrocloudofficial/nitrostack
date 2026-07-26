import { describe, it, expect } from "vitest";
import { runSimulation } from "./engine.js";
import { validateModel } from "./validate.js";
import { SimulationTools } from "./simulation.tools.js";
// Mock ExecutionContext
const mockCtx = {
    logger: {
        info: () => { },
        error: () => { },
        warn: () => { },
        debug: () => { }
    }
};
describe("Simulation Engine & Tools Tests", () => {
    it("should runSimulation() with a rate-based model", () => {
        // A simple model: dx/dt = rate, rate = 2.
        // Starting state: x = 10.
        const mockModel = {
            id: "test-model-id",
            domain: "physics",
            mode: "rates",
            stateVars: ["x"],
            params: {
                x: 10,
                rate: 2
            },
            rates: {
                x: "rate"
            },
            knownFormulaReference: null,
            assumptions: [],
            confidence: "high",
            requiresExpertReview: false,
            status: "trusted"
        };
        const steps = 5;
        const dt = 1;
        const history = runSimulation(mockModel, steps, dt);
        // Verify history array length is steps + 1
        expect(history.length).toBe(steps + 1);
        // Verify initial state
        expect(history[0].t).toBe(0);
        expect(history[0].x).toBe(10);
        // Verify rate integration: x(t) = x(0) + rate * t = 10 + 2 * t
        expect(history[1].t).toBe(1);
        expect(history[1].x).toBe(12);
        expect(history[steps].t).toBe(5);
        expect(history[steps].x).toBe(20);
    });
    it("should validateModel() throws when an expression references an undefined variable", () => {
        const invalidModel = {
            id: "invalid-model-id",
            domain: "test",
            mode: "equations",
            stateVars: ["a"],
            params: {
                a: 5
            },
            equations: {
                a: "a + undefinedVar"
            },
            knownFormulaReference: null,
            assumptions: [],
            confidence: "medium",
            requiresExpertReview: false,
            status: "draft"
        };
        expect(() => {
            validateModel(invalidModel);
        }).toThrow(/Undefined variable or function "undefinedVar"/);
    });
    it("should validateModel() passes with valid expressions", () => {
        const validModel = {
            id: "valid-model-id",
            domain: "test",
            mode: "equations",
            stateVars: ["a"],
            params: {
                a: 5,
                multiplier: 2
            },
            equations: {
                a: "a * multiplier + sin(t)"
            },
            knownFormulaReference: null,
            assumptions: [],
            confidence: "high",
            requiresExpertReview: false,
            status: "draft"
        };
        expect(() => {
            validateModel(validModel);
        }).not.toThrow();
    });
    it("should run_simulation tool blocks run if requiresExpertReview is true and status is draft", async () => {
        const mockModel = {
            id: "draft-model-id",
            domain: "medical",
            mode: "equations",
            stateVars: ["heartRate"],
            params: {
                heartRate: 70
            },
            equations: {
                heartRate: "70"
            },
            knownFormulaReference: null,
            assumptions: ["Medical model draft"],
            confidence: "low",
            requiresExpertReview: true,
            status: "draft"
        };
        const storeMock = {
            get: (id) => {
                if (id === mockModel.id)
                    return mockModel;
                return undefined;
            },
            save: () => "draft-model-id",
            update: () => { },
            list: () => [mockModel]
        };
        const builderMock = {};
        const tools = new SimulationTools(storeMock, builderMock);
        const result = await tools.runSimulationTool({
            modelId: "draft-model-id",
            steps: 10,
            dt: 1
        }, mockCtx);
        expect(result.success).toBe(false);
        expect(result.message).toMatch(/requires expert review before running/);
    });
});
//# sourceMappingURL=simulation.test.js.map