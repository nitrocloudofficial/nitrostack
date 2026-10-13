import {
    ToolDecorator as Tool,
    ExecutionContext,
    Injectable,
    z,
} from "@nitrostack/core";

import { InvestigationService } from "./investigation.service.js";

const EmptySchema = z.object({});

@Injectable({ deps: [InvestigationService] })
export class InvestigationTaskTools {
    constructor(
        private readonly investigationService: InvestigationService
    ) {}

    @Tool({
        name: "audit_investigations",
        description: "Audit all investigations and return overall statistics.",
        inputSchema: EmptySchema,
    })
    async auditInvestigations(
        _args: z.infer<typeof EmptySchema>,
        ctx: ExecutionContext
    ) {
        const investigations =
            this.investigationService.getAllInvestigations();

        const summary = {
            total: investigations.length,
            critical: investigations.filter(i => i.severity === "Critical").length,
            open: investigations.filter(i => i.status === "Open").length,
            inProgress: investigations.filter(i => i.status === "In Progress").length,
            resolved: investigations.filter(i => i.status === "Resolved").length,
        };

        ctx.logger.info("Investigation audit completed", summary);

        return {
            message: "Investigation audit completed successfully.",
            summary,
            investigations,
        };
    }

    @Tool({
        name: "stale_investigations",
        description: "Return investigations that are still open or in progress.",
        inputSchema: EmptySchema,
    })
    async staleInvestigations(
        _args: z.infer<typeof EmptySchema>,
        ctx: ExecutionContext
    ) {
        const investigations =
            this.investigationService
                .getAllInvestigations()
                .filter(i => i.status !== "Resolved");

        ctx.logger.info("Collected stale investigations", {
            total: investigations.length,
        });

        return {
            total: investigations.length,
            investigations,
        };
    }

    @Tool({
        name: "critical_investigations",
        description: "Return all critical investigations.",
        inputSchema: EmptySchema,
    })
    async criticalInvestigations(
        _args: z.infer<typeof EmptySchema>,
        ctx: ExecutionContext
    ) {
        const investigations =
            this.investigationService.getCriticalInvestigations();

        ctx.logger.info("Collected critical investigations", {
            total: investigations.length,
        });

        return {
            total: investigations.length,
            investigations,
        };
    }

    @Tool({
        name: "soc_dashboard",
        description: "Generate a SOC dashboard summary.",
        inputSchema: EmptySchema,
    })
    async socDashboard(
        _args: z.infer<typeof EmptySchema>,
        ctx: ExecutionContext
    ) {
        const investigations =
            this.investigationService.getAllInvestigations();

        const dashboard = {
            totalInvestigations: investigations.length,
            critical: investigations.filter(i => i.severity === "Critical").length,
            high: investigations.filter(i => i.severity === "High").length,
            active: investigations.filter(i => i.status !== "Resolved").length,
            resolved: investigations.filter(i => i.status === "Resolved").length,
        };

        ctx.logger.info("SOC dashboard generated");

        return dashboard;
    }
}
