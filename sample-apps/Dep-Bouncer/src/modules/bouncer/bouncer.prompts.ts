import { PromptDecorator as Prompt, ExecutionContext, Injectable } from '@nitrostack/core';

const RULES = `You are about to change this project's npm dependencies. Before every \`npm install\`, \`npm i <pkg>\`, \`npx <pkg>\`, version bump or package.json edit:

1. Call bouncer_check_package (new package) or bouncer_check_upgrade (version bump) first.
2. ALLOW: go ahead.
3. REVIEW: stop and show the user the findings; install only if they agree.
4. BLOCK: do not install it. Never retry with --force, a mirror, a cache or a different package manager. If the report has safeVersion, install exactly that version and tell the user why; otherwise call bouncer_safe_version or ask the user.
5. If the package "does not exist on npm", you probably misremembered the name: say so; do not guess similar names.
6. Quote the evidence in one or two lines when you report a REVIEW or BLOCK.`;

/** A ready-made instruction set that makes an agent use Dep Bouncer before installs. */
@Injectable()
export class BouncerPrompts {
  @Prompt({
    name: 'safe_install',
    description: 'Instructions that make a coding agent vet every npm install with Dep Bouncer and act on the verdict.',
    arguments: [
      { name: 'package', description: 'Optional package the user wants to install', required: false },
    ],
  })
  async safeInstall(args: { package?: string }, ctx: ExecutionContext) {
    ctx.logger.info('safe_install prompt', { package: args.package });
    const ask = args.package
      ? `Install ${args.package} for me, safely.`
      : 'From now on, vet every npm dependency change with Dep Bouncer.';
    return [
      { role: 'user' as const, content: `${RULES}\n\n${ask}` },
      {
        role: 'assistant' as const,
        content: args.package
          ? `Understood. I'll check ${args.package} with bouncer_check_package before installing it, and follow the verdict.`
          : 'Understood. I will call Dep Bouncer before every dependency change and follow its verdict.',
      },
    ];
  }
}
