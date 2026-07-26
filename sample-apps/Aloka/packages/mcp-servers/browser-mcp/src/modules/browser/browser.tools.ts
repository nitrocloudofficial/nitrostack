import { ToolDecorator as Tool, z } from '@nitrostack/core';
import { BrowserService } from './browser.service.js';

export class BrowserTools {
  constructor(private readonly browserService: BrowserService) {}

  @Tool({
    name: 'capture_viewport_screenshot',
    description: 'Replays user steps on a target route, takes a screenshot',
    inputSchema: z.object({ url: z.string().url() })
  })
  async captureViewportScreenshot(args: { url: string }) {
    return await this.browserService.captureScreenshot(args.url);
  }

  @Tool({
    name: 'inspect_dom_element',
    description: 'Inspect DOM node attributes and console errors at failure URL',
    inputSchema: z.object({
      url: z.string().url(),
      css_selector: z.string().optional(),
      capture_console_errors: z.boolean().default(true)
    })
  })
  async inspectDomElement(args: { url: string, css_selector?: string, capture_console_errors: boolean }) {
    const result = await this.browserService.inspectDom(args.url, args.css_selector, args.capture_console_errors);
    return result.length > 4000 ? result.substring(0, 4000) : result;
  }
}
