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
    globalThis.__reqs = [];
    chrome.runtime.onMessage.addListener((m) => {
      if (m.type === 'TRANSLATE_REQUEST') globalThis.__reqs.push(m.text.slice(0, 50));
    });
  });

  const first = await context.newPage();
  first.goto('https://arxiv.org/pdf/1706.03762', { waitUntil: 'commit' }).catch(() => {});
  let page;
  for (let i = 0; i < 50 && !page; i++) {
    page = context.pages().find((p) => p.url().includes('viewer.html'));
    if (!page) await new Promise((r) => setTimeout(r, 500));
  }
  await page.waitForSelector('[data-line-index]', { timeout: 60000 });
  await page.waitForTimeout(1000);

  // 场景A: 同一行内拖拽划选
  const span = page.locator('[data-line-index]').filter({ hasText: /dominant sequence/i }).first();
  const box = await span.boundingBox();
  await page.mouse.move(box.x + 5, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(1200);
  let reqs = await sw.evaluate(() => globalThis.__reqs.splice(0));
  console.log('A 同行内划选 -> 请求数:', reqs.length, JSON.stringify(reqs));

  // 场景B: 跨两行拖拽划选
  const spans = page.locator('[data-line-index]');
  const b1 = await spans.nth(40).boundingBox();
  const b2 = await spans.nth(42).boundingBox();
  await page.mouse.move(b1.x + 5, b1.y + b1.height / 2);
  await page.mouse.down();
  await page.mouse.move(b2.x + b2.width * 0.5, b2.y + b2.height / 2, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(1200);
  reqs = await sw.evaluate(() => globalThis.__reqs.splice(0));
  console.log('B 跨行划选 -> 请求数:', reqs.length, JSON.stringify(reqs));

  // 场景C: 划选后在空白处点击取消选择
  await page.mouse.click(b1.x - 30, b1.y);
  await page.waitForTimeout(800);
  reqs = await sw.evaluate(() => globalThis.__reqs.splice(0));
  console.log('C 点击空白取消选择 -> 请求数:', reqs.length, JSON.stringify(reqs));
} finally {
  await context.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
