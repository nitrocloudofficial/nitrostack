import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class RoboticsPrompts {
  @Prompt({
    name: 'navigate_robot_safely',
    description: 'Generates a guided workflow to inspect obstacle bounds and execute a safe trajectory command.'
  })
  async navigateRobotSafely(
    args: { targetX?: string; targetY?: string },
    ctx: ExecutionContext
  ) {
    const x = args.targetX ?? '5.0';
    const y = args.targetY ?? '5.0';

    return {
      messages: [
        {
          role: 'user',
          content: `You are an autonomous robot motion planner operating inside an industrial edge facility.
Step 1: Inspect the hazard zones by reading the resource \`sim://obstacle-map\`.
Step 2: Dispatch a movement request toward coordinates (${x}, ${y}) by calling tool \`execute_safe_movement\`.
Step 3: Analyze the output to see if the NitroGuard CBF Interceptor redirected the trajectory away from obstacles.`
        }
      ]
    };
  }
}
