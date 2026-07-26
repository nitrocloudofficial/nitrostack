import { DeclarativeModel } from "./types.js";
export declare function runSimulation(model: DeclarativeModel, steps: number, dt: number, paramOverrides?: Record<string, number> | string): {
    t: number;
    [key: string]: number;
}[];
//# sourceMappingURL=engine.d.ts.map