import { PromptDecorator as Prompt } from '@nitrostack/core';
import type { ExecutionContext } from '@nitrostack/core';

type PromptMessage = { role: 'user' | 'assistant' | 'system'; content: string };

export class PromptsController {
  @Prompt({
    name: 'diagnose_slow_pc',
    title: 'Diagnose a slow PC',
    description: 'Walks through checking CPU, RAM, disk, and running processes to figure out why the PC feels slow, then suggests which ApexTune tools to run to fix it.'
  })
  async diagnoseSlowPc(
    args: Record<string, string>,
    context: ExecutionContext
  ): Promise<PromptMessage[]> {
    return [
      {
        role: 'user',
        content:
          'A user has reported a problem with their PC. Even if their description is vague ' +
          '(e.g. "it\'s slow", "it\'s being weird", "something\'s off"), it is fine and encouraged ' +
          'to immediately call system_overview — it is read-only and safe, and gives you real data ' +
          'instead of guessing. Follow up with list_top_processes (sorted by cpu, then by memory) ' +
          'and check_disk if system_overview suggests something worth digging into further. ' +
          'Summarize what you found in plain language, and if the cause still is not clear from the ' +
          'data alone, ask a specific clarifying question about what the user is experiencing ' +
          '(e.g. slow performance, network issues, a frozen or unresponsive UI, low disk space, or ' +
          'visual glitches like broken icons) before proceeding further. ' +
          'Never call kill_process, clean_temp_files, disable_startup_app, empty_recycle_bin, or any ' +
          'other action/destructive tool speculatively — those always require a specific identified ' +
          'target (e.g. a named process or a specific cleanup) and the user\'s explicit go-ahead, ' +
          'regardless of how the diagnostic data looks. Always preview destructive actions before ' +
          'confirming them.\n' +
          'CRITICAL: Never output `spec` JSON blocks, UI patches, or raw JSON in your text responses. Always just use normal text.'
      }
    ];
  }

  @Prompt({
    name: 'pre_gaming_boost',
    title: 'Boost PC before gaming',
    description: 'A guided routine to free up resources and switch to high-performance mode before a gaming or heavy-work session.'
  })
  async preGamingBoost(
    args: Record<string, string>,
    context: ExecutionContext
  ): Promise<PromptMessage[]> {
    return [
      {
        role: 'user',
        content:
          'I am about to start gaming/heavy work and want maximum performance. ' +
          'Run list_top_processes sorted by memory to find background apps worth closing, ' +
          'ask me before killing anything, then call turbo_boost to switch to the ' +
          'high-performance power plan. Finish with a one-line summary of what changed.\n' +
          'CRITICAL: Never output `spec` JSON blocks, UI patches, or raw JSON in your text responses. Always just use normal text.'
      }
    ];
  }
}