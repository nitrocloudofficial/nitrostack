import test from "node:test";
import assert from "node:assert";
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
test("runSimulation() with a rate-based model", () => {
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
    assert.strictEqual(history.length, steps + 1);
    // Verify initial state
    assert.strictEqual(history[0].t, 0);
    assert.strictEqual(history[0].x, 10);
    // Verify rate integration: x(t) = x(0) + rate * t = 10 + 2 * t
    assert.strictEqual(history[1].t, 1);
    assert.strictEqual(history[1].x, 12);
    assert.strictEqual(history[steps].t, 5);
    assert.strictEqual(history[steps].x, 20);
});
test("validateModel() throws when an expression references an undefined variable", () => {
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
    assert.throws(() => {
        validateModel(invalidModel);
    }, /Undefined variable or function "undefinedVar"/);
});
test("validateModel() passes with valid expressions", () => {
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
    assert.doesNotThrow(() => {
        validateModel(validModel);
    });
});
test("run_simulation tool blocks run if requiresExpertReview is true and status is draft", async () => {
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
    assert.strictEqual(result.success, false);
    assert.match(result.message || "", /requires expert review before running/);
});
//# sourceMappingURL=simulation.test.js.map