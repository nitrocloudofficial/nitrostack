"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const logger_1 = require("@omnitrace/logger");
const webhooks_1 = require("./webhooks");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/webhooks', webhooks_1.webhookRouter);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger_1.logger.info(`OmniTrace orchestrator listening on port ${PORT}`);
});
