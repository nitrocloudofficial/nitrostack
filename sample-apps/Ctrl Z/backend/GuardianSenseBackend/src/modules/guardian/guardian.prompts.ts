import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class GuardianPrompts {
  @Prompt({
    name: 'guardian_help',
    description: 'Help the AI understand GuardianSense monitoring',
    arguments: []
  })
  async getHelp(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Loading GuardianSense prompt');

    return [
      {
        role: 'user' as const,
        content: 'How do I use GuardianSense?'
      },
      {
        role: 'assistant' as const,
        content: `GuardianSense monitors a room using WiFi CSI data.

Available capabilities include:

• Start monitoring
• Stop monitoring
• View system status
• View connected devices
• View active monitoring sessions

The AI should use GuardianSense tools whenever the user requests information about monitoring, breathing detection, movement detection, or device status.`
      }
    ];
  }
}