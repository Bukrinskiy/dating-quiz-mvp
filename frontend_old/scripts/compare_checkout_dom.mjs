import { chromium } from 'playwright';

const sourceUrl = 'https://ru.flirtist.ai/main/a/checkout/8bd5c071-bf37-4d26-a3fe-0fea9276e8a6';
const localUrl = 'http://localhost:5173/quiz/checkout/0504a820-db9b-4d66-ab03-ab57f85e7dc6';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 430, height: 932 } });

async function snap(url, outPrefix) {
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(6000);
  await page.evaluate(() => window.scrollTo(0, 0));
  const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 4000) || '');
  const mainHtml = await page.evaluate(() => {
    const root = document.querySelector('main') || document.body;
    if (!root) return '';
    const clone = root.cloneNode(true);
    return clone.outerHTML.slice(0, 30000);
  });
  console.log('\n===', outPrefix, 'TEXT===\n');
  console.log(bodyText);
  console.log('\n===', outPrefix, 'MAIN HTML (truncated)===' );
  console.log(mainHtml);
  await page.close();
}

await snap(sourceUrl, 'SOURCE');
await snap(localUrl, 'LOCAL');

await browser.close();
