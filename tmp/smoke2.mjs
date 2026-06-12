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
    const orig = chrome.sidePanel.open.bind(chrome.sidePanel);
    chrome.sidePanel.open = (opts) =>
      orig(opts).then(
        (r) => { globalThis.__log.push('open-ok:' + JSON.stringify(opts)); return r; },
        (e) => { globalThis.__log.push('open-err:' + e.message); throw e; },
      );
  });

  const page = await context.newPage();
  page.on('console', (msg) => { if (msg.type() === 'error') console.log('PAGE-ERR:', msg.text().slice(0, 200)); });
  await page.goto('https://arxiv.org/pdf/1706.03762', { waitUntil: 'commit' }).catch(() => {});
  await page.waitForURL(/viewer\.html/, { timeout: 20000 });
  await page.waitForSelector('[data-line-index]', { timeout: 60000 });

  // 找一行有真实文字的行点击
  const line = page.locator('[data-line-index]').filter({ hasText: /attention/i }).first();
  console.log('CLICK TEXT:', (await line.innerText()).slice(0, 80));
  await line.click();
  await page.waitForTimeout(2500);

  console.log('SW LOG:', JSON.stringify(await sw.evaluate(() => globalThis.__log)));
  const contexts = await sw.evaluate(() => chrome.runtime.getContexts({}));
  console.log('CONTEXTS:', JSON.stringify(contexts.map((c) => c.contextType)));
} finally {
  await context.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
