import { Injectable } from '@nitrostack/core';
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
