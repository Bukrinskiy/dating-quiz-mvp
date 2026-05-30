import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT_ROOT = path.resolve(ROOT, "../docs/quiz-parity-shots");
const LOCAL_BASE = "http://127.0.0.1:4173";
const SOURCE_BASE = "https://ru.flirtist.ai";
const QUIZ_ROUTE_LOCAL = "/quiz";
const QUIZ_ROUTE_SOURCE = "/main/a/quiz";
const SESSION_UUID = "11111111-2222-4333-8444-555555555555";

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844, deviceScaleFactor: 1 },
  { name: "desktop", width: 1280, height: 800, deviceScaleFactor: 1 },
];
const TARGETS = ["local", "source"];
const EXTRA_SHOTS = ["email", "checkout-main", "checkout-popup"];

const quizSteps = [
  { shot: "q01", type: "single-selection-with-image", pick: "Серьёзные отношения" },
  { shot: "q02", type: "single", pick: "18 - 24" },
  { shot: "q03", type: "single-selection-with-svg", pick: "Интроверт" },
  { shot: "q04", type: "single", pick: "Только начинаю" },
  { shot: "q05", type: "prompt" },
  { shot: "q06", type: "multiple", pick: "Секреты привлекательности" },
  { shot: "q07", type: "prompt" },
  { shot: "q08", type: "rate" },
  { shot: "q09", type: "rate" },
  { shot: "q10", type: "slide" },
  { shot: "q11", type: "prompt" },
  { shot: "q12", type: "rate" },
  { shot: "q13", type: "single-selection-with-svg", pick: "Не уверен" },
  { shot: "q14", type: "single-selection-with-svg", pick: "Сразу же" },
  { shot: "q15", type: "prompt" },
  { shot: "q16", type: "single-selection-with-svg", pick: "Да" },
  { shot: "q17", type: "rate" },
  { shot: "q18", type: "single-selection-with-svg", pick: "Да" },
  { shot: "q19", type: "single-selection-with-svg", pick: "Да" },
  { shot: "q20", type: "prompt" },
  { shot: "q21", type: "slide" },
  { shot: "q22", type: "prompt" },
  { shot: "q23", type: "single-selection-with-svg", pick: "< 5 минут/день" },
  { shot: "q24", type: "prompt" },
  { shot: "q25", type: "calculating" },
  { shot: "q26", type: "result" },
];

const disableAnimationsCss = `
*,
*::before,
*::after {
  transition: none !important;
  animation: none !important;
  caret-color: transparent !important;
}
`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseCsvArg = (name) => {
  const prefix = `--${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix));
  if (!raw) return null;
  return raw
    .slice(prefix.length)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
};

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const waitForServer = async (url, attempts = 60) => {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status < 500) {
        return;
      }
    } catch {
      // retry
    }
    await sleep(500);
  }
  throw new Error(`Server did not start in time: ${url}`);
};

const startLocalPreview = () => {
  const child = spawn("pnpm", ["preview", "--host", "127.0.0.1", "--port", "4173"], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  return child;
};

const withApiMocks = async (page) => {
  await page.route("**/api/session/get-plan-data", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        uuid: SESSION_UUID,
        locale: "ru",
        currency: "usd",
        email: "",
        plans: [
          {
            code: "sub_weekly",
            headline: "План на 7 дней",
            billing_period: "week",
            interval_unit: "week",
            interval_count: 1,
            price: { amount_minor: 1050, currency: "usd" },
            compare_at_price: { amount_minor: 4347, currency: "usd" },
            per_day_price: { amount_minor: 150, currency: "usd" },
            compare_at_per_day_price: { amount_minor: 621, currency: "usd" },
            badge: null,
            is_default: false,
            is_highlighted: false,
          },
          {
            code: "sub_monthly",
            headline: "План на 1 месяц",
            billing_period: "month",
            interval_unit: "month",
            interval_count: 1,
            price: { amount_minor: 1999, currency: "usd" },
            compare_at_price: { amount_minor: 4347, currency: "usd" },
            per_day_price: { amount_minor: 64, currency: "usd" },
            compare_at_per_day_price: { amount_minor: 140, currency: "usd" },
            badge: "Самый популярный",
            is_default: true,
            is_highlighted: true,
          },
          {
            code: "sub_yearly",
            headline: "План на 3 месяца",
            billing_period: "year",
            interval_unit: "month",
            interval_count: 12,
            price: { amount_minor: 3499, currency: "usd" },
            compare_at_price: { amount_minor: 8695, currency: "usd" },
            per_day_price: { amount_minor: 38, currency: "usd" },
            compare_at_per_day_price: { amount_minor: 93, currency: "usd" },
            badge: null,
            is_default: false,
            is_highlighted: false,
          },
        ],
      }),
    });
  });

  await page.route("**/api/session/update-email", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.route("**/api/session/get-currency2", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ currency: "usd", locale: "ru" }),
    });
  });

  await page.route("**/api/session/create-payment-intent", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        order_id: "order_test",
        client_secret: "pi_test_client_secret",
        customer_id: "cus_test",
        publishable_key: "pk_test_dummy",
      }),
    });
  });

  await page.route("**/api/payment/plans**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
};

const waitStable = async (page) => {
  await page.waitForLoadState("domcontentloaded");
  await sleep(250);
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
};

const waitVisualReady = async (page) => {
  // Ensure fonts and visible images are rendered before taking screenshots.
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page
    .evaluate(async () => {
      try {
        if (document.fonts?.ready) {
          await document.fonts.ready;
        }
      } catch {
        // ignore font readiness errors
      }
    })
    .catch(() => undefined);

  await page
    .waitForFunction(() => {
      const isVisible = (el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 8 && rect.height > 8 && style.visibility !== "hidden" && style.display !== "none";
      };

      const imgs = Array.from(document.querySelectorAll("img")).filter(isVisible);
      if (imgs.length === 0) return true;
      return imgs.every((img) => img.complete && img.naturalWidth > 0);
    }, { timeout: 20000 })
    .catch(() => undefined);

  await sleep(350);
};

const clickByText = async (page, text) => {
  const exact = page.getByRole("button", { name: text, exact: true }).first();
  if (await exact.isVisible().catch(() => false)) {
    await exact.click();
    return true;
  }
  const fuzzy = page.getByRole("button", { name: new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }).first();
  if (await fuzzy.isVisible().catch(() => false)) {
    await fuzzy.click();
    return true;
  }
  return false;
};

const clickByVisibleText = async (page, text) => {
  const locator = page.getByText(new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).first();
  if (await locator.isVisible().catch(() => false)) {
    await locator.click({ force: true });
    return true;
  }
  return false;
};

const clickHeuristicChoice = async (page) => {
  return page.evaluate(() => {
    const isVisible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 40 && rect.height > 20 && style.visibility !== "hidden" && style.display !== "none";
    };
    const skip = /(назад|back|продолжить|continue|получить|assistant|ассистент)/i;
    const buttons = Array.from(document.querySelectorAll("main button"));
    for (const btn of buttons) {
      if (!isVisible(btn)) continue;
      const text = (btn.textContent || "").trim();
      if (skip.test(text)) continue;
      btn.click();
      return true;
    }
    return false;
  });
};

const clickContinue = async (page) => {
  const variants = ["Продолжить", "Continue"];
  for (const label of variants) {
    const locator = page.getByRole("button", { name: new RegExp(label, "i") }).last();
    if (await locator.isVisible().catch(() => false)) {
      await locator.click();
      return;
    }
  }
  throw new Error("Continue button not found");
};

const clickRate = async (page) => {
  const localRates = page.locator("button.flirt-quiz__rate");
  const localCount = await localRates.count();
  if (localCount >= 3) {
    await localRates.nth(2).click();
    return;
  }

  const allIconButtons = page.locator("main button:has(img)");
  const count = await allIconButtons.count();
  if (count >= 3) {
    // Skip "back" by trying the middle icon button.
    await allIconButtons.nth(Math.floor(count / 2)).click();
    return;
  }

  throw new Error("Rate buttons not found");
};

const doStepTransition = async (page, step) => {
  switch (step.type) {
    case "single":
    case "single-selection-with-image":
    case "single-selection-with-svg": {
      if (step.pick && (await clickByText(page, step.pick))) return;
      if (step.pick && (await clickByVisibleText(page, step.pick))) return;
      if (await clickHeuristicChoice(page)) return;
      const imageInCard = page.locator("main img").nth(2);
      if (await imageInCard.isVisible().catch(() => false)) {
        await imageInCard.click({ force: true });
        return;
      }
      break;
    }
    case "multiple": {
      if (step.pick) {
        await clickByText(page, step.pick);
      }
      await clickContinue(page);
      return;
    }
    case "rate": {
      await clickRate(page);
      return;
    }
    case "slide": {
      const slider = page.locator("input[type='range']").first();
      if (await slider.isVisible().catch(() => false)) {
        await slider.fill("3");
      }
      await clickContinue(page);
      return;
    }
    case "prompt": {
      await clickContinue(page);
      return;
    }
    case "calculating":
    case "result":
    default:
      return;
  }

  // Fallback for non-localized/edge buttons.
  const imageChoice = page.locator(".flirt-quiz__choice--image").first();
  if (await imageChoice.isVisible().catch(() => false)) {
    await imageChoice.click();
    return;
  }
  const anyChoice = page.locator("main button").first();
  if (await anyChoice.isVisible().catch(() => false)) {
    await anyChoice.click();
    return;
  }
  throw new Error(`Could not transition step: ${step.shot}`);
};

const captureQuizSequence = async (page, outputDir, quizUrl, options) => {
  const { requestedQuizShots, stopAfterStepIndex } = options;
  if (quizUrl.startsWith(LOCAL_BASE)) {
    await page.addInitScript(() => {
      try {
        localStorage.removeItem("new_quiz_answers");
        sessionStorage.removeItem("quiz_session_uuid");
      } catch {
        // ignore storage access errors
      }
    });
  }
  await page.goto(quizUrl, { waitUntil: "domcontentloaded" });
  await page.addStyleTag({ content: disableAnimationsCss });
  await waitStable(page);

  for (let idx = 0; idx < quizSteps.length; idx += 1) {
    const step = quizSteps[idx];
    if (requestedQuizShots.has(step.shot)) {
      const outPath = path.join(outputDir, `${step.shot}.png`);
      await waitVisualReady(page);
      await page.mouse.move(1, 1).catch(() => undefined);
      await page.screenshot({ path: outPath, fullPage: true });
    }

    if (idx >= stopAfterStepIndex || step.type === "result") {
      break;
    }

    if (step.type === "calculating") {
      // Source/local calculating auto-advances; result CTA copy can vary slightly.
      await page
        .waitForFunction(() => {
          const text = document.body?.innerText ?? "";
          return /Получить моего|Get my AI|Персональный AI|Personal AI|Ваш персональный/i.test(text);
        }, { timeout: 30000 })
        .catch(() => undefined);
      await waitStable(page);
      continue;
    }

    await doStepTransition(page, step);
    await waitStable(page);
  }
};

const captureEmailAndCheckout = async (page, outputDir, isSource, requestedExtraShots) => {
  const emailPath = isSource ? `${SOURCE_BASE}/main/a/email/${SESSION_UUID}` : `${LOCAL_BASE}/quiz/email/${SESSION_UUID}`;
  const checkoutPath = isSource ? `${SOURCE_BASE}/main/a/checkout/${SESSION_UUID}` : `${LOCAL_BASE}/quiz/checkout/${SESSION_UUID}`;

  if (requestedExtraShots.has("email")) {
    await page.goto(emailPath, { waitUntil: "domcontentloaded" });
    await page.addStyleTag({ content: disableAnimationsCss });
    await waitStable(page);
    await waitVisualReady(page);
    await page.screenshot({ path: path.join(outputDir, "email.png"), fullPage: true });
  }

  if (requestedExtraShots.has("checkout-main") || requestedExtraShots.has("checkout-popup")) {
    await page.goto(checkoutPath, { waitUntil: "domcontentloaded" });
    await waitStable(page);
    await waitVisualReady(page);
  }

  if (requestedExtraShots.has("checkout-main")) {
    await page.screenshot({ path: path.join(outputDir, "checkout-main.png"), fullPage: true });
  }

  if (requestedExtraShots.has("checkout-popup")) {
    const openButton = page.getByRole("button", { name: /Получить моего персонального ассистента|Get my personal AI/i }).first();
    if (await openButton.isVisible().catch(() => false)) {
      await openButton.click();
      await waitStable(page);
    }
    await waitVisualReady(page);
    await page.screenshot({ path: path.join(outputDir, "checkout-popup.png"), fullPage: true });
  }
};

const run = async () => {
  await ensureDir(OUT_ROOT);
  const requestedNames = parseCsvArg("steps");
  const requestedViewports = new Set(parseCsvArg("viewports") ?? VIEWPORTS.map((v) => v.name));
  const requestedTargets = new Set(parseCsvArg("targets") ?? TARGETS);

  const requestedQuizShots = new Set((requestedNames ?? quizSteps.map((s) => s.shot)).filter((n) => /^q\d{2}$/.test(n)));
  const requestedExtraShots = new Set((requestedNames ?? EXTRA_SHOTS).filter((n) => EXTRA_SHOTS.includes(n)));

  const requestedQuizIndexes = quizSteps
    .map((s, idx) => ({ shot: s.shot, idx }))
    .filter((s) => requestedQuizShots.has(s.shot))
    .map((s) => s.idx);
  const stopAfterStepIndex = requestedQuizIndexes.length > 0 ? Math.max(...requestedQuizIndexes) : -1;

  const preview = startLocalPreview();
  try {
    await waitForServer(`${LOCAL_BASE}/quiz`);
    const browser = await chromium.launch({ headless: true });

    try {
      for (const vp of VIEWPORTS) {
        if (!requestedViewports.has(vp.name)) continue;
        for (const target of TARGETS) {
          if (!requestedTargets.has(target)) continue;
          const outDir = path.join(OUT_ROOT, vp.name, target);
          await ensureDir(outDir);

          const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            deviceScaleFactor: vp.deviceScaleFactor,
          });
          const page = await context.newPage();
          await withApiMocks(page);

          const quizUrl = target === "local" ? `${LOCAL_BASE}${QUIZ_ROUTE_LOCAL}` : `${SOURCE_BASE}${QUIZ_ROUTE_SOURCE}`;
          if (stopAfterStepIndex >= 0) {
            await captureQuizSequence(page, outDir, quizUrl, { requestedQuizShots, stopAfterStepIndex });
          }
          if (requestedExtraShots.size > 0) {
            await captureEmailAndCheckout(page, outDir, target === "source", requestedExtraShots);
          }

          await context.close();
        }
      }
    } finally {
      await browser.close();
    }
  } finally {
    preview.kill("SIGTERM");
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
