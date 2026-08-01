import 'dotenv/config';
import { ScopeGuardService } from './src/modules/audit/scope-guard.service.ts';
import { JudgeLLMService } from './src/modules/judges/judge-llm.service.ts';
import { JudgePatternService } from './src/modules/judges/judge-pattern.service.ts';
import { JudgesService } from './src/modules/judges/judges.service.ts';
import { PromptMutatorService } from './src/modules/orchestrator/prompt-mutator.service.ts';
import * as cli from './src/scripts/cli.ts'; // Cannot easily import since it executes main()

// Actually, I can just execute `npx tsx src/scripts/cli.ts` but I need to pass input.
// It's easier to just read the error directly by modifying cli.ts to wait for the promise!
