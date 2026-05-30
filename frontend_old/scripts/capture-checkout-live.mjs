import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

const localUrl = 'http://localhost:5173/quiz/checkout/0504a820-db9b-4d66-ab03-ab57f85e7dc6';
const sourceUrl = 'https://ru.flirtist.ai/main/a/checkout/8bd5c071-bf37-4d26-a3fe-0fea9276e8a6';

const out = {
  localMain: path.resolve(scriptDir, '../../docs/quiz-parity-shots/mobile/local/checkout-main-live.png'),
  localPopup: path.resolve(scriptDir, '../../docs/quiz-parity-shots/mobile/local/checkout-popup-live.png'),
  sourceMain: path.resolve(scriptDir, '../../docs/quiz-parity-shots/mobile/source/checkout-main-live.png'),
  sourcePopup: path.resolve(scriptDir, '../../docs/quiz-parity-shots/mobile/source/checkout-popup-live.png'),
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });

async function capture(url, mainPath, popupPath) {
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(6500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  await page.screenshot({ path: mainPath, fullPage: true });

  const btn = page.locator('button:has-text("Получить моего персонального ассистента по знакомствам")').first();
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(1800);
    await page.screenshot({ path: popupPath, fullPage: true });
  }

  await page.close();
}

await capture(localUrl, out.localMain, out.localPopup);
await capture(sourceUrl, out.sourceMain, out.sourcePopup);

await browser.close();
