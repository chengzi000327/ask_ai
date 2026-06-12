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

  const first = await context.newPage();
  first.goto('https://arxiv.org/pdf/1706.03762', { waitUntil: 'commit' }).catch(() => {});

  // 轮询等 viewer 页面出现（tabs.update 重定向会换页面对象）
  let page;
  for (let i = 0; i < 60 && !page; i++) {
    page = context.pages().find((p) => p.url().includes('viewer.html'));
    if (!page) await new Promise((r) => setTimeout(r, 500));
  }
  if (!page) throw new Error('viewer page never appeared');
  page.on('console', (msg) => console.log('PAGE:', msg.text().slice(0, 200)));
  await page.waitForSelector('[data-line-index]', { timeout: 60000 });

  await page.evaluate(() => {
    const orig = chrome.runtime.sendMessage.bind(chrome.runtime);
    chrome.runtime.sendMessage = (...args) => {
      console.log('SENDMSG:', JSON.stringify(args[0]).slice(0, 150));
      return orig(...args);
    };
    document.addEventListener(
      'click',
      (e) => {
        const t = e.target;
        console.log('CLICKTARGET:', t.tagName, 'lineIndex=', t.dataset?.lineIndex ?? t.closest?.('[data-line-index]')?.dataset?.lineIndex ?? 'none');
      },
      true,
    );
  });

  const line = page.locator('[data-line-index]').filter({ hasText: /dominant sequence/i }).first();
  const info = await line.evaluate((el) => ({ idx: el.dataset.lineIndex, text: el.textContent.slice(0, 60) }));
  console.log('TARGET LINE:', JSON.stringify(info));
  await line.click();
  await page.waitForTimeout(2000);
  const contexts = await sw.evaluate(() => chrome.runtime.getContexts({}));
  console.log('CONTEXTS:', JSON.stringify(contexts.map((c) => c.contextType)));
} finally {
  await context.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
