var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ToolDecorator as Tool, PromptDecorator as Prompt, z } from "@nitrostack/core";
import { PlannerService } from "../../agents/planner/planner.service.js";
import { EngineerService } from "../../agents/engineer/engineer.service.js";
export class DigitalTwinTools {
    async getSmartHomePrompt(args, ctx) {
        ctx.logger.info("Executing smart_home prompt template");
        return [
            {
                role: "user",
                content: `Create a digital twin named "Smart Home".

Create the following devices:
- 2 Smart Lights
- 1 Smart Plug
- 1 CCTV Camera
- 1 Smart Meter

Create three dashboards:
- Home Overview
- Energy Monitoring
- Security Dashboard

Create one customer named "HomeOwner".

Create two users under this customer:
- homeadmin@example.com (Tenant Administrator)
- resident@example.com (Customer User)

Create a rule chain named "Home Automation".

Create two alarms:
- High Energy Usage (CRITICAL)
- Camera Offline (MAJOR)`
            }
        ];
    }
    async getSmartFactoryPrompt(args, ctx) {
        ctx.logger.info("Executing smart_factory prompt template");
        return [
            {
                role: "user",
                content: `Create a digital twin named "Smart Factory".

Create the following devices:
- 2 Temperature Sensors
- 1 Conveyor Motor
- 1 PLC Controller
- 1 Power Meter

Create three dashboards:
- Factory Overview
- Production Dashboard
- Machine Health

Create one customer named "Factory Operations".

Create two users under this customer:
- manager@factory.com (Tenant Administrator)
- operator@factory.com (Customer User)

Create a rule chain named "Factory Monitoring".

Create two alarms:
- Machine Overheating (CRITICAL)
- Power Failure (MAJOR)`
            }
        ];
    }
    async createDigitalTwin(input, ctx) {
        ctx.logger.info("Planning digital twin...");
        try {
            const planner = new PlannerService();
            const engineer = new EngineerService();
            const specification = await planner.analyze(input.prompt);
            ctx.logger.info("===== PLANNER OUTPUT =====");
            ctx.logger.info(JSON.stringify(specification, null, 2));
            ctx.logger.info("Provisioning digital twin...");
            const graph = await engineer.build(specification);
            ctx.logger.info("===== ENGINEER OUTPUT =====");
            ctx.logger.info(JSON.stringify(graph, null, 2));
            return {
                success: true,
                specification,
                graph
            };
        }
        catch (e) {
            ctx.logger.error(`create_digital_twin failed: ${e.message}`);
            return {
                success: false,
                message: e.message
            };
        }
    }
}
__decorate([
    Prompt({
        name: "smart_home",
        description: "Creates a digital twin specification for a Smart Home including lights, plugs, camera, meter, dashboards, customer, users, rule chain, and alarms."
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DigitalTwinTools.prototype, "getSmartHomePrompt", null);
__decorate([
    Prompt({
        name: "smart_factory",
        description: "Creates a digital twin specification for a Smart Factory including temperature sensors, conveyor motor, PLC controller, power meter, dashboards, customer, users, rule chain, and alarms."
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DigitalTwinTools.prototype, "getSmartFactoryPrompt", null);
__decorate([
    Tool({
        name: "create_digital_twin",
        description: "Creates a complete ThingsBoard Digital Twin from a natural language description.",
        inputSchema: z.object({
            prompt: z
                .string()
                .describe("Natural language description of the required digital twin.")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DigitalTwinTools.prototype, "createDigitalTwin", null);
//# sourceMappingURL=digital-twin.tools.js.map