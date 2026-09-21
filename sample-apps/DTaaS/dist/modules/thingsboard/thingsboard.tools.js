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
import { ThingsBoardService } from "./thingsboard.service.js";
const service = new ThingsBoardService();
export class ThingsBoardTools {
    // --- Device Tool ---
    async createDevice(input, ctx) {
        ctx.logger.info(`Creating ${input.deviceType}: ${input.deviceName}`);
        try {
            const device = await service.createDevice(input.deviceName, input.deviceType, input.label);
            return { success: true, message: `${input.deviceType} created successfully.`, device };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    // --- Alarm Tools ---
    async saveAlarm(input, ctx) {
        ctx.logger.info(`Saving alarm: ${input.type} for ${input.originatorType} ${input.originatorId}`);
        try {
            const alarmData = {
                originator: { id: input.originatorId, entityType: input.originatorType },
                type: input.type,
                severity: input.severity,
                propagate: input.propagate ?? false,
                details: input.details ?? {}
            };
            const alarm = await service.saveAlarm(alarmData);
            return { success: true, message: "Alarm saved successfully", alarm };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    async deleteAlarm(input, ctx) {
        ctx.logger.info(`Deleting alarm: ${input.alarmId}`);
        try {
            const result = await service.deleteAlarm(input.alarmId);
            return { success: true, message: "Alarm deleted successfully", result };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    async ackAlarm(input, ctx) {
        ctx.logger.info(`Acknowledging alarm: ${input.alarmId}`);
        try {
            const result = await service.ackAlarm(input.alarmId);
            return { success: true, message: "Alarm acknowledged successfully", result };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    async clearAlarm(input, ctx) {
        ctx.logger.info(`Clearing alarm: ${input.alarmId}`);
        try {
            const result = await service.clearAlarm(input.alarmId);
            return { success: true, message: "Alarm cleared successfully", result };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    async getAlarmInfoById(input, ctx) {
        ctx.logger.info(`Fetching alarm info for: ${input.alarmId}`);
        try {
            const alarm = await service.getAlarmInfoById(input.alarmId);
            return { success: true, alarm };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    async getAlarms(input, ctx) {
        ctx.logger.info(`Fetching alarms for ${input.entityType} ${input.entityId}`);
        try {
            const params = { pageSize: input.pageSize, page: input.page };
            if (input.searchStatus)
                params.searchStatus = input.searchStatus;
            if (input.status)
                params.status = input.status;
            const alarms = await service.getAlarms(input.entityType, input.entityId, params);
            return { success: true, alarms };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    async getAllAlarms(input, ctx) {
        ctx.logger.info(`Fetching all alarms, page: ${input.page}`);
        try {
            const params = { pageSize: input.pageSize, page: input.page };
            if (input.searchStatus)
                params.searchStatus = input.searchStatus;
            if (input.status)
                params.status = input.status;
            const alarms = await service.getAllAlarms(params);
            return { success: true, alarms };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    async getHighestAlarmSeverity(input, ctx) {
        ctx.logger.info(`Fetching highest alarm severity for ${input.entityType} ${input.entityId}`);
        try {
            const params = {};
            if (input.searchStatus)
                params.searchStatus = input.searchStatus;
            if (input.status)
                params.status = input.status;
            const severity = await service.getHighestAlarmSeverity(input.entityType, input.entityId, params);
            return { success: true, severity };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    async getAlarmTypes(input, ctx) {
        ctx.logger.info(`Fetching alarm types`);
        try {
            const types = await service.getAlarmTypes({ pageSize: input.pageSize, page: input.page });
            return { success: true, types };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    // --- Device Profile & Alarm Rules Tools ---
    async getDeviceProfile(input, ctx) {
        ctx.logger.info(`Fetching Device Profile: ${input.profileId}`);
        try {
            const profile = await service.getDeviceProfileById(input.profileId);
            return { success: true, profile };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    async addAlarmRuleToProfile(input, ctx) {
        ctx.logger.info(`Creating standalone Alarm Rule '${input.alarmType}' for Profile: ${input.profileId}`);
        try {
            const newAlarmRule = {
                name: input.alarmType,
                alarmType: input.alarmType,
                entityId: {
                    id: input.profileId,
                    entityType: "DEVICE_PROFILE"
                },
                configuration: {
                    createRules: {
                        [input.severity]: {
                            condition: {
                                condition: [
                                    {
                                        key: { type: "TIME_SERIES", key: input.conditionKey },
                                        valueType: input.conditionValueType,
                                        value: null,
                                        predicate: {
                                            type: input.conditionValueType,
                                            operation: input.conditionOperation,
                                            value: {
                                                defaultValue: input.conditionThreshold,
                                                dynamicValue: null
                                            }
                                        }
                                    }
                                ],
                                spec: { type: "SIMPLE" }
                            },
                            schedule: null,
                            alarmDetails: null
                        }
                    },
                    clearRule: null,
                    propagate: false,
                    propagateToOwner: false,
                    propagateToTenant: false,
                    propagateRelationTypes: null
                }
            };
            const createdRule = await service.createStandaloneAlarmRule(newAlarmRule);
            return { success: true, message: "Alarm rule created successfully.", rule: createdRule };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    // --- User Management Tools ---
    async createUser(input, ctx) {
        ctx.logger.info(`Creating user: ${input.email} (${input.authority})`);
        try {
            const userData = {
                email: input.email,
                authority: input.authority,
                firstName: input.firstName,
                lastName: input.lastName,
                additionalInfo: {}
            };
            if (input.homeDashboardId) {
                userData.additionalInfo.homeDashboardId = input.homeDashboardId;
                userData.additionalInfo.homeDashboardHideToolbar = false;
            }
            if (input.authority === "CUSTOMER_USER") {
                if (!input.customerId) {
                    throw new Error("customerId is required when authority is set to CUSTOMER_USER");
                }
                userData.customerId = { id: input.customerId, entityType: "CUSTOMER" };
            }
            const user = await service.saveUser(userData, input.sendActivationMail);
            let activationLink = null;
            if (!input.sendActivationMail && user && user.id && user.id.id) {
                activationLink = await service.getActivationLink(user.id.id);
            }
            return {
                success: true,
                message: "User created successfully",
                user,
                activationLink
            };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    async getUser(input, ctx) {
        ctx.logger.info(`Fetching user: ${input.userId}`);
        try {
            const user = await service.getUserById(input.userId);
            return { success: true, user };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    async deleteUser(input, ctx) {
        ctx.logger.info(`Deleting user: ${input.userId}`);
        try {
            const result = await service.deleteUser(input.userId);
            return { success: true, message: "User deleted successfully", result };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    async getTenantUsers(input, ctx) {
        ctx.logger.info(`Fetching tenant users (page ${input.page})`);
        try {
            const users = await service.getTenantUsers({ pageSize: input.pageSize, page: input.page });
            return { success: true, users };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    async createEmulator(input, ctx) {
        ctx.logger.info(`Provisioning emulator '${input.deviceName}'`);
        try {
            const result = await service.createEmulatorDevice(input.deviceName, input.emulatorType ?? "smart-home-energy-hub", input.scenario ?? "Typical Day", input.telemetryRateSeconds ?? 5);
            return {
                success: true,
                message: `Virtual emulator '${input.deviceName}' created successfully.`,
                emulator: result
            };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    // ---------- ASSET TOOLS ----------
    async createAsset(input, ctx) {
        ctx.logger.info(`Creating asset ${input.assetType}: ${input.assetName}`);
        try {
            const asset = await service.createAsset(input.assetName, input.assetType, input.label);
            return {
                success: true,
                message: `${input.assetType} "${input.assetName}" created successfully.`,
                asset
            };
        }
        catch (e) {
            return {
                success: false,
                message: e.response?.data ?? e.message
            };
        }
    }
    async deleteAsset(input, ctx) {
        ctx.logger.info(`Deleting asset: ${input.assetName}`);
        try {
            const result = await service.deleteAsset(input.assetName);
            return {
                success: true,
                message: `Asset "${input.assetName}" deleted successfully.`,
                result
            };
        }
        catch (e) {
            return {
                success: false,
                message: e.response?.data ?? e.message
            };
        }
    }
    // --- Device Tools ---
    async deleteDevice(input, ctx) {
        ctx.logger.info(`Attempting to delete device named: ${input.deviceName}`);
        try {
            const device = await service.getDeviceByName(input.deviceName);
            if (!device || !device.id || !device.id.id) {
                return { status: "ERROR", message: `Device with name '${input.deviceName}' not found.` };
            }
            await service.deleteDevice(device.id.id);
            return { status: "OK", message: `Device '${input.deviceName}' deleted successfully.` };
        }
        catch (e) {
            return { status: "ERROR", message: e.response?.data?.message ?? e.response?.data ?? e.message };
        }
    }
    // --- Customer Tools ---
    async createCustomer(input, ctx) {
        ctx.logger.info(`Creating customer: ${input.title}`);
        try {
            const customer = await service.createCustomer(input.title, input.email, input.phone, input.address, input.city, input.country);
            return { success: true, message: `Customer '${input.title}' created successfully.`, customer };
        }
        catch (e) {
            return { success: false, message: e.response?.data?.message ?? e.response?.data ?? e.message };
        }
    }
    async deleteCustomer(input, ctx) {
        ctx.logger.info(`Attempting to delete customer: ${input.customerTitle}`);
        try {
            const customer = await service.getCustomerByTitle(input.customerTitle);
            if (!customer || !customer.id || !customer.id.id) {
                return { status: "ERROR", message: `Customer with title '${input.customerTitle}' not found.` };
            }
            await service.deleteCustomer(customer.id.id);
            return { status: "OK", message: `Customer '${input.customerTitle}' deleted successfully.` };
        }
        catch (e) {
            return { status: "ERROR", message: e.response?.data?.message ?? e.response?.data ?? e.message };
        }
    }
    // --- Entity Group Tools ---
    async createEntityGroup(input, ctx) {
        const sanitizedType = input.type.toUpperCase();
        ctx.logger.info(`Creating Entity Group: ${input.name} of type ${sanitizedType}`);
        try {
            const entityGroup = await service.createEntityGroup(input.name, sanitizedType);
            return { success: true, message: `Entity Group '${input.name}' created successfully.`, entityGroup };
        }
        catch (e) {
            return { success: false, message: e.response?.data?.message ?? e.response?.data ?? e.message };
        }
    }
    async deleteEntityGroup(input, ctx) {
        const sanitizedType = input.groupType.toUpperCase();
        ctx.logger.info(`Attempting to delete Entity Group: ${input.groupName} of type ${sanitizedType}`);
        try {
            // Fetch all groups of this type and filter by name to get the UUID
            const groups = await service.getEntityGroupsByType(sanitizedType);
            const group = groups.find((g) => g.name === input.groupName);
            if (!group || !group.id || !group.id.id) {
                return { status: "ERROR", message: `Entity Group with name '${input.groupName}' of type '${sanitizedType}' not found.` };
            }
            await service.deleteEntityGroup(group.id.id);
            return { status: "OK", message: `Entity Group '${input.groupName}' deleted successfully.` };
        }
        catch (e) {
            return { status: "ERROR", message: e.response?.data?.message ?? e.response?.data ?? e.message };
        }
    }
    async addEntitiesToGroup(input, ctx) {
        const sanitizedType = input.entityType.toUpperCase();
        ctx.logger.info(`Adding entities to group '${input.groupName}' of type ${sanitizedType}`);
        try {
            // 1. Get Group UUID by Name
            const groups = await service.getEntityGroupsByType(sanitizedType);
            const group = groups.find((g) => g.name === input.groupName);
            if (!group)
                throw new Error(`Entity Group '${input.groupName}' not found.`);
            const groupId = group.id.id;
            // 2. Map Entity Names to UUIDs
            const namesArray = input.entityNames.split(',').map(n => n.trim()).filter(n => n);
            const entityIds = [];
            for (const name of namesArray) {
                if (sanitizedType === 'DEVICE') {
                    const d = await service.getDeviceByName(name);
                    if (d && d.id?.id)
                        entityIds.push(d.id.id);
                }
                else if (sanitizedType === 'CUSTOMER') {
                    const c = await service.getCustomerByTitle(name);
                    if (c && c.id?.id)
                        entityIds.push(c.id.id);
                }
                else {
                    throw new Error(`Resolving names for entity type '${sanitizedType}' is currently not supported in this tool.`);
                }
            }
            if (entityIds.length === 0) {
                return { status: "ERROR", message: "No valid entity IDs could be resolved from the provided names." };
            }
            // 3. Execute Add Operation
            await service.addEntitiesToGroup(groupId, entityIds);
            return { status: "OK", message: `Successfully added ${entityIds.length} entities to group '${input.groupName}'.` };
        }
        catch (e) {
            return { status: "ERROR", message: e.response?.data?.message ?? e.response?.data ?? e.message };
        }
    }
    async removeEntitiesFromGroup(input, ctx) {
        const sanitizedType = input.entityType.toUpperCase();
        ctx.logger.info(`Removing entities from group '${input.groupName}'`);
        try {
            // 1. Get Group UUID by Name
            const groups = await service.getEntityGroupsByType(sanitizedType);
            const group = groups.find((g) => g.name === input.groupName);
            if (!group)
                throw new Error(`Entity Group '${input.groupName}' not found.`);
            const groupId = group.id.id;
            // 2. Map Entity Names to UUIDs
            const namesArray = input.entityNames.split(',').map(n => n.trim()).filter(n => n);
            const entityIds = [];
            for (const name of namesArray) {
                if (sanitizedType === 'DEVICE') {
                    const d = await service.getDeviceByName(name);
                    if (d && d.id?.id)
                        entityIds.push(d.id.id);
                }
                else if (sanitizedType === 'CUSTOMER') {
                    const c = await service.getCustomerByTitle(name);
                    if (c && c.id?.id)
                        entityIds.push(c.id.id);
                }
            }
            if (entityIds.length === 0) {
                return { status: "ERROR", message: "No valid entity IDs could be resolved from the provided names." };
            }
            // 3. Execute Remove Operation
            await service.removeEntitiesFromGroup(groupId, entityIds);
            return { status: "OK", message: `Successfully removed ${entityIds.length} entities from group '${input.groupName}'.` };
        }
        catch (e) {
            return { status: "ERROR", message: e.response?.data?.message ?? e.response?.data ?? e.message };
        }
    }
}
__decorate([
    Tool({
        name: "create_device",
        description: "Create any device in ThingsBoard Cloud",
        inputSchema: z.object({
            deviceName: z.string().describe("Name of the device"),
            deviceType: z.string().describe("Device type (Smart Light, Smart Plug, Smart Meter, CCTV, etc.)"),
            label: z.string().optional().describe("Optional label")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ThingsBoardTools.prototype, "createDevice", null);
__decorate([
    Tool({
        name: "save_alarm",
        description: "Create or update an alarm. Deduplicated by originator + type.",
        inputSchema: z.object({
            originatorId: z.string().describe("The UUID of the originator entity"),
            originatorType: z.enum(["DEVICE", "ASSET"]).describe("The type of the originator"),
            type: z.string().describe("Alarm type/name (e.g., 'High Temperature')"),
            severity: z.enum(["CRITICAL", "MAJOR", "MINOR", "WARNING", "INDETERMINATE"]).describe("Urgency of the alarm"),
            propagate: z.boolean().optional().describe("Whether to propagate alarm to related entities"),
            details: z.record(z.any()).optional().describe("Optional JSON context details")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ThingsBoardTools.prototype, "saveAlarm", null);
__decorate([
    Tool({
        name: "delete_alarm",
        description: "Permanently delete an alarm by its id.",
        inputSchema: z.object({
            alarmId: z.string().describe("The UUID of the alarm")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ThingsBoardTools.prototype, "deleteAlarm", null);
__decorate([
    Tool({
        name: "ack_alarm",
        description: "Acknowledge an alarm. Sets 'ack_ts' and triggers ALARM_ACK event.",
        inputSchema: z.object({
            alarmId: z.string().describe("The UUID of the alarm")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ThingsBoardTools.prototype, "ackAlarm", null);
__decorate([
    Tool({
        name: "clear_alarm",
        description: "Clear an alarm. Sets 'clear_ts' and triggers ALARM_CLEAR event.",
        inputSchema: z.object({
            alarmId: z.string().describe("The UUID of the alarm")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ThingsBoardTools.prototype, "clearAlarm", null);
__decorate([
    Tool({
        name: "get_alarm_info_by_id",
        description: "Get alarm details by id, including originator name.",
        inputSchema: z.object({
            alarmId: z.string().describe("The UUID of the alarm")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ThingsBoardTools.prototype, "getAlarmInfoById", null);
__decorate([
    Tool({
        name: "get_alarms",
        description: "Get a paginated list of alarms for a specific entity.",
        inputSchema: z.object({
            entityType: z.enum(["DEVICE", "ASSET"]).describe("Type of the entity"),
            entityId: z.string().describe("UUID of the entity"),
            pageSize: z.number().default(10).describe("Number of alarms per page"),
            page: z.number().default(0).describe("Page number"),
            searchStatus: z.enum(["ANY", "ACTIVE", "CLEARED", "ACK", "UNACK"]).optional(),
            status: z.enum(["ACTIVE_UNACK", "ACTIVE_ACK", "CLEARED_UNACK", "CLEARED_ACK"]).optional()
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ThingsBoardTools.prototype, "getAlarms", null);
__decorate([
    Tool({
        name: "get_all_alarms",
        description: "Get all alarms visible to the current user.",
        inputSchema: z.object({
            pageSize: z.number().default(10).describe("Number of alarms per page"),
            page: z.number().default(0).describe("Page number"),
            searchStatus: z.enum(["ANY", "ACTIVE", "CLEARED", "ACK", "UNACK"]).optional(),
            status: z.enum(["ACTIVE_UNACK", "ACTIVE_ACK", "CLEARED_UNACK", "CLEARED_ACK"]).optional()
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ThingsBoardTools.prototype, "getAllAlarms", null);
__decorate([
    Tool({
        name: "get_highest_alarm_severity",
        description: "Get the highest active alarm severity for an entity.",
        inputSchema: z.object({
            entityType: z.enum(["DEVICE", "ASSET"]).describe("Type of the entity"),
            entityId: z.string().describe("UUID of the entity"),
            searchStatus: z.enum(["ANY", "ACTIVE", "CLEARED", "ACK", "UNACK"]).optional(),
            status: z.enum(["ACTIVE_UNACK", "ACTIVE_ACK", "CLEARED_UNACK", "CLEARED_ACK"]).optional()
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ThingsBoardTools.prototype, "getHighestAlarmSeverity", null);
__decorate([
    Tool({
        name: "get_alarm_types",
        description: "List unique alarm type names visible to the current user.",
        inputSchema: z.object({
            pageSize: z.number().default(10).describe("Number of alarms per page"),
            page: z.number().default(0).describe("Page number")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ThingsBoardTools.prototype, "getAlarmTypes", null);
__decorate([
    Tool({
        name: "get_device_profile",
        description: "Fetch a Device Profile to view its configuration, including existing Alarm Rules.",
        inputSchema: z.object({
            profileId: z.string().describe("The UUID of the device profile")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ThingsBoardTools.prototype, "getDeviceProfile", null);
__decorate([
    Tool({
        name: "add_alarm_rule_to_profile",
        description: "Creates an active Alarm Rule entity for a Device Profile.",
        inputSchema: z.object({
            profileId: z.string().describe("The UUID of the device profile to update"),
            alarmType: z.string().describe("The name of the alarm (e.g., 'Motion Detected')"),
            severity: z.enum(["CRITICAL", "MAJOR", "MINOR", "WARNING", "INDETERMINATE"]).describe("Alarm severity"),
            conditionKey: z.string().describe("The telemetry key to monitor (e.g., 'motion')"),
            conditionValueType: z.enum(["NUMERIC", "STRING", "BOOLEAN"]).describe("Type of the telemetry value"),
            conditionOperation: z.enum(["EQUAL", "NOT_EQUAL", "GREATER", "LESS", "GREATER_OR_EQUAL", "LESS_OR_EQUAL"]),
            conditionThreshold: z.any().describe("The threshold value that triggers the alarm")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ThingsBoardTools.prototype, "addAlarmRuleToProfile", null);
__decorate([
    Tool({
        name: "create_user",
        description: "Creates a new user (Tenant Admin or Customer User) in ThingsBoard with optional custom home dashboard.",
        inputSchema: z.object({
            email: z.string().email().describe("The email address of the user"),
            authority: z.enum(["TENANT_ADMIN", "CUSTOMER_USER"]).describe("The role of the user"),
            firstName: z.string().optional().describe("User's first name"),
            lastName: z.string().optional().describe("User's last name"),
            customerId: z.string().optional().describe("Required ONLY if authority is CUSTOMER_USER"),
            homeDashboardId: z.string().optional().describe("Optional UUID of a dashboard to set as user's Home screen"),
            sendActivationMail: z.boolean().default(false).describe("Whether ThingsBoard should email the user directly")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ThingsBoardTools.prototype, "createUser", null);
__decorate([
    Tool({
        name: "get_user",
        description: "Fetches user details by their UUID.",
        inputSchema: z.object({
            userId: z.string().describe("The UUID of the user")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ThingsBoardTools.prototype, "getUser", null);
__decorate([
    Tool({
        name: "delete_user",
        description: "Deletes a user by their UUID.",
        inputSchema: z.object({
            userId: z.string().describe("The UUID of the user")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ThingsBoardTools.prototype, "deleteUser", null);
__decorate([
    Tool({
        name: "get_tenant_users",
        description: "Gets a paginated list of all users under the current tenant.",
        inputSchema: z.object({
            pageSize: z.number().default(10).describe("Number of users per page"),
            page: z.number().default(0).describe("Page number")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ThingsBoardTools.prototype, "getTenantUsers", null);
__decorate([
    Tool({
        name: "create_emulator",
        description: "Provisions and starts a virtual IoT emulator device based on the emulator catalog.",
        inputSchema: z.object({
            deviceName: z.string().describe("Custom name for the virtual emulator device (e.g., 'smart-home-energy-hub-002')"),
            emulatorType: z.string().default("smart-home-energy-hub").describe("The emulator catalog type string (e.g., 'smart-home-energy-hub')"),
            scenario: z.string().default("Typical Day").describe("Initial behavior scenario (e.g., 'Typical Day', 'Grid Blackout', 'High Peak Demand')"),
            telemetryRateSeconds: z.number().default(5).describe("Telemetry streaming interval in seconds")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ThingsBoardTools.prototype, "createEmulator", null);
__decorate([
    Tool({
        name: "create_asset",
        description: "Create any asset in ThingsBoard Cloud (Building, Floor, Zone, etc.)",
        inputSchema: z.object({
            assetName: z.string().describe("Name of the asset"),
            assetType: z.string().describe("Asset type (Building, Floor, Room, Zone, etc.)"),
            label: z.string().optional().describe("Optional label")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ThingsBoardTools.prototype, "createAsset", null);
__decorate([
    Tool({
        name: "delete_asset",
        description: "Delete an asset in ThingsBoard Cloud by name",
        inputSchema: z.object({
            assetName: z.string().describe("Name of the asset to delete")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ThingsBoardTools.prototype, "deleteAsset", null);
__decorate([
    Tool({
        name: "create_device",
        description: "Create any device in ThingsBoard Cloud",
        inputSchema: z.object({
            deviceName: z.string().describe("Name of the device"),
            deviceType: z.string().describe("Device type (Smart Light, Smart Plug, Smart Meter, CCTV, etc.)"),
            label: z.string().optional().describe("Optional label")
        })
    }),
    Tool({
        name: "delete_device",
        description: "Delete an existing device by its name from ThingsBoard Cloud",
        inputSchema: z.object({
            deviceName: z.string().describe("The name of the device to delete")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ThingsBoardTools.prototype, "deleteDevice", null);
__decorate([
    Tool({
        name: "create_customer",
        description: "Create a new customer in ThingsBoard Cloud",
        inputSchema: z.object({
            title: z.string().describe("Title or business name of the customer"),
            email: z.string().email().optional().describe("Customer email address"),
            phone: z.string().optional().describe("Customer phone number"),
            address: z.string().optional().describe("Customer street address"),
            city: z.string().optional().describe("Customer city"),
            country: z.string().optional().describe("Customer country")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ThingsBoardTools.prototype, "createCustomer", null);
__decorate([
    Tool({
        name: "delete_customer",
        description: "Delete an existing customer by its title from ThingsBoard Cloud",
        inputSchema: z.object({
            customerTitle: z.string().describe("The title of the customer to delete")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ThingsBoardTools.prototype, "deleteCustomer", null);
__decorate([
    Tool({
        name: "create_entity_group",
        description: "Create a new entity group in ThingsBoard Cloud",
        inputSchema: z.object({
            name: z.string().describe("Name of the entity group (e.g., 'Water meters')"),
            type: z.string().describe("Type of the entity group (e.g., 'DEVICE', 'ASSET', 'CUSTOMER')")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ThingsBoardTools.prototype, "createEntityGroup", null);
__decorate([
    Tool({
        name: "delete_entity_group",
        description: "Delete an existing entity group by its name from ThingsBoard Cloud",
        inputSchema: z.object({
            groupName: z.string().describe("The name of the entity group to delete"),
            groupType: z.string().describe("The type of the entity group (e.g., 'DEVICE', 'ASSET')")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ThingsBoardTools.prototype, "deleteEntityGroup", null);
__decorate([
    Tool({
        name: "add_entities_to_group",
        description: "Add one or more entities to an entity group using their names",
        inputSchema: z.object({
            groupName: z.string().describe("The name of the target entity group"),
            entityType: z.string().describe("Type of the entities and group (e.g., 'DEVICE', 'CUSTOMER')"),
            entityNames: z.string().describe("Comma-separated list of entity names to add")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ThingsBoardTools.prototype, "addEntitiesToGroup", null);
__decorate([
    Tool({
        name: "remove_entities_from_group",
        description: "Remove one or more entities from an entity group using their names",
        inputSchema: z.object({
            groupName: z.string().describe("The name of the target entity group"),
            entityType: z.string().describe("Type of the entities and group (e.g., 'DEVICE', 'CUSTOMER')"),
            entityNames: z.string().describe("Comma-separated list of entity names to remove")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ThingsBoardTools.prototype, "removeEntitiesFromGroup", null);
//# sourceMappingURL=thingsboard.tools.js.map