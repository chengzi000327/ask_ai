import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ext = path.resolve('.output/chrome-mv3');
const profile = fs.mkdtempSync('/tmp/askai-profile-');
const context = await chromium.launchPersistentContext(profile, {
  headless: false,
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
});
try {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker', { timeout: 10000 });
  await sw.evaluate(() => {
    globalThis.__log = [];
    chrome.runtime.onMessage.addListener((m) => { globalThis.__log.push('msg:' + m.type); });
  });

  const page = await context.newPage();
  await page.goto('https://arxiv.org/html/2605.15777v1#S1', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(1500);
  console.log('CONTENT READY:', await page.evaluate(() => document.documentElement.dataset.askAiContent ?? 'NOT INJECTED'));

  const para = page.locator('article p, main p, p').filter({ hasText: /.{80,}/ }).first();
  console.log('ALT-CLICK PARA:', (await para.innerText()).slice(0, 60));
  await para.click({ modifiers: ['Alt'] });
  await page.waitForTimeout(2000);

  console.log('SW LOG:', JSON.stringify(await sw.evaluate(() => globalThis.__log)));
  const contexts = await sw.evaluate(() => chrome.runtime.getContexts({}));
  console.log('CONTEXTS:', JSON.stringify(contexts.map((c) => c.contextType)));
} finally {
  await context.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
