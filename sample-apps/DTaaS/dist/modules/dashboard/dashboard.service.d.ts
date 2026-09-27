export declare class DashboardService {
    createDashboard(title: string): Promise<any>;
    getDashboard(dashboardIdOrName?: string): Promise<any>;
    resolveDashboardId(dashboardIdentifier?: string): Promise<string>;
    resolveWidgetId(dashboardId: string, widgetIdentifier: string): Promise<string>;
    listDashboards(pageSize?: number, page?: number): Promise<any>;
    deleteDashboard(dashboardIdOrName: string): Promise<void>;
    addSmartWidget(dashboardId: string | undefined, deviceId: string, widgetTitle?: string): Promise<{
        dashboardId: any;
        widgetId: string;
        widgetKind: "timeseries_chart" | "value_card" | "gauge" | "alarm_table";
        telemetryKeys: string[];
        title: string;
    }>;
    deleteWidget(dashboardIdOrName: string | undefined, widgetIdOrTitle: string): Promise<void>;
    updateWidgetLayout(dashboardIdOrName: string | undefined, widgetIdOrTitle: string, layout: {
        sizeX?: number;
        sizeY?: number;
        row?: number;
        col?: number;
    }): Promise<void>;
}
//# sourceMappingURL=dashboard.service.d.ts.map