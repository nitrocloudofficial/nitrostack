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
import { RuleChainService } from "./rule-chain.service.js";
const service = new RuleChainService();
export class RuleChainTools {
    // ── 1. Create Rule Chain ──────────────────────────────────────────────────
    async createRuleChain(input, ctx) {
        ctx.logger.info(`Creating rule chain: ${input.name}`);
        try {
            const result = await service.createRuleChain(input.name, false, input.debugMode);
            return {
                success: true,
                message: `Rule chain "${input.name}" created successfully.`,
                ruleChainId: result.id?.id,
                ruleChain: result
            };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    // ── 2. Delete Rule Chain ──────────────────────────────────────────────────
    async deleteRuleChain(input, ctx) {
        ctx.logger.info(`Deleting rule chain: "${input.ruleChain ?? "(most recent)"}"`);
        try {
            const resolvedId = await service.resolveRuleChainId(input.ruleChain);
            await service.deleteRuleChain(resolvedId);
            return {
                success: true,
                message: `Rule chain "${input.ruleChain ?? "(most recent)"}" deleted successfully.`
            };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    // ── 3. Get Rule Node Catalog ──────────────────────────────────────────────
    async getRuleNodeCatalog(input, ctx) {
        ctx.logger.info(`Fetching rule node catalog. Category filter: ${input.category ?? "none"}`);
        try {
            const result = await service.getRuleNodeCatalog(input.category);
            return {
                success: true,
                ...result
            };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    // ── 4. Search Rule Node Components ────────────────────────────────────────
    async searchComponents(input, ctx) {
        ctx.logger.info(`Searching rule node components for: "${input.query}"`);
        try {
            const results = await service.searchComponents(input.query);
            return {
                success: true,
                count: results.length,
                components: results
            };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    // ── 4. Get Rule Chain Metadata ────────────────────────────────────────────
    async getRuleChainMetadata(input, ctx) {
        ctx.logger.info(`Fetching metadata for rule chain: "${input.ruleChain ?? "(most recent)"}"`);
        try {
            const metadata = await service.getRuleChainMetadata(input.ruleChain);
            const nodes = (metadata.nodes ?? []).map((n) => ({
                id: n.id?.id,
                name: n.name,
                type: n.type,
                layoutX: n.additionalInfo?.layoutX,
                layoutY: n.additionalInfo?.layoutY
            }));
            const connections = (metadata.connections ?? []).map((c) => ({
                fromNode: metadata.nodes[c.fromIndex]?.name ?? c.fromIndex,
                toNode: metadata.nodes[c.toIndex]?.name ?? c.toIndex,
                relationType: c.type
            }));
            return {
                success: true,
                ruleChainId: metadata.ruleChainId?.id,
                firstNodeIndex: metadata.firstNodeIndex,
                nodes,
                connections,
                rawMetadata: metadata
            };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    // ── 5. Add Node to Rule Chain ─────────────────────────────────────────────
    async addNodeToRuleChain(input, ctx) {
        ctx.logger.info(`Adding node "${input.nodeName}" (type: "${input.component}"${input.componentType ? `, category: "${input.componentType}"` : ""}) to rule chain "${input.ruleChain ?? "(most recent)"}"`);
        try {
            const result = await service.addNodeToRuleChain(input.ruleChain, input.nodeName, input.component, input.configuration, input.componentType);
            return {
                success: true,
                message: `Node "${result.nodeName}" added successfully.`,
                ruleChainId: result.ruleChainId,
                nodeId: result.nodeId,
                componentClass: result.componentClass
            };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    // ── 6. Connect Rule Nodes ─────────────────────────────────────────────────
    async connectRuleNodes(input, ctx) {
        ctx.logger.info(`Connecting node "${input.fromNode}" to "${input.toNode}" via relation "${input.relation ?? "Success"}"`);
        try {
            const result = await service.connectNodesInRuleChain(input.ruleChain, input.fromNode, input.toNode, input.relation);
            return {
                success: true,
                message: `Connection created between "${result.fromNode}" and "${result.toNode}".`,
                ruleChainId: result.ruleChainId,
                relationType: result.relationType
            };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    // ── 7. List Notification Targets ──────────────────────────────────────────
    async listNotificationTargets(input, ctx) {
        ctx.logger.info(`Listing notification targets: page ${input.page}, size ${input.pageSize}`);
        try {
            const result = await service.listNotificationTargets(input.pageSize, input.page);
            return {
                success: true,
                targets: (result.data ?? []).map((t) => ({
                    id: t.id?.id,
                    name: t.name,
                    type: t.configuration?.type,
                    description: t.configuration?.description
                })),
                rawResult: result
            };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
    // ── 8. List Notification Templates ────────────────────────────────────────
    async listNotificationTemplates(input, ctx) {
        ctx.logger.info(`Listing notification templates: page ${input.page}, size ${input.pageSize}`);
        try {
            const result = await service.listNotificationTemplates(input.pageSize, input.page);
            return {
                success: true,
                templates: (result.data ?? []).map((t) => ({
                    id: t.id?.id,
                    name: t.name,
                    notificationType: t.notificationType
                })),
                rawResult: result
            };
        }
        catch (e) {
            return { success: false, message: e.response?.data ?? e.message };
        }
    }
}
__decorate([
    Tool({
        name: "create_rule_chain",
        description: "Create a new ThingsBoard rule chain.",
        inputSchema: z.object({
            name: z.string().describe("Name of the rule chain"),
            debugMode: z.boolean().optional().describe("Enable debug mode logging (default: false)")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RuleChainTools.prototype, "createRuleChain", null);
__decorate([
    Tool({
        name: "delete_rule_chain",
        description: "Delete an existing ThingsBoard rule chain by its ID or plain text name.",
        inputSchema: z.object({
            ruleChain: z.string().optional().describe("UUID or name of the rule chain to delete. If omitted, targets the most recent one.")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RuleChainTools.prototype, "deleteRuleChain", null);
__decorate([
    Tool({
        name: "get_rule_node_catalog",
        description: "Get a list of all available rule node component categories or inspect the components inside a specific category (ENRICHMENT, FILTER, TRANSFORMATION, ACTION, EXTERNAL).",
        inputSchema: z.object({
            category: z.enum(["ENRICHMENT", "FILTER", "TRANSFORMATION", "ACTION", "EXTERNAL"]).optional().describe("Optional category filter")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RuleChainTools.prototype, "getRuleNodeCatalog", null);
__decorate([
    Tool({
        name: "search_rule_node_components",
        description: "Search for available rule node component classes and configurations matching a query string (e.g. 'filter', 'email').",
        inputSchema: z.object({
            query: z.string().describe("Keyword search term (e.g. 'transformation', 'enrichment')")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RuleChainTools.prototype, "searchComponents", null);
__decorate([
    Tool({
        name: "get_rule_chain_metadata",
        description: "Fetch layout, nodes, connections, and configurations of a rule chain.",
        inputSchema: z.object({
            ruleChain: z.string().optional().describe("UUID or name of the rule chain. If omitted, targets the most recent one.")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RuleChainTools.prototype, "getRuleChainMetadata", null);
__decorate([
    Tool({
        name: "add_node_to_rule_chain",
        description: "Add a new rule node component into a rule chain layout.",
        inputSchema: z.object({
            ruleChain: z.string().optional().describe("UUID or name of the rule chain. If omitted, targets the most recent one."),
            nodeName: z.string().describe("Descriptive name to assign to the new node (must be unique within this rule chain)"),
            component: z.string().describe("Class name or exact component name (e.g. 'TbFilterMsgNode' or 'script')"),
            componentType: z.enum(["ENRICHMENT", "FILTER", "TRANSFORMATION", "ACTION", "EXTERNAL"]).optional().describe("Optional category to filter matches (e.g. FILTER, TRANSFORMATION)"),
            configuration: z.record(z.any()).optional().describe("Optional component-specific settings / JSON block")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RuleChainTools.prototype, "addNodeToRuleChain", null);
__decorate([
    Tool({
        name: "connect_rule_nodes",
        description: "Connect two existing rule nodes inside a rule chain layout.",
        inputSchema: z.object({
            ruleChain: z.string().optional().describe("UUID or name of the rule chain. If omitted, targets the most recent one."),
            fromNode: z.string().describe("Name of the source node"),
            toNode: z.string().describe("Name of the destination node"),
            relation: z.string().optional().describe("Type of connection relation (e.g. 'Success', 'Failure', 'True', 'False', default: 'Success')")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RuleChainTools.prototype, "connectRuleNodes", null);
__decorate([
    Tool({
        name: "list_notification_targets",
        description: "List configured notification recipient targets (groups, users) with paging.",
        inputSchema: z.object({
            pageSize: z.number().optional().default(10).describe("Page size"),
            page: z.number().optional().default(0).describe("Page index")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RuleChainTools.prototype, "listNotificationTargets", null);
__decorate([
    Tool({
        name: "list_notification_templates",
        description: "List configured notification message templates (email, SMS, platform notification) with paging.",
        inputSchema: z.object({
            pageSize: z.number().optional().default(10).describe("Page size"),
            page: z.number().optional().default(0).describe("Page index")
        })
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RuleChainTools.prototype, "listNotificationTemplates", null);
//# sourceMappingURL=rule-chain.tools.js.map