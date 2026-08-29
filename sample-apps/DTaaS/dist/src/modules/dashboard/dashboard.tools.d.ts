import { ExecutionContext } from "@nitrostack/core";
export declare class DashboardTools {
    createDashboard(input: {
        title: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: string;
        dashboardId: any;
        dashboard: any;
    } | {
        success: boolean;
        message: any;
        dashboardId?: undefined;
        dashboard?: undefined;
    }>;
    listDashboards(input: {
        pageSize?: number;
        page?: number;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        dashboards: any;
        message?: undefined;
    } | {
        success: boolean;
        message: any;
        dashboards?: undefined;
    }>;
    addWidgetToDashboard(input: {
        dashboard?: string;
        deviceId: string;
        widgetTitle?: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: string;
        dashboardId: any;
        widgetId: string;
        widgetKind: "timeseries_chart" | "value_card" | "gauge" | "alarm_table";
        telemetryKeys: string[];
    } | {
        success: boolean;
        message: any;
        dashboardId?: undefined;
        widgetId?: undefined;
        widgetKind?: undefined;
        telemetryKeys?: undefined;
    }>;
    getDashboard(input: {
        dashboard?: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        title: any;
        widgets: {
            widgetId: string;
            title: any;
            type: any;
            sizeX: any;
            sizeY: any;
            row: any;
            col: any;
        }[];
        entityAliases: any;
        message?: undefined;
    } | {
        success: boolean;
        message: any;
        title?: undefined;
        widgets?: undefined;
        entityAliases?: undefined;
    }>;
    deleteWidgetFromDashboard(input: {
        dashboard?: string;
        widget: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: any;
    }>;
    updateWidgetLayout(input: {
        dashboard?: string;
        widget: string;
        sizeX?: number;
        sizeY?: number;
        row?: number;
        col?: number;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: any;
    }>;
    deleteDashboard(input: {
        dashboard?: string;
    }, ctx: ExecutionContext): Promise<{
        success: boolean;
        message: any;
    }>;
}
//# sourceMappingURL=dashboard.tools.d.ts.map