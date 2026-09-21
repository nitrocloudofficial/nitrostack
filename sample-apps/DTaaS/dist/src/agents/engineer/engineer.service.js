import crypto from "crypto";
import { ThingsBoardService } from "../../modules/thingsboard/thingsboard.service.js";
import { DashboardService } from "../../modules/dashboard/dashboard.service.js";
import { RuleChainService } from "../../modules/rule-chain/rule-chain.service.js";
export class EngineerService {
    tb = new ThingsBoardService();
    dashboard = new DashboardService();
    ruleChain = new RuleChainService();
    async build(spec) {
        this.validateSpecification(spec);
        const graph = {
            twinName: spec.twinName,
            twinType: spec.twinType,
            nodes: [],
            edges: []
        };
        await this.createDevices(spec, graph);
        await this.createCustomers(spec, graph);
        await this.createRuleChains(spec, graph);
        await this.createDashboards(spec, graph);
        await this.createWidgets(spec, graph);
        await this.createUsers(spec, graph);
        await this.createAlarms(spec, graph);
        await this.createEmulators(spec, graph);
        this.generateEdges(graph);
        return graph;
    }
    validateSpecification(spec) {
        if (!spec.twinName?.trim())
            throw new Error("Twin name is required.");
        if (!spec.twinType?.trim())
            throw new Error("Twin type is required.");
        for (const device of spec.devices) {
            if (!device.type)
                throw new Error("Device type missing.");
            if (device.count <= 0)
                throw new Error(`Invalid count for ${device.type}`);
        }
        const dashboardNames = new Set();
        for (const dashboard of spec.dashboards) {
            if (dashboardNames.has(dashboard.name)) {
                throw new Error(`Duplicate dashboard: ${dashboard.name}`);
            }
            dashboardNames.add(dashboard.name);
        }
    }
    async createDevices(spec, graph) {
        for (const device of spec.devices) {
            const prefix = device.namePrefix ??
                device.type;
            for (let i = 1; i <= device.count; i++) {
                const name = `${prefix} ${i}`;
                const created = await this.tb.createDevice(name, device.type, device.label);
                const node = {
                    id: created.id?.id ??
                        crypto.randomUUID(),
                    name,
                    type: "device",
                    metadata: created
                };
                graph.nodes.push(node);
            }
        }
    }
    async createCustomers(spec, graph) {
        if (!spec.customers?.length)
            return;
        for (const customer of spec.customers) {
            const created = await this.tb.createCustomer(customer.title, customer.email, customer.phone, customer.address, customer.city, customer.country);
            graph.nodes.push({
                id: created.id?.id ??
                    crypto.randomUUID(),
                name: customer.title,
                type: "customer",
                metadata: created
            });
        }
    }
    async createRuleChains(spec, graph) {
        for (const chain of spec.ruleChains) {
            const created = await this.ruleChain.createRuleChain(chain.name, false, false);
            graph.nodes.push({
                id: created.id?.id ??
                    crypto.randomUUID(),
                name: chain.name,
                type: "ruleChain",
                metadata: created
            });
        }
    }
    async createDashboards(spec, graph) {
        for (const dashboard of spec.dashboards) {
            const created = await this.dashboard.createDashboard(dashboard.name);
            graph.nodes.push({
                id: created.id?.id ??
                    crypto.randomUUID(),
                name: dashboard.name,
                type: "dashboard",
                metadata: created
            });
        }
    }
    async createWidgets(spec, graph) {
        const dashboards = graph.nodes.filter(n => n.type === "dashboard");
        const devices = graph.nodes.filter(n => n.type === "device");
        if (dashboards.length === 0 ||
            devices.length === 0) {
            return;
        }
        for (const dashboard of dashboards) {
            for (const device of devices) {
                const widget = await this.dashboard.addSmartWidget(dashboard.id, device.id, `${device.name} Widget`);
                graph.nodes.push({
                    id: widget.widgetId,
                    name: `${device.name} Widget`,
                    type: "widget",
                    metadata: widget
                });
            }
        }
    }
    async createUsers(spec, graph) {
        if (!spec.users?.length)
            return;
        for (const user of spec.users) {
            const created = await this.tb.saveUser({
                authority: user.authority,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            });
            graph.nodes.push({
                id: created.id?.id ??
                    crypto.randomUUID(),
                name: user.email,
                type: "user",
                metadata: created
            });
        }
    }
    async createAlarms(spec, graph) {
        for (const alarm of spec.alarms) {
            const created = await this.tb.createStandaloneAlarmRule({
                type: alarm.type,
                severity: alarm.severity,
                condition: alarm.condition
            });
            graph.nodes.push({
                id: created.id?.id ??
                    crypto.randomUUID(),
                name: alarm.type,
                type: "alarm",
                metadata: created
            });
        }
    }
    async createEmulators(spec, graph) {
        if (!spec.emulators?.length)
            return;
        for (const emulator of spec.emulators) {
            const created = await this.tb.createEmulatorDevice(emulator.deviceName, emulator.emulatorType, emulator.scenario, emulator.telemetryRateSeconds);
            graph.nodes.push({
                id: crypto.randomUUID(),
                name: emulator.deviceName,
                type: "emulator",
                metadata: created
            });
        }
    }
    generateEdges(graph) {
        const devices = graph.nodes.filter(n => n.type === "device");
        const dashboards = graph.nodes.filter(n => n.type === "dashboard");
        const widgets = graph.nodes.filter(n => n.type === "widget");
        const ruleChains = graph.nodes.filter(n => n.type === "ruleChain");
        const alarms = graph.nodes.filter(n => n.type === "alarm");
        const users = graph.nodes.filter(n => n.type === "user");
        const customers = graph.nodes.filter(n => n.type === "customer");
        const emulators = graph.nodes.filter(n => n.type === "emulator");
        // Dashboard -> Widget
        let widgetIndex = 0;
        for (const dashboard of dashboards) {
            for (let i = 0; i < devices.length; i++) {
                if (widgetIndex >= widgets.length)
                    break;
                graph.edges.push({
                    from: dashboard.id,
                    to: widgets[widgetIndex].id,
                    relation: "contains"
                });
                widgetIndex++;
            }
        }
        // Widget -> Device
        for (let i = 0; i < Math.min(widgets.length, devices.length); i++) {
            graph.edges.push({
                from: widgets[i].id,
                to: devices[i].id,
                relation: "uses"
            });
        }
        // RuleChain -> Device
        for (const ruleChain of ruleChains) {
            for (const device of devices) {
                graph.edges.push({
                    from: ruleChain.id,
                    to: device.id,
                    relation: "monitors"
                });
            }
        }
        // Alarm -> RuleChain
        for (const alarm of alarms) {
            for (const ruleChain of ruleChains) {
                graph.edges.push({
                    from: alarm.id,
                    to: ruleChain.id,
                    relation: "connected_to"
                });
            }
        }
        // Customer -> User
        for (const customer of customers) {
            for (const user of users) {
                graph.edges.push({
                    from: customer.id,
                    to: user.id,
                    relation: "owns"
                });
            }
        }
        // Emulator -> Device
        for (let i = 0; i < Math.min(emulators.length, devices.length); i++) {
            graph.edges.push({
                from: emulators[i].id,
                to: devices[i].id,
                relation: "emulates"
            });
        }
    }
}
//# sourceMappingURL=engineer.service.js.map