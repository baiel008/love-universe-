import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4174';
const OUT = 'screenshots';
const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1366', width: 1366, height: 768 },
  { name: 'desktop-1280', width: 1280, height: 800 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-375', width: 375, height: 667 },
  { name: 'mobile-430', width: 430, height: 932 },
  { name: 'tablet-768', width: 768, height: 1024 },
];

const failures = [];
const report = { viewports: [], generatedAt: new Date().toISOString() };

const check = (name, condition, detail = '') => {
  if (condition) return true;
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  return false;
};

const normalize = (value) => (value ?? '').replace(/\s+/g, ' ').trim();

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
    await new Promise((resolve) => setTimeout(resolve, 500));
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

async function layoutSnapshot(page) {
  return page.evaluate(() => {
    const round = (value) => Math.round(value * 10) / 10;
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return {
        x: round(box.x),
        y: round(box.y),
        right: round(box.right),
        bottom: round(box.bottom),
        width: round(box.width),
        height: round(box.height),
      };
    };
    const inside = (box) =>
      !!box &&
      box.x >= -1 &&
      box.y >= -1 &&
      box.right <= window.innerWidth + 1 &&
      box.bottom <= window.innerHeight + 1;
    const style = (selector) => {
      const element = document.querySelector(selector);
      return element ? getComputedStyle(element) : null;
    };

    return {
      stage: document.querySelector('.app')?.getAttribute('data-stage') ?? null,
      active: document.querySelector('.app')?.getAttribute('data-active') ?? null,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      document: {
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        overflowY: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      },
      fonts: document.fonts?.status ?? 'unknown',
      boxes: {
        hud: rect('.hud__bar'),
        brand: rect('.brand'),
        player: rect('.player'),
        audioToggle: rect('[data-testid="audio-toggle"]'),
        whispers: rect('.hud__whispers'),
        dock: rect('.dock'),
        hint: rect('.scene-hint'),
        intro: rect('.intro__inner'),
        introEyebrow: rect('.intro__eyebrow'),
        introTitle: rect('.intro__title'),
        introSubtitle: rect('.intro__subtitle'),
        introCta: rect('.intro__actions .btn'),
        panel: rect('.panel'),
        panelHead: rect('.panel__head'),
        panelScroll: rect('.panel__scroll'),
        panelClose: rect('.panel__close'),
        whisper: rect('.whisper'),
        whisperClose: rect('.whisper__close'),
        finalQuote: rect('.final__quote p'),
      },
      inside: {
        intro: inside(rect('.intro__inner')),
        introCta: inside(rect('.intro__actions .btn')),
        hud: inside(rect('.hud__bar')),
        dock: inside(rect('.dock')),
        panel: inside(rect('.panel')),
        whisper: inside(rect('.whisper')),
      },
      dockHeight: document.querySelector('.dock__button')?.getBoundingClientRect().height ?? null,
      dockOverflow: (() => {
        const dock = document.querySelector('.dock');
        return dock ? dock.scrollWidth - dock.clientWidth : 0;
      })(),
      panelScroll: (() => {
        const area = document.querySelector('.panel__scroll');
        return area
          ? {
              clientHeight: area.clientHeight,
              scrollHeight: area.scrollHeight,
              clientWidth: area.clientWidth,
              scrollWidth: area.scrollWidth,
            }
          : null;
      })(),
      tinyTargets: (() => {
        const mobile = window.innerWidth < 900;
        if (!mobile) return [];
        return [...document.querySelectorAll('button, [role="button"], input, a[href]')]
          .filter((element) => {
            const box = element.getBoundingClientRect();
            const css = getComputedStyle(element);
            return (
              box.width > 0 &&
              box.height > 0 &&
              box.bottom > 0 &&
              box.top < window.innerHeight &&
              box.right > 0 &&
              box.left < window.innerWidth &&
              css.visibility !== 'hidden' &&
              css.display !== 'none' &&
              (box.width < 44 || box.height < 44)
            );
          })
          .map((element) => {
            const box = element.getBoundingClientRect();
            return {
              label: (element.getAttribute('aria-label') || element.textContent || element.tagName)
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 48),
              width: Math.round(box.width),
              height: Math.round(box.height),
            };
          })
          .slice(0, 8);
      })(),
      horizontalOverflow: (() => {
        const scope =
          document.querySelector('.panel__scroll') ??
          document.querySelector('.intro') ??
          document.body;
        return [...scope.querySelectorAll('*')]
          .filter((element) => {
            const css = getComputedStyle(element);
            const box = element.getBoundingClientRect();
            return (
              box.width > 0 &&
              css.visibility !== 'hidden' &&
              css.display !== 'none' &&
              element.scrollWidth > element.clientWidth + 1 &&
              (css.overflowX === 'visible' || css.overflowX === 'clip')
            );
          })
          .map((element) => ({
            tag: element.tagName,
            className: typeof element.className === 'string' ? element.className.slice(0, 60) : '',
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
          }))
          .slice(0, 8);
      })(),
      stats: window.__loveUniverse?.stats?.() ?? null,
      audioStatus: document.querySelector('[data-testid="audio-status"]')?.textContent ?? null,
      audioDisabled: document.querySelector('[data-testid="audio-toggle"]')?.disabled ?? null,
      statsNote: (() => {
        const player = document.querySelector('[data-testid="audio-player"]');
        return player?.className ?? null;
      })(),
      title: document.title,
      styles: {
        introTitleFamily: style('.intro__title')?.fontFamily ?? null,
        introTitleSize: style('.intro__title')?.fontSize ?? null,
        panelTitleSize: style('.panel__title')?.fontSize ?? null,
        bodyOverflow: style('body')?.overflow ?? null,
      },
    };
  });
}

async function openPanel(page, id) {
  await page.locator(`[data-planet="${id}"]`).click();
  await page.waitForSelector(`[data-testid="panel-${id}"]`, { timeout: 6000 });
  await page.waitForTimeout(850);
  return page.locator(`[data-testid="panel-${id}"]`);
}

async function closePanel(page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(750);
}

const server = await ensureServer();
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const errors = [];

try {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      hasTouch: viewport.width < 900,
    });
    const page = await context.newPage();
    const consoleErrors = [];
    const failedRequests = [];
    const requestedAudio = [];

    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
    page.on('requestfailed', (request) => {
      const failure = request.failure()?.errorText ?? 'failed';
      // Chromium получает метаданные из range-запроса и сразу отменяет
      // фоновую догрузку 11-МБ файла — это не ошибка плеера.
      if (request.url().includes('ufo-luv.mp3') && failure === 'net::ERR_ABORTED') return;
      failedRequests.push(`${request.url()} — ${failure}`);
    });
    page.on('request', (request) => {
      if (request.url().includes('ufo-luv.mp3')) requestedAudio.push(request.url());
    });

    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForSelector('.intro__title');
    await page.waitForTimeout(1400);

    const intro = await layoutSnapshot(page);
    const prefix = viewport.name;

    check(
      `${prefix}: стартовый экран`,
      intro.stage === 'intro' && intro.inside.intro,
      JSON.stringify(intro.boxes.intro),
    );
    check(
      `${prefix}: нет горизонтального скролла на старте`,
      intro.document.overflowX <= 0,
      String(intro.document.overflowX),
    );
    check(
      `${prefix}: CTA внутри экрана`,
      intro.inside.introCta,
      JSON.stringify(intro.boxes.introCta),
    );
    check(
      `${prefix}: CTA не меньше 44px`,
      (intro.boxes.introCta?.height ?? 0) >= 44,
      String(intro.boxes.introCta?.height),
    );
    check(
      `${prefix}: заголовок не обрезан`,
      !!intro.boxes.introTitle && intro.boxes.introTitle.height > 40,
      JSON.stringify(intro.boxes.introTitle),
    );
    check(
      `${prefix}: HUD не перекрывает заголовок`,
      !intro.boxes.hud ||
        !intro.boxes.introEyebrow ||
        intro.boxes.hud.bottom <= intro.boxes.introEyebrow.y + 1,
      `hud ${intro.boxes.hud?.bottom} / eyebrow ${intro.boxes.introEyebrow?.y}`,
    );
    check(`${prefix}: шрифты загружены`, intro.fonts === 'loaded', intro.fonts);
    check(
      `${prefix}: аудиофайл подключён к плееру`,
      intro.audioDisabled === false &&
        /Готов к воспроизведению|Загрузка трека|Пауза/.test(intro.audioStatus ?? ''),
      `${intro.audioDisabled} / ${intro.audioStatus}`,
    );
    check(
      `${prefix}: браузер запрашивает mp3`,
      requestedAudio.length > 0,
      requestedAudio.join(', '),
    );
    check(
      `${prefix}: стартовый экран без переполнений`,
      intro.horizontalOverflow.length === 0,
      JSON.stringify(intro.horizontalOverflow),
    );

    await page.screenshot({ path: path.join(OUT, `intro-${prefix}.png`) });

    await page.locator('.intro__actions .btn').click();
    await page.waitForTimeout(2500);

    const universe = await layoutSnapshot(page);
    check(
      `${prefix}: переход во вселенную`,
      universe.stage === 'universe' && !!universe.boxes.dock,
      universe.stage,
    );
    check(
      `${prefix}: док внутри экрана`,
      universe.inside.dock,
      JSON.stringify(universe.boxes.dock),
    );
    check(
      `${prefix}: что-то реально отрисовано в 3D`,
      (universe.stats?.triangles ?? 0) > 1000,
      JSON.stringify(universe.stats),
    );
    check(
      `${prefix}: подсказка не пересекает док`,
      !universe.boxes.hint ||
        !universe.boxes.dock ||
        universe.boxes.hint.bottom <= universe.boxes.dock.y + 1,
    );
    check(
      `${prefix}: нет горизонтального скролла во вселенной`,
      universe.document.overflowX <= 0,
      String(universe.document.overflowX),
    );
    check(
      `${prefix}: нет переполнения дока`,
      (universe.dockOverflow ?? 0) <= 0,
      String(universe.dockOverflow),
    );
    check(
      `${prefix}: тач-цели в HUD и доке ≥44`,
      universe.tinyTargets.length === 0,
      JSON.stringify(universe.tinyTargets),
    );
    check(`${prefix}: нет ошибок консоли`, consoleErrors.length === 0, consoleErrors.join(' | '));
    check(
      `${prefix}: нет упавших запросов`,
      failedRequests.length === 0,
      failedRequests.join(' | '),
    );

    await page.screenshot({ path: path.join(OUT, `universe-${prefix}.png`) });

    const panelResults = {};

    for (const id of ['love', 'dreams', 'heart', 'secret', 'forever']) {
      await openPanel(page, id);
      const panel = await layoutSnapshot(page);
      const scroll = panel.panelScroll;

      check(`${prefix}/${id}: панель открыта`, panel.active === id, panel.active);
      check(
        `${prefix}/${id}: панель внутри экрана`,
        panel.inside.panel,
        JSON.stringify(panel.boxes.panel),
      );
      check(
        `${prefix}/${id}: нет горизонтального переполнения панели`,
        (scroll?.scrollWidth ?? 0) <= (scroll?.clientWidth ?? 0) + 1,
        JSON.stringify(scroll),
      );
      check(
        `${prefix}/${id}: панель прокручивается при необходимости`,
        !!scroll,
        JSON.stringify(scroll),
      );
      check(
        `${prefix}/${id}: тач-цели ≥44`,
        panel.tinyTargets.length === 0,
        JSON.stringify(panel.tinyTargets),
      );
      check(
        `${prefix}/${id}: шапка панели на месте`,
        !!panel.boxes.panelHead && panel.boxes.panelHead.height >= 44,
        JSON.stringify(panel.boxes.panelHead),
      );

      if (id === 'love') {
        const count = await page.locator('.love-list__item').count();
        check(`${prefix}/love: пять признаний`, count === 5, String(count));
      }
      if (id === 'dreams') {
        const count = await page.locator('.dream').count();
        check(`${prefix}/dreams: пять мечт`, count === 5, String(count));
      }
      if (id === 'heart') {
        const quote = normalize(await page.locator('.heart-quote').textContent());
        check(`${prefix}/heart: текст пульса`, quote.length > 10, quote);
      }
      if (id === 'secret') {
        const hold = page.locator('[data-testid="secret-hold"]');
        check(`${prefix}/secret: ритуал удержания`, (await hold.count()) === 1);
        const box = await hold.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          // Порог удержания — 1.6 c. В headless-режиме rAF идёт редко,
          // поэтому держим с запасом, чтобы хотя бы один кадр пересёк порог.
          await page.waitForTimeout(2600);
          await page.mouse.up();
          await page.waitForTimeout(700);
        }
        const letter = page.locator('[data-testid="secret-letter"]');
        check(`${prefix}/secret: письмо открылось`, (await letter.count()) === 1);
        if ((await letter.count()) === 1) {
          const text = normalize(await letter.textContent());
          check(
            `${prefix}/secret: письмо содержит подпись`,
            text.includes('всегда твой'),
            text.slice(0, 80),
          );
          const letterBox = await letter.boundingBox();
          check(
            `${prefix}/secret: письмо в пределах панели`,
            !!letterBox && letterBox.width > 200,
            JSON.stringify(letterBox),
          );
        }
        await page.screenshot({ path: path.join(OUT, `secret-open-${prefix}.png`) });
      }
      if (id === 'forever') {
        const text = normalize(await page.locator('.final__quote p').textContent());
        const exact = 'Среди бесконечности миров есть один, который всегда будет особенным';
        check(`${prefix}/forever: точная финальная строка`, text === exact, text);
        check(
          `${prefix}/forever: финальная сцена на весь экран`,
          (panel.boxes.panel?.width ?? 0) >= viewport.width - 1,
          JSON.stringify(panel.boxes.panel),
        );
        check(
          `${prefix}/forever: нет обрезанного заголовка`,
          !!panel.boxes.finalQuote,
          JSON.stringify(panel.boxes.finalQuote),
        );
        await page.screenshot({ path: path.join(OUT, `final-${prefix}.png`) });
        await page
          .locator('[data-testid="panel-forever"]')
          .getByRole('button', { name: 'ко всем планетам' })
          .click();
        await page.waitForTimeout(900);
        const afterFinal = await layoutSnapshot(page);
        check(
          `${prefix}/forever: возврат к обзору`,
          afterFinal.active === 'none' && !!afterFinal.boxes.dock,
          afterFinal.active,
        );
        continue;
      }

      await page.screenshot({ path: path.join(OUT, `panel-${id}-${prefix}.png`) });
      panelResults[id] = { box: panel.boxes.panel, scroll, tinyTargets: panel.tinyTargets.length };
      await closePanel(page);
    }

    // Шёпот сердец через HUD — доступная альтернатива клику по 3D.
    await page.locator('.hud__whispers').click();
    await page.waitForSelector('[data-testid="whispers-panel"]');
    await page.waitForTimeout(500);
    const whisperItems = await page.locator('.whisper-list__item').count();
    check(`${prefix}: список шёпота`, whisperItems >= 7, String(whisperItems));
    await page.locator('.whisper-list__item').first().click();
    await page.waitForSelector('[data-testid="whisper-card"]');
    const whisperText = normalize(await page.locator('.whisper__text').textContent());
    check(`${prefix}: карточка шёпота`, whisperText.length > 8, whisperText);
    const whisperSnapshot = await layoutSnapshot(page);
    check(
      `${prefix}: карточка шёпота внутри экрана`,
      whisperSnapshot.inside.whisper,
      JSON.stringify(whisperSnapshot.boxes.whisper),
    );
    await page.screenshot({ path: path.join(OUT, `whisper-${prefix}.png`) });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Финальный рестарт возвращает на главный экран.
    await openPanel(page, 'forever');
    await page
      .locator('[data-testid="panel-forever"]')
      .getByRole('button', { name: 'вернуться в начало' })
      .click();
    await page.waitForTimeout(1100);
    const restarted = await layoutSnapshot(page);
    check(
      `${prefix}: рестарт возвращает на главный экран`,
      restarted.stage === 'intro' && restarted.inside.intro,
      restarted.stage,
    );

    report.viewports.push({
      viewport,
      intro: { boxes: intro.boxes, fonts: intro.fonts },
      universe: {
        boxes: universe.boxes,
        stats: universe.stats,
        tinyTargets: universe.tinyTargets,
      },
      panels: panelResults,
      consoleErrors,
      failedRequests,
    });

    await context.close();
  }
} finally {
  await browser.close();
  if (server) server.kill('SIGTERM');
}

report.failures = failures;
report.errors = errors;
fs.writeFileSync(path.join(OUT, 'audit-report.json'), JSON.stringify(report, null, 2));

if (failures.length > 0) {
  console.error(`\nАудит нашёл ${failures.length} проблем:\n`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Аудит пройден: ${VIEWPORTS.length} разрешений, все проверки зелёные.`);
  console.log(`Отчёт: ${path.join(OUT, 'audit-report.json')}`);
}
