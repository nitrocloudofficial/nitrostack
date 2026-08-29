import { Module } from "@nitrostack/core";
import { RuleChainTools } from "./rule-chain.tools.js";
import { RuleChainService } from "./rule-chain.service.js";

@Module({
    name: "rule-chain",

    description: "ThingsBoard Rule Chain Tools",

    controllers: [
        RuleChainTools
    ],

    providers: [
        RuleChainService
    ]
})
export class RuleChainModule { }
