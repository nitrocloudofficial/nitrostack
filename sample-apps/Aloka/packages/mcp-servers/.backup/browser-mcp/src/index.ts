#!/usr/bin/env node
import { Module, ToolDecorator as Tool, Injectable, McpApp, McpApplicationFactory, z } from '@nitrostack/core';
import { Sanitizer } from '@omnitrace/sanitizer';
import { chromium } from 'playwright';

@Injectable()
export class BrowserService {
  public async captureScreenshot(url: string): Promise<string> {
    try {
      const browser = await chromium.launch();
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });
      const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 50 });
      await browser.close();
      return `data:image/jpeg;base64,${screenshotBuffer.toString('base64')}`;
    } catch (e: any) {
      return `[ERROR] Playwright screenshot failed: ${e.message}`;
    }
  }

  public async inspectDom(url: string, cssSelector?: string, captureConsole?: boolean): Promise<string> {
    try {
      const browser = await chromium.launch();
      const page = await browser.newPage();
      
      const consoleLogs: string[] = [];
      if (captureConsole) {
        page.on('console', msg => {
          if (msg.type() === 'error') {
            consoleLogs.push(`[CONSOLE ERROR] ${msg.text()}`);
          }
        });
      }

      await page.goto(url, { waitUntil: 'domcontentloaded' });
      
      let domHtml = '';
      if (cssSelector) {
        domHtml = await page.locator(cssSelector).innerHTML().catch(() => 'Selector not found');
      } else {
        domHtml = await page.evaluate(() => document.body.innerHTML);
      }
      
      await browser.close();
      const report = `URL: ${url}\nSelector: ${cssSelector || 'body'}\n\nDOM:\n${domHtml}\n\nConsole Errors:\n${consoleLogs.join('\n')}`;
      return Sanitizer.scrub(report);
    } catch (e: any) {
      return `[ERROR] Playwright DOM inspection failed: ${e.message}`;
    }
  }
}

@McpApp({ 
  module: BrowserServer, 
  server: { name: 'browser-mcp', version: '1.0.0' },
  logging: { level: 'error' }
})
@Module({ 
  name: 'browser', 
  imports: [
    
  ],
  providers: [BrowserService] 
})
export class BrowserServer {
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

async function bootstrap() {
  const server = await McpApplicationFactory.create(BrowserServer);
  await server.start();
}
bootstrap().catch(console.error);
