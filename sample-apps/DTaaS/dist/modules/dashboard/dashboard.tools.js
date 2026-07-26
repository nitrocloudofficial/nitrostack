var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ToolDecorator as Tool, z } from "@nitrostack/core";
import { DashboardService } from "./dashboard.service.js";
const service = new DashboardService();
export class DashboardTools {
    // ── 1. Create dashboard ───────────────────────────────────────────────────
    async createDashboard(input, ctx) {
        ctx.logger.info(`Creating dashboard: ${input.title}`);
        try {
            const dashboard = await service.createDashboard(input.title);
            return {
                success: true,
                message: `Dashboard "${input.title}" created.`,
                dashboardId: dashboard.id?.id,
                dashboard
            };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    // ── 2. List dashboards ────────────────────────────────────────────────────
    async listDashboards(input, ctx) {
        ctx.logger.info("Listing dashboards");
        try {
            const result = await service.listDashboards(input.pageSize, input.page);
            return { success: true, dashboards: result };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    // ── 3. Add smart widget ───────────────────────────────────────────────────
    async addWidgetToDashboard(input, ctx) {
        ctx.logger.info(`Adding widget to dashboard "${input.dashboard ?? "(most recent)"}" for device ${input.deviceId}`);
        try {
            const result = await service.addSmartWidget(input.dashboard, input.deviceId, input.widgetTitle);
            return {
                success: true,
                message: `Widget "${result.title}" added successfully (type: ${result.widgetKind}) with ID: ${result.widgetId}.`,
                dashboardId: result.dashboardId,
                widgetId: result.widgetId,
                widgetKind: result.widgetKind,
                telemetryKeys: result.telemetryKeys
            };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    // ── 4. Get dashboard ──────────────────────────────────────────────────────
    async getDashboard(input, ctx) {
        ctx.logger.info(`Getting dashboard details for: "${input.dashboard ?? "(most recent)"}"`);
        try {
            const result = await service.getDashboard(input.dashboard);
            const widgets = result.configuration?.widgets ?? {};
            const layoutWidgets = result.configuration?.states?.default?.layouts?.main?.widgets ?? {};
            const formattedWidgets = Object.keys(widgets).map(id => {
                const w = widgets[id];
                const lay = layoutWidgets[id] ?? {};
                return {
                    widgetId: id,
                    title: w.config?.title ?? w.title,
                    type: w.typeAlias ?? w.type,
                    sizeX: lay.sizeX ?? w.sizeX,
                    sizeY: lay.sizeY ?? w.sizeY,
                    row: lay.row,
                    col: lay.col
                };
            });
            return {
                success: true,
                title: result.title,
                widgets: formattedWidgets,
                entityAliases: result.configuration?.entityAliases ?? {}
            };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    // ── 5. Delete widget from dashboard ───────────────────────────────────────
    async deleteWidgetFromDashboard(input, ctx) {
        ctx.logger.info(`Deleting widget "${input.widget}" from dashboard "${input.dashboard ?? "(most recent)"}"`);
        try {
            await service.deleteWidget(input.dashboard, input.widget);
            return {
                success: true,
                message: `Widget "${input.widget}" successfully deleted.`
            };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    // ── 6. Update widget layout ───────────────────────────────────────────────
    async updateWidgetLayout(input, ctx) {
        ctx.logger.info(`Updating layout for widget "${input.widget}" on dashboard "${input.dashboard ?? "(most recent)"}"`);
        try {
            await service.updateWidgetLayout(input.dashboard, input.widget, {
                sizeX: input.sizeX,
                sizeY: input.sizeY,
                row: input.row,
                col: input.col
            });
            return {
                success: true,
                message: `Widget layout updated successfully.`
            };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    // ── 7. Delete dashboard ───────────────────────────────────────────────────
    async deleteDashboard(input, ctx) {
        ctx.logger.info(`Deleting dashboard: "${input.dashboard ?? "(most recent)"}"`);
        try {
            await service.deleteDashboard(input.dashboard);
            return {
                success: true,
                message: `Dashboard "${input.dashboard ?? "(most recent)"}" deleted successfully.`
            };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
}
__decorate([
    Tool({
        name: "create_dashboard",
        description: "Create a new empty ThingsBoard dashboard with a given title.",
        inputSchema: z.object({
            title: z.string().describe("Title of the dashboard")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardTools.prototype, "createDashboard", null);
__decorate([
    Tool({
        name: "list_dashboards",
        description: "List all ThingsBoard dashboards for the current user.",
        inputSchema: z.object({
            pageSize: z.number().optional().describe("Results per page (default 10)"),
            page: z.number().optional().describe("Page index, zero-based (default 0)")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardTools.prototype, "listDashboards", null);
__decorate([
    Tool({
        name: "add_widget_to_dashboard",
        description: `Add a widget to an existing ThingsBoard dashboard for a given device.
The server automatically:
  1. Fetches the device's live telemetry keys from ThingsBoard
  2. Picks the best widget type based on the key names and count
  3. Fetches the real widget configuration from ThingsBoard's widget library
  4. Packs it cleanly on the grid to avoid overlaps and saves it.`,
        inputSchema: z.object({
            dashboard: z.string().optional().describe("UUID or name of the target dashboard. If not specified, the server auto-selects the most recently updated dashboard."),
            deviceId: z.string().describe("UUID of the device to visualise"),
            widgetTitle: z.string().optional().describe("Optional widget title (defaults to telemetry key names)")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardTools.prototype, "addWidgetToDashboard", null);
__decorate([
    Tool({
        name: "get_dashboard",
        description: "Get all configuration details, entity aliases, and widgets/layouts of a specific dashboard.",
        inputSchema: z.object({
            dashboard: z.string().optional().describe("UUID or name of the dashboard to fetch. If not specified, the server auto-selects the most recently updated dashboard.")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardTools.prototype, "getDashboard", null);
__decorate([
    Tool({
        name: "delete_widget_from_dashboard",
        description: "Remove a widget from a dashboard by its widget ID or widget title.",
        inputSchema: z.object({
            dashboard: z.string().optional().describe("UUID or name of the dashboard. If not specified, the server auto-selects the most recently updated dashboard."),
            widget: z.string().describe("ID or title of the widget to delete")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardTools.prototype, "deleteWidgetFromDashboard", null);
__decorate([
    Tool({
        name: "update_widget_layout",
        description: "Reposition or resize an existing widget on a dashboard's grid layout.",
        inputSchema: z.object({
            dashboard: z.string().optional().describe("UUID or name of the dashboard. If not specified, the server auto-selects the most recently updated dashboard."),
            widget: z.string().describe("ID or title of the widget to layout"),
            sizeX: z.number().optional().describe("New width of the widget in grid columns"),
            sizeY: z.number().optional().describe("New height of the widget in grid rows"),
            row: z.number().optional().describe("Grid row start index"),
            col: z.number().optional().describe("Grid column start index (0 to 23)")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardTools.prototype, "updateWidgetLayout", null);
__decorate([
    Tool({
        name: "delete_dashboard",
        description: "Delete an entire dashboard by its ID or plain text name.",
        inputSchema: z.object({
            dashboard: z.string().optional().describe("UUID or name of the dashboard to delete. If not specified, the server auto-selects the most recently updated dashboard.")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardTools.prototype, "deleteDashboard", null);
//# sourceMappingURL=dashboard.tools.js.map