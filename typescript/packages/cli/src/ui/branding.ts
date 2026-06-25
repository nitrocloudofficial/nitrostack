import chalk from 'chalk';
import ora, { Ora } from 'ora';

// ═══════════════════════════════════════════════════════════════════════════
// OFFICIAL MCP BRANDING (Wekan Enterprise Solutions)
// ═══════════════════════════════════════════════════════════════════════════

export const noColor = !!process.env.NO_COLOR;

// ASCII fallback chars for box-drawing and emoji
const BOX = noColor
  ? { TL: '+', TR: '+', BL: '+', BR: '+', TH: '=', TV: '|', tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' }
  : { TL: '╔', TR: '╗', BL: '╚', BR: '╝', TH: '═', TV: '║', tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' };

export const icons = {
  ok:    noColor ? '[ok]' : '✓',
  err:   noColor ? '[!!]' : '✗',
  info:  noColor ? '[i]'  : 'ℹ',
  warn:  noColor ? '[!]'  : '⚠',
  dot:   noColor ? '.'    : '·',
  bolt:  noColor ? '!'    : '⚡',
  wave:  noColor ? ''     : ' 👋',
  party: noColor ? ''     : ' 🎉',
};

// Core Colors
const SIGNAL_BLUE = '#187CF4';   // Primary
const SKY_BLUE = '#05A3FD';      // Secondary
const SUCCESS_MINT = '#2AB5A5';  // Success
const ERROR_FLAME = '#EF4444';   // Error
const WARNING_AMBER = '#F59E0B'; // Warning
const SLATE_INK = '#121217';     // Text Primary (Light Mode Context)

// Official Links
export const LINKS = {
  website: 'https://nitrostack.ai',
  docs: 'https://docs.nitrostack.ai',
  studio: 'https://nitrostack.ai/studio',
};

export const brand = {
  signal: chalk.hex(SIGNAL_BLUE),
  signalBold: chalk.hex(SIGNAL_BLUE).bold,
  sky: chalk.hex(SKY_BLUE),
  skyBold: chalk.hex(SKY_BLUE).bold,
  mint: chalk.hex(SUCCESS_MINT),
  mintBold: chalk.hex(SUCCESS_MINT).bold,
  error: chalk.hex(ERROR_FLAME),
  warning: chalk.hex(WARNING_AMBER),
};

const TOTAL_WIDTH = 68;

/**
 * Strips ANSI codes for visual length calculation
 */
const stripAnsi = (str: string) => str.replace(/\u001b\[[0-9;]*m/g, '');

/**
 * Creates a clickable terminal link using OSC 8 escape sequence
 */
export function terminalLink(text: string, url: string): string {
  // OSC 8 escape sequence: \x1b]8;;url\x1b\\text\x1b]8;;\x1b\\
  return `\u001b]8;;${url}\u001b\\${text}\u001b]8;;\u001b\\`;
}

/**
 * Creates a line for a box with consistent width and borders
 */
function boxLine(content: string, borderColor: (s: string) => string = brand.signalBold): string {
  const visualLength = stripAnsi(content).length;
  const paddingSize = Math.max(0, TOTAL_WIDTH - visualLength - 2);
  const padding = ' '.repeat(paddingSize);

  return borderColor(BOX.TV) + content + padding + borderColor(BOX.TV);
}

/**
 * Redesigned Banner with Restored ASCII NITRO
 */
export const NITRO_BANNER_FULL = noColor
  ? `
+${'='.repeat(TOTAL_WIDTH - 2)}+
|${' '.repeat(TOTAL_WIDTH - 2)}|
|   NITROSTACK  --  Official MCP Framework${' '.repeat(TOTAL_WIDTH - 44)}|
|${' '.repeat(TOTAL_WIDTH - 2)}|
+${'='.repeat(TOTAL_WIDTH - 2)}+
`
  : `
${brand.signalBold(BOX.TL + BOX.TH.repeat(TOTAL_WIDTH - 2) + BOX.TR)}
${boxLine('')}
${boxLine('   ' + brand.signalBold('███╗   ██╗██╗████████╗██████╗  ██████╗ '))}
${boxLine('   ' + brand.signalBold('████╗  ██║██║╚══██╔══╝██╔══██╗██╔═══██╗'))}
${boxLine('   ' + brand.signalBold('██╔██╗ ██║██║   ██║   ██████╔╝██║   ██║'))}
${boxLine('   ' + brand.skyBold('██║╚██╗██║██║   ██║   ██╔══██╗██║   ██║'))}
${boxLine('   ' + brand.skyBold('██║ ╚████║██║   ██║   ██║  ██║╚██████╔╝'))}
${boxLine('   ' + chalk.dim('╚═╝  ╚═══╝╚═╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ '))}
${boxLine('')}
${boxLine('   ' + brand.signalBold('NITROSTACK') + '  ' + chalk.dim('─ Official MCP Framework'))}
${boxLine('')}
${brand.signalBold(BOX.BL + BOX.TH.repeat(TOTAL_WIDTH - 2) + BOX.BR)}
`;

export function createHeader(title: string, subtitle?: string): string {
  const content = '  ' + brand.signalBold('NITROSTACK') + ' ' + chalk.dim('─') + ' ' + chalk.white.bold(title);
  const subContent = subtitle ? '  ' + chalk.dim(subtitle) : '';

  const borderTop = brand.signalBold(BOX.tl + BOX.h.repeat(TOTAL_WIDTH - 2) + BOX.tr);
  const borderBottom = brand.signalBold(BOX.bl + BOX.h.repeat(TOTAL_WIDTH - 2) + BOX.br);

  const line = (c: string) => {
    const visualLength = stripAnsi(c).length;
    const paddingSize = Math.max(0, TOTAL_WIDTH - visualLength - 2);
    const padding = ' '.repeat(paddingSize);
    return brand.signalBold(BOX.v) + c + padding + brand.signalBold(BOX.v);
  };

  let header = `\n${borderTop}\n${line(content)}\n`;
  if (subtitle) {
    header += `${line(subContent)}\n`;
  }
  header += `${borderBottom}\n`;

  return header;
}

export function createBox(lines: string[], type: 'success' | 'error' | 'info' | 'warning' = 'info'): string {
  const colors = {
    success: { border: brand.mint },
    error: { border: brand.error },
    info: { border: brand.signal },
    warning: { border: brand.warning },
  };

  const { border } = colors[type];

  let output = border(BOX.tl + BOX.h.repeat(TOTAL_WIDTH - 2) + BOX.tr + '\n');

  for (let line of lines) {
    const maxInnerWidth = TOTAL_WIDTH - 6;
    const visualLength = stripAnsi(line).length;

    if (visualLength > maxInnerWidth) {
      line = line.substring(0, maxInnerWidth - 3) + '...';
    }

    const finalVisualLength = stripAnsi(line).length;
    const padding = ' '.repeat(Math.max(0, TOTAL_WIDTH - finalVisualLength - 6));
    output += border(BOX.v) + '  ' + line + padding + '  ' + border(BOX.v) + '\n';
  }

  output += border(BOX.bl + BOX.h.repeat(TOTAL_WIDTH - 2) + BOX.br);

  return output;
}

export function createSuccessBox(title: string, items: string[]): string {
  const lines = [
    brand.mintBold(`${icons.ok} ${title}`),
    '',
    ...items.map(item => chalk.dim(`  ${item}`)),
    '',
  ];
  return createBox(lines, 'success');
}

export function createErrorBox(title: string, message: string): string {
  const lines = [
    brand.error.bold(`${icons.err} ${title}`),
    '',
    chalk.white(message.substring(0, TOTAL_WIDTH - 10)),
    '',
  ];
  return createBox(lines, 'error');
}

export function createInfoBox(items: { label: string; value: string }[]): string {
  const lines = items.map(({ label, value }) =>
    `${chalk.white.bold(label.padEnd(14))} ${brand.sky(value)}`
  );
  return createBox(['', ...lines, ''], 'info');
}

export class NitroSpinner {
  private spinner: Ora;

  constructor(text: string) {
    this.spinner = ora({
      text: chalk.dim(text),
      color: 'blue',
      spinner: 'dots12',
    });
  }

  start(): this {
    this.spinner.start();
    return this;
  }

  update(text: string): this {
    this.spinner.text = chalk.dim(text);
    return this;
  }

  succeed(text?: string): this {
    this.spinner.succeed(text ? brand.mint(`${icons.ok} `) + chalk.dim(text) : undefined);
    return this;
  }

  fail(text?: string): this {
    this.spinner.fail(text ? brand.error(`${icons.err} `) + chalk.dim(text) : undefined);
    return this;
  }

  info(text?: string): this {
    this.spinner.info(text ? brand.signal(`${icons.info} `) + chalk.dim(text) : undefined);
    return this;
  }

  warn(text?: string): this {
    this.spinner.warn(text ? brand.warning(`${icons.warn} `) + chalk.dim(text) : undefined);
    return this;
  }

  stop(): this {
    this.spinner.stop();
    return this;
  }
}

export function log(message: string, type: 'success' | 'error' | 'info' | 'warning' | 'dim' = 'info'): void {
  const logIcons = {
    success: brand.mint(icons.ok),
    error: brand.error(icons.err),
    info: brand.signal(icons.info),
    warning: brand.warning(icons.warn),
    dim: chalk.dim(icons.dot),
  };

  console.log(`  ${logIcons[type]} ${type === 'dim' ? chalk.dim(message) : message}`);
}

export function divider(): void {
  console.log(chalk.dim('  ' + BOX.h.repeat(TOTAL_WIDTH - 4)));
}

export function spacer(): void {
  console.log('');
}

export function nextSteps(steps: string[]): void {
  console.log(chalk.white.bold('\n  Next steps:\n'));
  steps.forEach((step, i) => {
    console.log(chalk.dim(`  ${i + 1}.`) + ' ' + brand.sky(step));
  });

  // Always promote NitroStudio
  const studioStep = steps.length + 1;
  const studioText = brand.signalBold('Download NitroStudio');
  const urlText = brand.sky(LINKS.studio);
  const clickableUrl = terminalLink(urlText, LINKS.studio);
  console.log(chalk.dim(`  ${studioStep}.`) + ' ' + studioText + ' ' + chalk.dim('(') + clickableUrl + chalk.dim(')') + ' ' + chalk.dim('to run your MCP project with a visual client'));

  console.log('');
}

export function showFooter(): void {
  const website = terminalLink(brand.signal(LINKS.website), LINKS.website);
  const docs = terminalLink(brand.signal(LINKS.docs), LINKS.docs);
  const studio = terminalLink(brand.signal(LINKS.studio), LINKS.studio);

  const content = `${chalk.dim('Website:')} ${website}   ${chalk.dim('Docs:')} ${docs}   ${chalk.dim('Studio:')} ${studio}`;

  // Center the footer content
  const visualLength = stripAnsi(content).length;
  const padding = ' '.repeat(Math.max(0, Math.floor((TOTAL_WIDTH - visualLength) / 2)));

  console.log('\n' + padding + content + '\n');
}
