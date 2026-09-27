import axios from "axios";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import crypto from "crypto";

dotenv.config();

// ─── Auth headers ────────────────────────────────────────────────────────────

const TB_URL  = process.env.TB_URL!;
const API_KEY = process.env.TB_API_KEY!;

const headers = () => ({
    "Content-Type": "application/json",
    "X-Authorization": `ApiKey ${API_KEY}`
});

// ─── Widget type map ──────────────────────────────────────────────────────────
//  Maps a friendly name to the real ThingsBoard bundleAlias + typeAlias.
//  These are the identifiers ThingsBoard uses in its Widgets Library.

const WIDGET_TYPES = {
    timeseries_chart: { bundleAlias: "charts",         typeAlias: "basic_timeseries" },
    value_card:       { bundleAlias: "cards",           typeAlias: "simple_card"      },
    gauge:            { bundleAlias: "analog_gauges",   typeAlias: "radial_gauge"     },
    alarm_table:      { bundleAlias: "alarm_widgets",   typeAlias: "alarms_table"     },
} as const;

type WidgetKind = keyof typeof WIDGET_TYPES;

// Correct grid dimensions for each widget type.
// ThingsBoard uses a 24-column grid; sizeY is in row units (~70px each).
const WIDGET_DIMENSIONS: Record<WidgetKind, { sizeX: number; sizeY: number }> = {
    timeseries_chart: { sizeX: 24, sizeY: 7  }, // full-width, tall
    value_card:       { sizeX: 8,  sizeY: 5  }, // one-third width
    gauge:            { sizeX: 8,  sizeY: 7  }, // one-third width, square-ish
    alarm_table:      { sizeX: 24, sizeY: 8  }, // full-width
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Scan row-by-row, column-by-column to find the first position where a widget
 * of width sizeX and height sizeY fits without overlapping existing widgets.
 */
function findNextFreePosition(
    widgets: Record<string, { sizeX: number; sizeY: number; row: number; col: number }>,
    sizeX: number,
    sizeY: number,
    gridCols: number = 24
): { row: number; col: number } {
    let r = 0;
    while (true) {
        for (let c = 0; c <= gridCols - sizeX; c++) {
            let overlap = false;
            for (const w of Object.values(widgets)) {
                const wLeft = w.col ?? 0;
                const wRight = wLeft + (w.sizeX ?? 1);
                const wTop = w.row ?? 0;
                const wBottom = wTop + (w.sizeY ?? 1);

                const newLeft = c;
                const newRight = c + sizeX;
                const newTop = r;
                const newBottom = r + sizeY;

                if (newLeft < wRight && newRight > wLeft && newTop < wBottom && newBottom > wTop) {
                    overlap = true;
                    break;
                }
            }
            if (!overlap) {
                return { row: r, col: c };
            }
        }
        r++;
    }
}

/**
 * Pick the best widget kind based on telemetry key names + count.
 */
function pickWidgetKind(keys: string[]): WidgetKind {
    const lower = keys.map(k => k.toLowerCase());
    if (lower.some(k => k.includes("alarm") || k.includes("alert"))) return "alarm_table";
    if (keys.length === 1 && lower.some(k =>
        k.includes("level") || k.includes("percent") || k.includes("battery") || k.includes("fill")
    )) return "gauge";
    if (keys.length === 1) return "value_card";
    return "timeseries_chart";
}

/**
 * Fetch the real widget type descriptor from ThingsBoard so the config is always valid.
 * Returns the parsed defaultConfig object + sizeX/sizeY from the descriptor.
 */
async function fetchWidgetDescriptor(kind: WidgetKind) {
    const { bundleAlias, typeAlias } = WIDGET_TYPES[kind];
    const res = await axios.get(
        `${TB_URL}/api/widgetType?bundleAlias=${bundleAlias}&alias=${typeAlias}&isSystem=true`,
        { headers: headers() }
    );
    const descriptor = res.data.descriptor;
    const defaultConfig = typeof descriptor.defaultConfig === "string"
        ? JSON.parse(descriptor.defaultConfig)
        : descriptor.defaultConfig;

    // Use our fixed dimensions — the descriptor's sizeX/sizeY are too small
    const { sizeX, sizeY } = WIDGET_DIMENSIONS[kind];

    return {
        bundleAlias,
        typeAlias,
        type: descriptor.type as string,
        sizeX,
        sizeY,
        defaultConfig
    };
}

// ─── Exported service class ───────────────────────────────────────────────────

export class DashboardService {

    // ── Dashboard CRUD ────────────────────────────────────────────────────────

    async createDashboard(title: string) {
        const response = await axios.post(
            `${TB_URL}/api/dashboard`,
            {
                title,
                configuration: {
                    widgets: {},
                    states: {
                        default: {
                            name: "Default",
                            root: true,
                            layouts: {
                                main: {
                                    widgets: {},
                                    gridSettings: {
                                        backgroundColor: "#eeeeee",
                                        columns: 24,
                                        margin: 10,
                                        backgroundSizeMode: "100%"
                                    }
                                }
                             }
                        }
                    },
                    entityAliases: {}
                }
            },
            { headers: headers() }
        );
        return response.data;
    }

    async getDashboard(dashboardIdOrName?: string) {
        const dashboardId = await this.resolveDashboardId(dashboardIdOrName);
        const response = await axios.get(
            `${TB_URL}/api/dashboard/${dashboardId}`,
            { headers: headers() }
        );
        return response.data;
    }

    async resolveDashboardId(dashboardIdentifier?: string): Promise<string> {
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (dashboardIdentifier && UUID_REGEX.test(dashboardIdentifier)) {
            return dashboardIdentifier;
        }

        const res = await this.listDashboards(100, 0);
        const list = res.data ?? [];

        if (!dashboardIdentifier) {
            if (list.length === 0) {
                throw new Error("No dashboards found. Please create one first.");
            }
            // Sort by createdTime descending to get the most recent one
            const sorted = [...list].sort((a: any, b: any) => (b.createdTime ?? 0) - (a.createdTime ?? 0));
            return sorted[0].id.id;
        }
        
        // Exact match
        const exactMatch = list.find((d: any) => d.title.toLowerCase() === dashboardIdentifier.toLowerCase());
        if (exactMatch) {
            return exactMatch.id.id;
        }

        // Fuzzy match
        const fuzzyMatch = list.find((d: any) => d.title.toLowerCase().includes(dashboardIdentifier.toLowerCase()));
        if (fuzzyMatch) {
            return fuzzyMatch.id.id;
        }

        throw new Error(`Could not find dashboard with name or ID matching "${dashboardIdentifier}".`);
    }

    async resolveWidgetId(dashboardId: string, widgetIdentifier: string): Promise<string> {
        if (widgetIdentifier.startsWith("widget-")) {
            return widgetIdentifier;
        }

        // Fetch dashboard bypassing resolution as dashboardId is already resolved
        const response = await axios.get(
            `${TB_URL}/api/dashboard/${dashboardId}`,
            { headers: headers() }
        );
        const dashboard = response.data;
        const widgets = dashboard.configuration?.widgets ?? {};

        // Exact match
        const exactMatch = Object.keys(widgets).find(id => {
            const w = widgets[id];
            const title = w.config?.title ?? w.title ?? "";
            return title.toLowerCase() === widgetIdentifier.toLowerCase();
        });
        if (exactMatch) {
            return exactMatch;
        }

        // Fuzzy match
        const fuzzyMatch = Object.keys(widgets).find(id => {
            const w = widgets[id];
            const title = w.config?.title ?? w.title ?? "";
            return title.toLowerCase().includes(widgetIdentifier.toLowerCase());
        });
        if (fuzzyMatch) {
            return fuzzyMatch;
        }

        throw new Error(`Could not find widget with title or ID matching "${widgetIdentifier}" in dashboard.`);
    }

    async listDashboards(pageSize: number = 10, page: number = 0) {
        const response = await axios.get(
            `${TB_URL}/api/user/dashboards?pageSize=${pageSize}&page=${page}`,
            { headers: headers() }
        );
        return response.data;
    }

    async deleteDashboard(dashboardIdOrName: string) {
        const dashboardId = await this.resolveDashboardId(dashboardIdOrName);
        await axios.delete(
            `${TB_URL}/api/dashboard/${dashboardId}`,
            { headers: headers() }
        );
    }

    // ── Smart widget add ──────────────────────────────────────────────────────

    async addSmartWidget(
        dashboardId: string | undefined,
        deviceId: string,
        widgetTitle?: string
    ) {

        // 1. Fetch the device's telemetry keys from ThingsBoard
        let keysRes = await axios.get(
    `${TB_URL}/api/plugins/telemetry/DEVICE/${deviceId}/keys/timeseries`,
    { headers: headers() }
);

let telemetryKeys: string[] = keysRes.data;

if (telemetryKeys.length === 0) {

    const randomTelemetry = {

        temperature:
            Math.floor(Math.random() * 15) + 20,

        humidity:
            Math.floor(Math.random() * 40) + 40,

        battery:
            Math.floor(Math.random() * 40) + 60,

        pressure:
            Math.floor(Math.random() * 30) + 980

    };

    await axios.post(

        `${TB_URL}/api/plugins/telemetry/DEVICE/${deviceId}/timeseries/ANY`,

        randomTelemetry,

        { headers: headers() }

    );

    await new Promise(resolve =>
        setTimeout(resolve, 1000)
    );

    keysRes = await axios.get(

        `${TB_URL}/api/plugins/telemetry/DEVICE/${deviceId}/keys/timeseries`,

        { headers: headers() }

    );

    telemetryKeys = keysRes.data;

}

        // 2. Pick the best widget type based on key names + count
        const kind = pickWidgetKind(telemetryKeys);
        const { bundleAlias, typeAlias, type, defaultConfig } =
            await fetchWidgetDescriptor(kind);

        // 3. Fetch the existing dashboard
        const dashboard = await this.getDashboard(dashboardId);
        const config = dashboard.configuration ?? {};

        if (!config.widgets)       config.widgets = {};
        if (!config.entityAliases) config.entityAliases = {};

        const states      = config.states ?? {};
        const defState    = states.default ?? { name: "Default", root: true, layouts: {} };
        const mainLayout  = defState.layouts?.main ?? {
            widgets: {},
            gridSettings: { backgroundColor: "#eeeeee", columns: 24, margin: 10, backgroundSizeMode: "100%" }
        };
        if (!mainLayout.widgets) mainLayout.widgets = {};

        // Read the existing grid column count so our sizeX values are correct
        const gridCols: number = mainLayout.gridSettings?.columns ?? 24;

        // Layout dimensions scaled to the actual grid column count
        const layoutDims: Record<WidgetKind, { sizeX: number; sizeY: number }> = {
            timeseries_chart: { sizeX: gridCols,      sizeY: 8 },  // full width
            alarm_table:      { sizeX: gridCols,      sizeY: 9 },  // full width
            value_card:       { sizeX: gridCols / 2,  sizeY: 5 },  // half width
            gauge:            { sizeX: gridCols / 3,  sizeY: 7 },  // one-third width
        };

        const dims = layoutDims[kind];

        // 4. Determine next grid position dynamically using grid packing
        const { row, col } = findNextFreePosition(
            mainLayout.widgets as Record<string, any>,
            dims.sizeX,
            dims.sizeY,
            gridCols
        );

        // 5. Build entity alias for the device
        const aliasId = `device-alias-${deviceId.substring(0, 8)}`;
        config.entityAliases[aliasId] = {
            id:     aliasId,
            alias:  "Device",
            filter: {
                type:         "singleEntity",
                singleEntity: { entityType: "DEVICE", id: deviceId }
            }
        };

        // 6. Build widget entry using the real ThingsBoard defaultConfig as base
        const widgetId = `widget-${Date.now()}`;
        const title    = widgetTitle ?? telemetryKeys.join(", ");

        config.widgets[widgetId] = {
            id: crypto.randomUUID(),
            isSystemType: true,
            bundleAlias,
            typeAlias,
            typeFullFqn: `system.${bundleAlias}.${typeAlias}`,
            type,
            sizeX: dims.sizeX,
            sizeY: dims.sizeY,
            row,
            col,
            config: {
                ...defaultConfig,
                title,
                showTitle: true,
                datasources: [
                    {
                        type:          "entity",
                        entityAliasId: aliasId,
                        dataKeys:      telemetryKeys.map((key, i) => ({
                            name:            key,
                            type:            type === "alarm" ? "alarm" : "timeseries",
                            label:           key,
                            color:           ["#2196f3", "#4caf50", "#ff9800", "#e91e63"][i % 4],
                            settings:        {},
                            aggregationType: "NONE"
                        }))
                    }
                ]
            }
        };

        // 7. Update layout — dynamically packed row and col, matching dimensions
        mainLayout.widgets[widgetId] = {
            sizeX: dims.sizeX,
            sizeY: dims.sizeY,
            row,
            col
        };

        // 8. Reassemble and save
        defState.layouts = { ...defState.layouts, main: mainLayout };
        config.states    = { ...states, default: defState };
        dashboard.configuration = config;

        const saveRes = await axios.post(
            `${TB_URL}/api/dashboard`,
            dashboard,
            { headers: headers() }
        );

        return {
            dashboardId: saveRes.data.id?.id ?? dashboardId,
            widgetId,
            widgetKind:  kind,
            telemetryKeys,
            title
        };
    }

    // ── Widget modification/deletion ─────────────────────────────────────────

    async deleteWidget(dashboardIdOrName: string | undefined, widgetIdOrTitle: string) {
        const dashboardId = await this.resolveDashboardId(dashboardIdOrName);
        const widgetId = await this.resolveWidgetId(dashboardId, widgetIdOrTitle);

        const dashboard = await this.getDashboard(dashboardId);
        const config = dashboard.configuration ?? {};

        if (config.widgets?.[widgetId]) {
            delete config.widgets[widgetId];
        }

        const states = config.states ?? {};
        const defState = states.default ?? {};
        if (defState.layouts?.main?.widgets?.[widgetId]) {
            delete defState.layouts.main.widgets[widgetId];
        }

        dashboard.configuration = config;

        await axios.post(
            `${TB_URL}/api/dashboard`,
            dashboard,
            { headers: headers() }
        );
    }

    async updateWidgetLayout(
        dashboardIdOrName: string | undefined,
        widgetIdOrTitle: string,
        layout: { sizeX?: number; sizeY?: number; row?: number; col?: number }
    ) {
        const dashboardId = await this.resolveDashboardId(dashboardIdOrName);
        const widgetId = await this.resolveWidgetId(dashboardId, widgetIdOrTitle);

        const dashboard = await this.getDashboard(dashboardId);
        const config = dashboard.configuration ?? {};

        const widget = config.widgets?.[widgetId];
        if (!widget) {
            throw new Error(`Widget ${widgetId} not found in dashboard.`);
        }

        const states = config.states ?? {};
        const defState = states.default ?? {};
        const mainLayout = defState.layouts?.main ?? {};
        if (!mainLayout.widgets) mainLayout.widgets = {};

        const widgetLayout = mainLayout.widgets[widgetId] ?? {};

        if (layout.sizeX !== undefined) {
            widgetLayout.sizeX = layout.sizeX;
            widget.sizeX = layout.sizeX;
        }
        if (layout.sizeY !== undefined) {
            widgetLayout.sizeY = layout.sizeY;
            widget.sizeY = layout.sizeY;
        }
        if (layout.row !== undefined) {
            widgetLayout.row = layout.row;
            widget.row = layout.row;
        }
        if (layout.col !== undefined) {
            widgetLayout.col = layout.col;
            widget.col = layout.col;
        }

        mainLayout.widgets[widgetId] = widgetLayout;
        defState.layouts = { ...defState.layouts, main: mainLayout };
        config.states = { ...states, default: defState };
        dashboard.configuration = config;

        await axios.post(
            `${TB_URL}/api/dashboard`,
            dashboard,
            { headers: headers() }
        );
    }
}