import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

/**
 * Галерея ключевых сцен: главный экран и обзор вселенной на всех целевых
 * разрешениях, плюс панели, секретное письмо, шёпот и финал на десктопе/мобильном.
 * Подробный геометрический аудит выполняет scripts/audit.mjs.
 */

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4174';
const OUT = 'screenshots/gallery';

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1366', width: 1366, height: 768 },
  { name: 'desktop-1280', width: 1280, height: 800 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-375', width: 375, height: 667 },
  { name: 'mobile-430', width: 430, height: 932 },
  { name: 'tablet-768', width: 768, height: 1024 },
];

const DEEP_DIVE = {
  'desktop-1440': ['love', 'dreams', 'heart', 'secret', 'forever'],
  'mobile-390': ['love', 'secret', 'forever'],
};

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

const server = await ensureServer();
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const shots = [];
const consoleErrors = [];

try {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      hasTouch: viewport.width < 900,
    });
    const page = await context.newPage();
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(`${viewport.name}: ${message.text()}`);
    });
    page.on('pageerror', (error) => consoleErrors.push(`${viewport.name}: ${error.message}`));

    const capture = async (name) => {
      const file = path.join(OUT, `${viewport.name}-${name}.png`);
      await page.screenshot({ path: file });
      shots.push(file);
      return file;
    };

    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForSelector('.intro__title');
    await sleep(1300);
    await capture('intro');

    await page.locator('.intro__actions .btn').click();
    await page.waitForSelector('.dock');
    await sleep(2800);
    await capture('universe');

    for (const id of DEEP_DIVE[viewport.name] ?? []) {
      await page.locator(`[data-planet="${id}"]`).click();
      await page.waitForSelector(`[data-testid="panel-${id}"]`);
      await sleep(1400);

      if (id === 'secret') {
        const hold = page.locator('[data-testid="secret-hold"]');
        const box = await hold.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await sleep(2600);
          await page.mouse.up();
          await sleep(900);
        }
        await capture('secret-letter');
      } else if (id === 'forever') {
        await sleep(1600);
        await capture('final');
      } else {
        await capture(`panel-${id}`);
      }

      if (id !== 'forever') {
        await page.keyboard.press('Escape');
        await sleep(700);
      }
    }

    if (viewport.name === 'desktop-1440') {
      await page.keyboard.press('Escape');
      await page.waitForSelector('.dock');
      await sleep(600);
      await page.locator('.hud__whispers').click();
      await page.waitForSelector('[data-testid="whispers-panel"]');
      await sleep(900);
      await page.locator('.whisper-list__item').first().click();
      await page.waitForSelector('[data-testid="whisper-card"]');
      await sleep(900);
      await capture('whisper-card');
    }

    await context.close();
  }
} finally {
  await browser.close();
  if (server) server.kill('SIGTERM');
}

const manifest = { generatedAt: new Date().toISOString(), shots, consoleErrors };
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));

if (consoleErrors.length > 0) {
  console.error(`Скриншоты сняты, но в консоли есть ошибки (${consoleErrors.length}):`);
  for (const error of consoleErrors.slice(0, 10)) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Готово: ${shots.length} скриншотов в ${OUT}`);
  console.log(`Манифест: ${path.join(OUT, 'manifest.json')}`);
}
