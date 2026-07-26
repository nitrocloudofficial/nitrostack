"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookRouter = void 0;
const express_1 = __importDefault(require("express"));
const schemas_1 = require("@omnitrace/schemas");
const logger_1 = require("@omnitrace/logger");
const graph_1 = require("../graph");
exports.webhookRouter = express_1.default.Router();
exports.webhookRouter.post('/github', async (req, res) => {
    let payload;
    try {
        payload = schemas_1.WebhookPayloadSchema.parse(req.body);
    }
    catch (err) {
        logger_1.logger.error({ err }, 'Webhook processing failed - Invalid payload');
        res.status(400).json({ error: 'Invalid payload' });
        return;
    }
    logger_1.logger.info(`Received webhook for ${payload.repository_url}`);
    // Acknowledge the webhook immediately so GitHub Actions (or curl) doesn't hang
    res.status(202).json({ message: 'Incident processing started in the background' });
    try {
        const graph = await (0, graph_1.createGraph)();
        const threadId = payload.run_id?.toString() || Date.now().toString();
        const config = { configurable: { thread_id: threadId } };
        // Execute the graph asynchronously
        graph.invoke({
            status: 'DIAGNOSING',
            pipelineContext: {
                repository_url: payload.repository_url,
                branch_name: payload.branch_name,
                commit_sha: payload.commit_sha,
                failing_job_id: payload.failing_job_id,
                run_id: payload.run_id,
                owner: payload.owner,
                repo: payload.repo,
            }
        }, config).then(finalState => {
            logger_1.logger.info(`Incident processed successfully for thread ${threadId}`);
        }).catch(err => {
            logger_1.logger.error({ err }, 'Background graph execution failed');
        });
    }
    catch (err) {
        logger_1.logger.error({ err }, 'Graph initialization failed');
    }
});
exports.webhookRouter.post('/slack/interactivity', express_1.default.urlencoded({ extended: true }), async (req, res) => {
    try {
        const payload = JSON.parse(req.body.payload);
        // Acknowledge the interactive request immediately
        res.status(200).send();
        if (payload.type === 'block_actions' && payload.actions && payload.actions.length > 0) {
            const action = payload.actions[0].value || payload.actions[0].text?.text;
            if (action === 'Approve') {
                // Extract the Run ID from the original message's blocks
                let runId = null;
                for (const block of payload.message.blocks) {
                    if (block.text && block.text.text) {
                        const match = block.text.text.match(/Run ID:\*?\s*(\S+)/);
                        if (match) {
                            runId = match[1];
                            break;
                        }
                    }
                }
                if (runId) {
                    logger_1.logger.info(`Received approval for run ${runId}, resuming graph execution...`);
                    const graph = await (0, graph_1.createGraph)();
                    const config = { configurable: { thread_id: runId } };
                    // Update the state to approved and set the correct slackThreadId
                    await graph.updateState(config, {
                        status: 'APPROVED',
                        slackThreadId: payload.message.ts
                    });
                    // Resume graph execution
                    graph.invoke(null, config).then(() => {
                        logger_1.logger.info(`Graph resumed and completed for run ${runId}`);
                    }).catch(err => {
                        logger_1.logger.error({ err }, 'Graph resume failed');
                    });
                }
                else {
                    logger_1.logger.warn('Could not extract Run ID from Slack message.');
                }
            }
            else {
                logger_1.logger.info(`Received action: ${action}, skipping (only Approve triggers PR).`);
            }
        }
    }
    catch (err) {
        logger_1.logger.error({ err }, 'Slack interactivity processing failed');
    }
});
