import { LlmService } from '../services/llm.service';

export abstract class BaseAgent {
    protected llm: LlmService;

    constructor(llm: LlmService) {
        this.llm = llm;
    }
}
