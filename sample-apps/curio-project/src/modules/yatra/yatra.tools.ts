import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';

export class OmniGameTools {
  
  @Tool({
    name: 'publish_2d_platformer',
    description: 'Generates and publishes a 3-level 2D interactive platformer game about any educational topic. Each checkpoint features an interactive mini-puzzle with strict correct/wrong evaluation, 8-bit Web Audio sound effects, and escalating difficulty. IMPORTANT: If the user asks to "retry", "play again", or restarts a topic, generate completely NEW content.',
    inputSchema: z.object({
      topic: z.string().describe('The main topic of the game (e.g., "Mughal Empire", "Photosynthesis")'),
      levels: z.array(z.object({
        infoBlocks: z.array(z.object({
          title: z.string().describe('Title of the info block/checkpoint'),
          content: z.string().describe('Fascinating fact or core concept to teach the user'),
          puzzleType: z.enum(['sequence', 'collector', 'match']).describe('Interactive mini-puzzle type for this checkpoint'),
          puzzlePrompt: z.string().describe('Short instruction for the mini-puzzle (e.g. "Order the events in correct chronological sequence" or "Catch the 2 correct elements of Photosynthesis!")'),
          puzzleItems: z.array(z.string()).length(4).describe('4 options/items. For collector: 2 correct + 2 distractors. For sequence: 3-4 ordered steps. For match: 2 terms + 2 definitions.'),
          puzzleTarget: z.array(z.string()).describe('The exact correct array sequence or correct target items that must be selected to win!')
        })).min(3).max(5).describe('3 to 5 checkpoints with interactive mini-puzzles in this level'),
        bossQuiz: z.object({
          question: z.string().describe('A challenging question to test the user\'s knowledge at the end of this level'),
          options: z.array(z.string()).length(4).describe('4 multiple choice options'),
          correctAnswer: z.string().describe('The exact string of the correct option')
        }).describe('The boss fight quiz for this level'),
        visuals: z.object({
          skyColor: z.string().describe('CSS color for the sky based on the level mood (e.g., "darkblue", "#87CEEB", "black")'),
          groundColor: z.string().describe('CSS color for the ground/dirt (e.g., "#8B4513", "darkgrey")'),
          grassColor: z.string().describe('CSS color for the top layer of the ground (e.g., "#228B22", "grey", "white")'),
          playerEmoji: z.string().describe('A single emoji representing the player character (e.g., 🧑‍🚀, ⛵, 🗡️, 🏃)'),
          bossEmoji: z.string().describe('A single emoji representing the boss (e.g., 👾, 🐉, 🏛️, 🌪️)'),
          collectibleEmoji: z.string().describe('A single emoji for the info blocks (e.g., 🌟, 📜, 🪐, 💎)'),
          sceneryEmoji: z.string().describe('A single emoji to scatter in the background (e.g., ☁️, 🌲, 🏔️, 🏛️, ⭐)'),
          obstacleEmoji: z.string().describe('A single emoji representing a thematic obstacle (e.g. 🌵, 🦈, 🌋, 🚧)')
        }).describe('Dynamic CSS color styling and Emojis to visually match the theme of this level.')
      })).length(3).describe('Exactly 3 levels with escalating difficulty. Level 1 (Beginner), Level 2 (Intermediate), Level 3 (Advanced/Boss)')
    })
  })
  @Widget('OmniGame')
  async publishGame(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Publishing 2D platformer with strict puzzle evaluation for topic: ${input.topic}`);
    return {
      topic: input.topic,
      levels: input.levels
    };
  }
}
