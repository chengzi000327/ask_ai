import { chromium } from 'playwright';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="26" fill="#FAD9C2"/>
  <text x="64" y="91" font-family="Georgia, 'Times New Roman', serif" font-size="80" font-weight="700" text-anchor="middle" fill="#C05621">A</text>
</svg>`;

const browser = await chromium.launch();
const page = await browser.newPage();
for (const s of [16, 32, 48, 128]) {
  await page.setViewportSize({ width: s, height: s });
  await page.setContent(`<style>*{margin:0;padding:0}svg{width:${s}px;height:${s}px;display:block}</style>${svg}`);
  await page.screenshot({ path: `public/icon/${s}.png`, omitBackground: true });
  console.log(`icon ${s}x${s} OK`);
}
await browser.close();
