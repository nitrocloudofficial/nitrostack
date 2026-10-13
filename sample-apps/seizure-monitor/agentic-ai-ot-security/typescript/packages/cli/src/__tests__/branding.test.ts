import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock chalk
jest.unstable_mockModule('chalk', () => ({
  default: {
    hex: jest.fn(() => Object.assign((s: string) => s, { bold: (s: string) => s })),
    bold: jest.fn((s: string) => s),
    dim: jest.fn((s: string) => s),
    green: Object.assign(jest.fn((s: string) => s), { bold: (s: string) => s }),
    red: Object.assign(jest.fn((s: string) => s), { bold: (s: string) => s }),
    yellow: Object.assign(jest.fn((s: string) => s), { bold: (s: string) => s }),
    cyan: jest.fn((s: string) => s),
    white: Object.assign(jest.fn((s: string) => s), { bold: (s: string) => s }),
    gray: jest.fn((s: string) => s),
    blue: jest.fn((s: string) => s),
  },
}));

// Mock ora
const mockSpinner = {
  start: jest.fn().mockReturnThis(),
  succeed: jest.fn().mockReturnThis(),
  fail: jest.fn().mockReturnThis(),
  info: jest.fn().mockReturnThis(),
  warn: jest.fn().mockReturnThis(),
  stop: jest.fn().mockReturnThis(),
  text: '',
};
jest.unstable_mockModule('ora', () => ({
  default: jest.fn(() => mockSpinner),
}));

describe('Branding Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should export brand colors', async () => {
    const { brand } = await import('../ui/branding.js');
    
    expect(brand).toBeDefined();
    expect(typeof brand.accent).toBe('function');
    expect(typeof brand.accentBold).toBe('function');
    expect(typeof brand.accentLight).toBe('function');
    expect(typeof brand.accentLighter).toBe('function');
  });

  it('should create header box', async () => {
    const { createHeader } = await import('../ui/branding.js');
    
    const result = createHeader('Test Title', 'Test subtitle');
    
    expect(typeof result).toBe('string');
    expect(result).toContain('Test Title');
  });

  it('should create header without subtitle', async () => {
    const { createHeader } = await import('../ui/branding.js');
    
    const result = createHeader('Just Title');
    
    expect(typeof result).toBe('string');
    expect(result).toContain('Just Title');
  });

  it('should create success box', async () => {
    const { createSuccessBox } = await import('../ui/branding.js');
    
    const result = createSuccessBox('Success!', ['Item 1', 'Item 2']);
    
    expect(typeof result).toBe('string');
  });

  it('should create success box with empty items', async () => {
    const { createSuccessBox } = await import('../ui/branding.js');
    
    const result = createSuccessBox('Success!', []);
    
    expect(typeof result).toBe('string');
  });

  it('should create error box', async () => {
    const { createErrorBox } = await import('../ui/branding.js');
    
    const result = createErrorBox('Error!', 'Something went wrong');
    
    expect(typeof result).toBe('string');
  });

  it('should create info box', async () => {
    const { createInfoBox } = await import('../ui/branding.js');
    
    const result = createInfoBox([
      { label: 'Label 1', value: 'Value 1' },
      { label: 'Label 2', value: 'Value 2' },
    ]);
    
    expect(typeof result).toBe('string');
  });

  it('should create generic box', async () => {
    const { createBox } = await import('../ui/branding.js');
    
    const result = createBox(['Line 1', 'Line 2'], 'success');
    expect(typeof result).toBe('string');
    
    const errorResult = createBox(['Error line'], 'error');
    expect(typeof errorResult).toBe('string');
    
    const warningResult = createBox(['Warning line'], 'warning');
    expect(typeof warningResult).toBe('string');
    
    const infoResult = createBox(['Info line'], 'info');
    expect(typeof infoResult).toBe('string');
  });

  it('should create NitroSpinner', async () => {
    const { NitroSpinner } = await import('../ui/branding.js');
    
    const spinner = new NitroSpinner('Loading...');
    
    expect(spinner).toBeDefined();
    expect(typeof spinner.start).toBe('function');
    expect(typeof spinner.succeed).toBe('function');
    expect(typeof spinner.fail).toBe('function');
    expect(typeof spinner.info).toBe('function');
    expect(typeof spinner.warn).toBe('function');
    expect(typeof spinner.stop).toBe('function');
    expect(typeof spinner.update).toBe('function');
  });

  it('should chain spinner methods', async () => {
    const { NitroSpinner } = await import('../ui/branding.js');
    
    const spinner = new NitroSpinner('Test');
    const result = spinner.start();
    
    expect(result).toBe(spinner);
    expect(mockSpinner.start).toHaveBeenCalled();
  });

  it('should succeed spinner', async () => {
    const { NitroSpinner } = await import('../ui/branding.js');
    
    const spinner = new NitroSpinner('Test');
    spinner.start();
    spinner.succeed('Done');
    
    expect(mockSpinner.succeed).toHaveBeenCalled();
  });

  it('should fail spinner', async () => {
    const { NitroSpinner } = await import('../ui/branding.js');
    
    const spinner = new NitroSpinner('Test');
    spinner.start();
    spinner.fail('Error');
    
    expect(mockSpinner.fail).toHaveBeenCalled();
  });

  it('should show info on spinner', async () => {
    const { NitroSpinner } = await import('../ui/branding.js');
    
    const spinner = new NitroSpinner('Test');
    spinner.start();
    spinner.info('Info message');
    
    expect(mockSpinner.info).toHaveBeenCalled();
  });

  it('should warn on spinner', async () => {
    const { NitroSpinner } = await import('../ui/branding.js');
    
    const spinner = new NitroSpinner('Test');
    spinner.start();
    spinner.warn('Warning');
    
    expect(mockSpinner.warn).toHaveBeenCalled();
  });

  it('should update spinner text', async () => {
    const { NitroSpinner } = await import('../ui/branding.js');
    
    const spinner = new NitroSpinner('Test');
    spinner.start();
    spinner.update('Updated text');
    
    expect(spinner).toBeDefined();
  });

  it('should stop spinner', async () => {
    const { NitroSpinner } = await import('../ui/branding.js');
    
    const spinner = new NitroSpinner('Test');
    spinner.start();
    spinner.stop();
    
    expect(mockSpinner.stop).toHaveBeenCalled();
  });

  it('should log messages with different types', async () => {
    const { log } = await import('../ui/branding.js');
    
    log('Success message', 'success');
    log('Error message', 'error');
    log('Info message', 'info');
    log('Warning message', 'warning');
    log('Dim message', 'dim');
    log('Default message');
    
    expect(console.log).toHaveBeenCalledTimes(6);
  });

  it('should add divider', async () => {
    const { divider } = await import('../ui/branding.js');
    
    divider();
    
    expect(console.log).toHaveBeenCalled();
  });

  it('should add spacer', async () => {
    const { spacer } = await import('../ui/branding.js');
    
    spacer();
    
    expect(console.log).toHaveBeenCalledWith('');
  });

  it('should show next steps', async () => {
    const { nextSteps } = await import('../ui/branding.js');
    
    nextSteps(['Step 1', 'Step 2', 'Step 3']);
    
    expect(console.log).toHaveBeenCalled();
  });

  it('should export NITRO_BANNER_FULL', async () => {
    const { NITRO_BANNER_FULL } = await import('../ui/branding.js');
    
    expect(typeof NITRO_BANNER_FULL).toBe('string');
    expect(NITRO_BANNER_FULL.length).toBeGreaterThan(0);
  });
});
