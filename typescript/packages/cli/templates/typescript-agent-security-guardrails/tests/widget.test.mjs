/**
 * Copyright 2025 Nitrostack Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { startDemo, call, job } from './mcp-fixture.mjs';

test('the packaged dashboard changes live policy and displays external MCP activity', async (t) => {
  const { connect } = await startDemo(t);
  const admin = await connect('research-admin'),
    agent = await connect('research-agent');
  const dashboard = await admin.callTool({ name: 'show_security_dashboard', arguments: {} });
  const resource = await admin.readResource({ uri: dashboard._meta['openai/outputTemplate'] });
  const html = resource.contents[0].text;
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH,
    headless: true,
  });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 840, height: 800 } });
  await page.exposeFunction('hostTool', (name, args) => admin.callTool({ name, arguments: args }));
  // Supply only the host bridge. The widget, client, policy provider and simulator are real.
  await page.addInitScript((output) => {
    window.openai = { toolOutput: output, theme: 'dark', callTool: window.hostTool };
  }, dashboard.structuredContent);
  await page.route('http://widget.local/', (route) =>
    route.fulfill({ contentType: 'text/html', body: html })
  );
  await page.goto('http://widget.local/');
  const click = (name) => page.getByRole('button', { name, exact: true }).click();
  await click('Request 8 MB job');
  await click('Edit outbound limit');
  await page.getByLabel('Immediate outbound MB').fill('8');
  await click('Preview impact');
  await page.getByText('1 × REQUIRE_APPROVAL→ALLOW').waitFor();
  await click('Save policy');
  await click('Retry approved destination');
  await click('Try unapproved destination');
  await click('Inspect audit log');
  assert.equal((await call(agent, 'get_workspaces')).jobs.length, 1);
  await page
    .getByText('boundary-destination-unapproved_external', { exact: false })
    .first()
    .waitFor();
  const accent = await page
    .locator('strong')
    .first()
    .evaluate((el) => getComputedStyle(el).color);
  assert.equal(accent, 'rgb(166, 231, 216)');
  await call(agent, 'publish_artifact', {
    workspaceId: job.workspaceId,
    destination: 'internal',
    name: 'external-check',
  });
  await page.getByLabel('Tool or resource').fill('external-check');
  await page
    .locator('summary')
    .filter({ hasText: 'publish_artifact' })
    .first()
    .waitFor({ timeout: 10000 });
  await click('Policies');
  await page.locator('summary').filter({ hasText: 'Version history' }).click();
  await click('Restore revision 1');
  await page.getByText('Revision 3 · Restored', { exact: false }).first().waitFor();
  const restored = await call(admin, 'get_security_snapshot');
  assert.equal(restored.settings.outboundMb, 2);
  assert.equal(restored.history.at(-1).event, 'ROLLBACK');
  await click('Reset team demo');
  await click('Restore fixtures');
  await click('Request 8 MB job');
  assert.equal((await call(admin, 'get_security_snapshot')).approvals.length, 1);
});
