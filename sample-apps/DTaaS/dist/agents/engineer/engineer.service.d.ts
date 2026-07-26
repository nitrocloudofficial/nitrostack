import { TwinSpecification } from "../planner/planner.schema";
import { TwinGraph } from "../twin-graph";
export declare class EngineerService {
    private readonly tb;
    private readonly dashboard;
    private readonly ruleChain;
    build(spec: TwinSpecification): Promise<TwinGraph>;
    private validateSpecification;
    private createDevices;
    private createRuleChains;
    private createDashboards;
    private createUsers;
    private createAlarms;
    private generateEdges;
}
//# sourceMappingURL=engineer.service.d.ts.map