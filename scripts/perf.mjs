import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

/**
 * Замер реальной производительности.
 *
 * По умолчанию браузер запускается headed — только так WebGL идёт через GPU
 * и FPS отражает реальный опыт. Headless-режим (PERF_HEADLESS=1) полезен для
 * проверки сценария, но его FPS не показателен: Chromium рендерит через SwiftShader.
 */

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4174';
const OUT = 'screenshots/perf-report.json';
const HEADLESS = process.env.PERF_HEADLESS === '1';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureServer() {
  try {
    const response = await fetch(BASE, { signal: AbortSignal.timeout(1500) });
    if (response.ok) return null;
  } catch {
    // стартуем собственный preview ниже
  }

  const child = spawn('npm', ['run', 'preview'], {
    stdio: 'ignore',
    detached: false,
    env: process.env,
  });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    await sleep(500);
    try {
      const response = await fetch(BASE, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return child;
    } catch {
      // ждём дальше
    }
  }

  child.kill('SIGTERM');
  throw new Error(`Preview не поднялся на ${BASE}`);
}

const median = (values) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

const percentile = (values, ratio) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
};

const round = (value) => Math.round(value * 100) / 100;

const server = await ensureServer();
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const browser = await chromium.launch({ headless: HEADLESS });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

const consoleErrors = [];
const failedRequests = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
page.on('requestfailed', (request) => {
  const failure = request.failure()?.errorText ?? 'failed';
  // Браузер штатно отменяет фоновую догрузку аудио после чтения метаданных.
  if (request.url().includes('ufo-luv.mp3') && failure === 'net::ERR_ABORTED') return;
  failedRequests.push(`${request.url()} — ${failure}`);
});

const report = {
  generatedAt: new Date().toISOString(),
  mode: HEADLESS ? 'headless (SwiftShader — FPS не показателен)' : 'headed (GPU)',
  viewport: { width: 1440, height: 900 },
  samples: [],
  summary: null,
  visibility: null,
  contextLoss: null,
  consoleErrors,
  failedRequests,
};

let fatal = null;

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('.intro__title');
  await sleep(1500);
  await page.locator('.intro__actions .btn').click();
  await page.waitForSelector('.dock');
  await sleep(4000); // перелёт камеры и прогрев шейдеров

  for (let index = 0; index < 14; index += 1) {
    const stats = await page.evaluate(() => window.__loveUniverse?.stats() ?? null);
    if (stats) report.samples.push({ t: index * 500, ...stats });
    await sleep(500);
  }

  const fps = report.samples.map((sample) => sample.fps).filter((value) => value > 0);
  const calls = report.samples.map((sample) => sample.calls);
  const triangles = report.samples.map((sample) => sample.triangles);
  const last = report.samples.at(-1) ?? null;

  report.summary = {
    fps: {
      median: round(median(fps)),
      average: round(fps.reduce((sum, value) => sum + value, 0) / Math.max(1, fps.length)),
      p10: round(percentile(fps, 0.1)),
      min: Math.min(...fps),
      max: Math.max(...fps),
      samples: fps.length,
    },
    drawCalls: { median: round(median(calls)), max: Math.max(...calls) },
    triangles: { median: Math.round(median(triangles)), max: Math.max(...triangles) },
    memory: last
      ? { geometries: last.geometries, textures: last.textures, programs: last.programs }
      : null,
  };

  // --- Скрытие вкладки: frameloop должен остановиться, кадры — замереть.
  const beforeHide = await page.evaluate(() => window.__loveUniverse?.stats() ?? null);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await sleep(1600);
  const hiddenFirst = await page.evaluate(() => window.__loveUniverse?.stats() ?? null);
  await sleep(900);
  const hiddenSecond = await page.evaluate(() => window.__loveUniverse?.stats() ?? null);
  const frozen =
    !!hiddenFirst &&
    !!hiddenSecond &&
    hiddenFirst.calls === hiddenSecond.calls &&
    hiddenFirst.fps === hiddenSecond.fps;

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await sleep(1200);
  const afterShow = await page.evaluate(() => window.__loveUniverse?.stats() ?? null);

  report.visibility = {
    beforeHide,
    hiddenFirst,
    hiddenSecond,
    afterShow,
    frozenWhileHidden: frozen,
    resumed: !!afterShow && !!beforeHide && afterShow.calls > 0,
  };

  // --- Потеря WebGL-контекста и восстановление.
  await page.evaluate(() => window.__loveUniverse?.loseContext());
  await sleep(700);
  const fallbackVisible = await page
    .locator('.gl-fallback')
    .isVisible()
    .catch(() => false);

  let restored = false;
  if (fallbackVisible) {
    await page.evaluate(() => window.__loveUniverse?.resumeContext());
    await sleep(1400);
    restored = await page
      .locator('.gl-fallback')
      .isVisible()
      .then((visible) => !visible)
      .catch(() => false);
    if (!restored) {
      await page.getByRole('button', { name: 'Перезапустить сцену' }).click();
      await sleep(1800);
      restored = await page
        .locator('.gl-fallback')
        .isVisible()
        .then((visible) => !visible)
        .catch(() => false);
    }
  }

  const afterRestore = await page.evaluate(() => window.__loveUniverse?.stats() ?? null);
  report.contextLoss = {
    fallbackVisible,
    restored,
    afterRestore,
  };

  if (!fallbackVisible) fatal = 'При потере WebGL-контекста не появился запасной экран.';
  else if (!restored) fatal = 'WebGL-контекст не восстановился.';
  else if (report.visibility && !report.visibility.frozenWhileHidden)
    fatal = 'Сцена продолжала рендерить при скрытой вкладке.';
  else if (consoleErrors.length > 0) fatal = 'В консоли есть ошибки.';
  else if (failedRequests.length > 0) fatal = 'Есть упавшие сетевые запросы.';
} catch (error) {
  fatal = error instanceof Error ? error.message : String(error);
} finally {
  await browser.close();
  if (server) server.kill('SIGTERM');
}

report.ok = !fatal;
report.fatal = fatal;
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));

const summary = report.summary;
if (summary) {
  console.log(`Режим: ${report.mode}`);
  console.log(
    `FPS: медиана ${summary.fps.median}, среднее ${summary.fps.average}, p10 ${summary.fps.p10}, min ${summary.fps.min}, max ${summary.fps.max}`,
  );
  console.log(
    `Draw calls: медиана ${summary.drawCalls.median}, максимум ${summary.drawCalls.max}; треугольники: медиана ${summary.triangles.median}`,
  );
  console.log(
    `Память рендера: ${JSON.stringify(summary.memory)}; видимость: ${report.visibility?.frozenWhileHidden ? 'пауза при скрытой вкладке' : 'нет паузы'}; контекст: ${report.contextLoss?.restored ? 'восстановлен' : 'не восстановлен'}`,
  );
}

if (fatal) {
  console.error(`\nПерф-проверка не пройдена: ${fatal}`);
  process.exitCode = 1;
} else {
  console.log(`Отчёт: ${OUT}`);
}
