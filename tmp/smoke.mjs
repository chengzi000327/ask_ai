import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const ext = path.resolve('.output/chrome-mv3');
const profile = fs.mkdtempSync('/tmp/askai-profile-');

const context = await chromium.launchPersistentContext(profile, {
  
  headless: false,
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
});

try {
  // 等 service worker 起来
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker', { timeout: 10000 });
  console.log('SW OK:', sw.url());

  const page = await context.newPage();
  await page.goto('https://arxiv.org/pdf/1706.03762', { waitUntil: 'commit' }).catch(() => {});

  // 断言 1: 重定向到扩展 viewer
  await page.waitForURL(/chrome-extension:.*viewer\.html/, { timeout: 20000 });
  console.log('REDIRECT OK:', page.url());

  // 断言 2: 文本层渲染出可点击的行
  await page.waitForSelector('[data-line-index]', { timeout: 60000 });
  const lineCount = await page.locator('[data-line-index]').count();
  console.log('TEXTLAYER OK, lines:', lineCount);

  // 断言 3: 点击一行 → 侧边栏被打开
  await page.locator('[data-line-index]').nth(20).click();
  await page.waitForTimeout(2500);
  const contexts = await sw.evaluate(() => chrome.runtime.getContexts({}));
  const hasSidePanel = contexts.some((c) => c.contextType === 'SIDE_PANEL');
  console.log(hasSidePanel ? 'SIDEPANEL OK (opened)' : 'SIDEPANEL FAIL: ' + JSON.stringify(contexts.map(c => c.contextType)));

  // 断言 4: 侧边栏里出现翻译卡片（无 key 时应显示错误态而不是无反应）
  const spPage = context.pages().find((p) => p.url().includes('sidepanel.html'));
  if (spPage) {
    await spPage.waitForTimeout(1500);
    const body = await spPage.locator('body').innerText();
    console.log('SIDEPANEL BODY >>>', body.slice(0, 400).replace(/\n+/g, ' | '));
  } else {
    console.log('NOTE: sidepanel page not directly scriptable via Playwright pages()');
  }
} finally {
  await context.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
