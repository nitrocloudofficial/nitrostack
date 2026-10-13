import {
  PromptDecorator as Prompt,
  ControllerDecorator as Controller,
  ExecutionContext,
} from '@nitrostack/core';
import { COIN_SPECS } from './types/shoe.types.js';

@Controller()
export class ShoeFitPrompts {
  @Prompt({
    name: 'shoefit_photo_guide',
    description: 'Guide the user through taking coin-calibrated foot photos for accurate measurement',
    arguments: [
      {
        name: 'coin_type',
        description: 'Coin the user plans to use (e.g. us_quarter)',
        required: false,
      },
    ],
  })
  async photoGuide(args: { coin_type?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Generating photo guide prompt');
    const coin =
      args.coin_type && args.coin_type in COIN_SPECS
        ? COIN_SPECS[args.coin_type as keyof typeof COIN_SPECS]
        : COIN_SPECS.inr_10;

    return [
      {
        role: 'user' as const,
        content: 'How should I photograph my foot for shoe sizing?',
      },
      {
        role: 'assistant' as const,
        content: `**ShoeFit photo guide** (calibration coin: **${coin.label}**, ${coin.diameter_mm}mm)

1. **Setup** — Bare foot on a plain light floor. Place the ${coin.label} flat next to the foot (same plane).
2. **Angle** — Camera directly overhead (~90°). Entire foot + coin visible.
3. **Lighting** — Bright, even light; no harsh shadows.
4. **Upload** — Call \`scan_foot_and_recommend\` or \`measure_foot\` with your photo(s).

I'll measure length & width in mm, compute your **foot ratio** (length ÷ width), and match shoes from Nike, Adidas, New Balance, ASICS, Brooks, Puma, Converse, Under Armour, and more.`,
      },
    ];
  }

  @Prompt({
    name: 'shoefit_sizing_help',
    description: 'Explain how ShoeFit matches shoes using foot ratio and dimensions',
    arguments: [],
  })
  async sizingHelp(_args: object, ctx: ExecutionContext) {
    ctx.logger.info('Generating sizing help prompt');

    return [
      {
        role: 'user' as const,
        content: 'How does ShoeFit match me to the right shoe?',
      },
      {
        role: 'assistant' as const,
        content: `ShoeFit uses three signals:

1. **Foot length (mm)** — We add ~10mm toe room when comparing to shoe internal length.
2. **Foot width (mm)** — Matched against each model's width at the ball of the foot.
3. **Foot ratio** — Length ÷ width captures your foot shape. Shoes with similar ratios (last shape) score highest.

**Workflow:**
- \`measure_foot\` → dimensions + ratio
- \`find_matching_shoes\` → ranked matches from scraped brand data
- \`scan_foot_and_recommend\` → both in one step

Run \`refresh_shoe_database\` to pull latest size charts from brand websites.`,
      },
    ];
  }
}
