import axios from "axios";
import * as dotenv from "dotenv";
dotenv.config();
// ─── Auth headers ────────────────────────────────────────────────────────────
const TB_URL = process.env.TB_URL;
const API_KEY = process.env.TB_API_KEY;
const headers = () => ({
    "Content-Type": "application/json",
    "X-Authorization": `ApiKey ${API_KEY}`
});
export class RuleChainService {
    // ── Rule Chain CRUD ───────────────────────────────────────────────────────
    async createRuleChain(name, root = false, debugMode = false) {
        const response = await axios.post(`${TB_URL}/api/ruleChain`, {
            name,
            root,
            debugMode
        }, { headers: headers() });
        return response.data;
    }
    async getRuleChain(ruleChainIdOrName) {
        const id = await this.resolveRuleChainId(ruleChainIdOrName);
        const response = await axios.get(`${TB_URL}/api/ruleChain/${id}`, { headers: headers() });
        return response.data;
    }
    async listRuleChains(pageSize = 10, page = 0) {
        const response = await axios.get(`${TB_URL}/api/ruleChains?pageSize=${pageSize}&page=${page}`, { headers: headers() });
        return response.data;
    }
    async deleteRuleChain(ruleChainIdOrName) {
        const id = await this.resolveRuleChainId(ruleChainIdOrName);
        await axios.delete(`${TB_URL}/api/ruleChain/${id}`, { headers: headers() });
    }
    // ── Metadata Management ───────────────────────────────────────────────────
    async getRuleChainMetadata(ruleChainIdOrName) {
        const id = await this.resolveRuleChainId(ruleChainIdOrName);
        const response = await axios.get(`${TB_URL}/api/ruleChain/${id}/metadata`, { headers: headers() });
        return response.data;
    }
    async saveRuleChainMetadata(metadata) {
        if ((metadata.firstNodeIndex === null || metadata.firstNodeIndex === undefined) && metadata.nodes && metadata.nodes.length > 0) {
            metadata.firstNodeIndex = 0;
        }
        const response = await axios.post(`${TB_URL}/api/ruleChain/metadata`, metadata, { headers: headers() });
        return response.data;
    }
    async getRuleNodeCatalog(category) {
        const response = await axios.get(`${TB_URL}/api/components?componentTypes=ENRICHMENT,FILTER,TRANSFORMATION,ACTION,EXTERNAL`, { headers: headers() });
        const list = response.data;
        const grouped = {};
        for (const c of list) {
            const type = c.type;
            if (!grouped[type])
                grouped[type] = [];
            grouped[type].push({
                name: c.name,
                clazz: c.clazz
            });
        }
        if (category) {
            const catUpper = category.toUpperCase();
            return {
                category: catUpper,
                components: grouped[catUpper] ?? []
            };
        }
        return {
            availableCategories: Object.keys(grouped),
            catalog: grouped
        };
    }
    async searchComponents(query, type) {
        const response = await axios.get(`${TB_URL}/api/components?componentTypes=ENRICHMENT,FILTER,TRANSFORMATION,ACTION,EXTERNAL`, { headers: headers() });
        const list = response.data;
        const keywords = query.toLowerCase().split(/\s+/);
        let matched = list.filter(c => {
            const name = (c.name || "").toLowerCase();
            const clazz = (c.clazz || "").toLowerCase();
            const cType = (c.type || "").toLowerCase();
            return keywords.every(kw => name.includes(kw) || clazz.includes(kw) || cType.includes(kw));
        });
        if (type) {
            const targetType = type.toUpperCase();
            matched = matched.filter(c => c.type === targetType);
        }
        return matched.sort((a, b) => {
            const aName = (a.name || "").toLowerCase();
            const bName = (b.name || "").toLowerCase();
            const aClazz = (a.clazz || "").toLowerCase();
            const bClazz = (b.clazz || "").toLowerCase();
            const firstKw = keywords[0];
            if (aClazz === query.toLowerCase())
                return -1;
            if (bClazz === query.toLowerCase())
                return 1;
            if (aName === query.toLowerCase())
                return -1;
            if (bName === query.toLowerCase())
                return 1;
            if (aName.startsWith(firstKw) && !bName.startsWith(firstKw))
                return -1;
            if (!aName.startsWith(firstKw) && bName.startsWith(firstKw))
                return 1;
            return 0;
        }).map(c => ({
            name: c.name,
            clazz: c.clazz,
            type: c.type,
            configurationVersion: c.configurationVersion,
            configurationDescriptor: c.configurationDescriptor
        }));
    }
    async addNodeToRuleChain(ruleChainIdOrName, nodeName, componentClassOrName, configuration, componentType) {
        const ruleChainId = await this.resolveRuleChainId(ruleChainIdOrName);
        // 1. Resolve component class
        const components = await this.searchComponents(componentClassOrName, componentType);
        if (components.length === 0) {
            throw new Error(`Component class or name matching "${componentClassOrName}"${componentType ? ` of type ${componentType}` : ""} not found.`);
        }
        const component = components[0]; // pick first matching component
        // 2. Fetch current metadata
        const metadata = await this.getRuleChainMetadata(ruleChainId);
        if (!metadata.nodes)
            metadata.nodes = [];
        // 3. Prevent duplicate node names in the same rule chain
        const duplicate = metadata.nodes.find((n) => n.name.toLowerCase() === nodeName.toLowerCase());
        if (duplicate) {
            throw new Error(`Node with name "${nodeName}" already exists in this rule chain.`);
        }
        // 4. Position node cleanly (step to the right)
        const lastNode = metadata.nodes[metadata.nodes.length - 1];
        const layoutX = lastNode ? (lastNode.additionalInfo?.layoutX ?? 100) + 180 : 150;
        const layoutY = lastNode ? (lastNode.additionalInfo?.layoutY ?? 150) : 150;
        // 5. Append new rule node (without client-generated id so ThingsBoard creates it)
        const defaultNodeConfig = component.configurationDescriptor?.nodeDefinition?.defaultConfiguration ?? {};
        const mergedConfig = {
            ...defaultNodeConfig,
            ...(configuration ?? {})
        };
        // Auto-heal notification node configurations if targets/templateId are missing or null
        if (component.clazz === "org.thingsboard.rule.engine.notification.TbNotificationNode") {
            if (!mergedConfig.targets || (Array.isArray(mergedConfig.targets) && mergedConfig.targets.length === 0) || mergedConfig.targets === null) {
                try {
                    const targetsRes = await this.listNotificationTargets(10, 0);
                    const list = targetsRes.data ?? [];
                    const allUsersTarget = list.find((t) => t.name.toLowerCase() === "all users") || list[0];
                    if (allUsersTarget) {
                        mergedConfig.targets = [allUsersTarget.id.id];
                    }
                }
                catch (err) {
                    console.error("Auto-heal failed to fetch notification targets:", err);
                }
            }
            if (!mergedConfig.templateId || mergedConfig.templateId === null) {
                try {
                    const templatesRes = await this.listNotificationTemplates(10, 0);
                    const list = templatesRes.data ?? [];
                    if (list.length > 0) {
                        mergedConfig.templateId = list[0].id.id;
                    }
                }
                catch (err) {
                    console.error("Auto-heal failed to fetch notification templates:", err);
                }
            }
            // Sanitize: strip out any keys not allowed by ThingsBoard's TbNotificationNodeConfiguration
            const validKeys = ["targets", "templateId"];
            for (const key of Object.keys(mergedConfig)) {
                if (!validKeys.includes(key)) {
                    delete mergedConfig[key];
                }
            }
            // Format 3: targets MUST be UUID strings, templateId MUST be a NOTIFICATION_TEMPLATE EntityId object
            if (Array.isArray(mergedConfig.targets)) {
                mergedConfig.targets = mergedConfig.targets.map((t) => typeof t === "object" ? (t.id ?? t) : t);
            }
            if (mergedConfig.templateId && typeof mergedConfig.templateId === "string") {
                mergedConfig.templateId = {
                    entityType: "NOTIFICATION_TEMPLATE",
                    id: mergedConfig.templateId
                };
            }
        }
        const newNode = {
            ruleChainId: {
                entityType: "RULE_CHAIN",
                id: ruleChainId
            },
            type: component.clazz,
            name: nodeName,
            debugMode: false,
            debugSettings: null,
            singletonMode: false,
            queueName: null,
            configurationVersion: component.configurationVersion ?? 1,
            configuration: mergedConfig,
            externalId: null,
            additionalInfo: {
                description: "",
                layoutX,
                layoutY
            }
        };
        metadata.nodes.push(newNode);
        // 6. Save updated metadata
        const savedMetadata = await this.saveRuleChainMetadata(metadata);
        const savedNode = (savedMetadata.nodes ?? []).find((n) => n.name.toLowerCase() === nodeName.toLowerCase());
        if (!savedNode) {
            throw new Error(`Failed to retrieve node "${nodeName}" after saving rule chain metadata.`);
        }
        return {
            ruleChainId,
            nodeId: savedNode.id?.id,
            nodeName: savedNode.name,
            componentClass: savedNode.type,
            metadata: savedMetadata
        };
    }
    async connectNodesInRuleChain(ruleChainIdOrName, fromNodeName, toNodeName, relationType = "Success") {
        const ruleChainId = await this.resolveRuleChainId(ruleChainIdOrName);
        // 1. Fetch current metadata
        const metadata = await this.getRuleChainMetadata(ruleChainId);
        if (!metadata.nodes)
            metadata.nodes = [];
        if (!metadata.connections)
            metadata.connections = [];
        // 2. Find indices of fromNode and toNode (matching by name or UUID)
        const fromIndex = metadata.nodes.findIndex((n) => n.name.toLowerCase() === fromNodeName.toLowerCase() ||
            (n.id?.id && n.id.id.toLowerCase() === fromNodeName.toLowerCase()));
        const toIndex = metadata.nodes.findIndex((n) => n.name.toLowerCase() === toNodeName.toLowerCase() ||
            (n.id?.id && n.id.id.toLowerCase() === toNodeName.toLowerCase()));
        if (fromIndex === -1) {
            throw new Error(`Source node "${fromNodeName}" not found in rule chain.`);
        }
        if (toIndex === -1) {
            throw new Error(`Destination node "${toNodeName}" not found in rule chain.`);
        }
        // 3. Check for existing duplicate connection
        const exists = metadata.connections.some((c) => c.fromIndex === fromIndex && c.toIndex === toIndex && c.type === relationType);
        if (!exists) {
            metadata.connections.push({
                fromIndex,
                toIndex,
                type: relationType
            });
        }
        // 4. Save metadata
        const savedMetadata = await this.saveRuleChainMetadata(metadata);
        return {
            ruleChainId,
            fromNode: fromNodeName,
            toNode: toNodeName,
            relationType,
            metadata: savedMetadata
        };
    }
    async listNotificationTargets(pageSize = 10, page = 0) {
        const response = await axios.get(`${TB_URL}/api/notification/targets?pageSize=${pageSize}&page=${page}`, { headers: headers() });
        return response.data;
    }
    async listNotificationTemplates(pageSize = 10, page = 0) {
        const response = await axios.get(`${TB_URL}/api/notification/templates?pageSize=${pageSize}&page=${page}`, { headers: headers() });
        return response.data;
    }
    // ── Resolution Helpers ────────────────────────────────────────────────────
    async resolveRuleChainId(ruleChainIdentifier) {
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (ruleChainIdentifier && UUID_REGEX.test(ruleChainIdentifier)) {
            return ruleChainIdentifier;
        }
        const res = await this.listRuleChains(100, 0);
        const list = res.data ?? [];
        if (!ruleChainIdentifier) {
            if (list.length === 0) {
                throw new Error("No rule chains found. Please create one first.");
            }
            // Sort by createdTime descending to get the most recent one
            const sorted = [...list].sort((a, b) => (b.createdTime ?? 0) - (a.createdTime ?? 0));
            return sorted[0].id.id;
        }
        const exactMatch = list.find((rc) => rc.name.toLowerCase() === ruleChainIdentifier.toLowerCase());
        if (exactMatch) {
            return exactMatch.id.id;
        }
        const fuzzyMatch = list.find((rc) => rc.name.toLowerCase().includes(ruleChainIdentifier.toLowerCase()));
        if (fuzzyMatch) {
            return fuzzyMatch.id.id;
        }
        throw new Error(`Could not find rule chain with name or ID matching "${ruleChainIdentifier}".`);
    }
}
//# sourceMappingURL=rule-chain.service.js.map