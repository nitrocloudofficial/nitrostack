import { Module } from "@nitrostack/core";

import { ChatService } from "./chat.service.js";
import { ChatTools } from "./chat.tools.js";
import { ChatResources } from "./chat.resources.js";
import { ChatPrompts } from "./chat.prompts.js";

@Module({
    name: "chat",
    description: "SkillSync AI Chat Module",
    controllers: [
        ChatTools,
        ChatResources,
        ChatPrompts,
    ],
    providers: [
        ChatService,
    ],
})
export class ChatModule {}