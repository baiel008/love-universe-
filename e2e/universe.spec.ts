import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { whispers } from '../src/data/content';

const FINAL_LINE = 'Среди бесконечности миров есть один, который всегда будет особенным';

const normalize = (value: string | null) => (value ?? '').replace(/\s+/g, ' ').trim();

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  return errors;
}

async function openUniverse(page: Page) {
  await page.goto('/');
  await expect(page.locator('.intro')).toBeVisible();
  await page.locator('.intro__actions .btn').click();
  await expect(page.locator('.app')).toHaveAttribute('data-stage', 'universe');
  await expect(page.locator('.dock')).toBeVisible();
  await page.waitForTimeout(2100);
}

async function openPlanet(page: Page, id: string) {
  await page.locator(`[data-planet="${id}"]`).click();
  await expect(page.locator(`[data-testid="panel-${id}"]`)).toBeVisible();
  await expect(page.locator('.app')).toHaveAttribute('data-active', id);
  await page.waitForTimeout(700);
}

// Финальная сцена входит каскадом до ~2.3 c — даём анимациям осесть,
// чтобы Playwright не ждал стабильности кнопки на медленном headless-рендере.
async function settleAnimations(page: Page) {
  await page.waitForTimeout(2600);
}

async function closePlanet(page: Page) {
  await page.keyboard.press('Escape');
  await expect(page.locator('.panel')).toHaveCount(0);
  await expect(page.locator('.dock')).toBeVisible();
  await page.waitForTimeout(500);
}

// Ждём, пока камера закончит перелёт: в headless-режиме WebGL считает кадры
// медленно, поэтому фиксированная пауза не гарантирует стабильную проекцию.
async function settleCamera(page: Page) {
  let previous: [number, number, number] | null = null;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    await page.waitForTimeout(300);
    const camera = await page.evaluate(() => window.__loveUniverse?.stats().camera ?? null);
    if (!camera) continue;
    if (
      previous &&
      Math.abs(camera[0] - previous[0]) < 0.02 &&
      Math.abs(camera[2] - previous[2]) < 0.02
    ) {
      return;
    }
    previous = camera;
  }
}

test.describe('LOVE UNIVERSE', () => {
  test('главный экран, вход во вселенную и чистая консоль', async ({ page }) => {
    const errors = collectErrors(page);
    const failed: string[] = [];
    const audioRequests: string[] = [];
    page.on('requestfailed', (request) => {
      const failure = request.failure()?.errorText ?? 'failed';
      // Браузер штатно отменяет догрузку файла после чтения метаданных.
      if (request.url().includes('ufo-luv.mp3') && failure === 'net::ERR_ABORTED') return;
      failed.push(`${request.url()} — ${failure}`);
    });
    page.on('request', (request) => {
      if (request.url().includes('ufo-luv.mp3')) audioRequests.push(request.url());
    });

    await page.goto('/');
    await expect(page.locator('.intro__title')).toContainText('LOVE');
    await expect(page.locator('.intro__title')).toContainText('UNIVERSE');
    await expect(page.locator('.intro__subtitle')).toHaveText(
      'У каждой Вселенной есть свой центр. У моей — ты.',
    );
    await expect(page.getByTestId('audio-toggle')).toBeEnabled();
    await expect(page.getByTestId('audio-status')).toHaveText(
      /Готов к воспроизведению|Загрузка трека|Играет GONE\.Fludd — UFO LUV/,
    );
    await expect(page.locator('audio')).toHaveCount(1);
    await expect.poll(() => audioRequests.length).toBeGreaterThan(0);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    await page.locator('.intro__actions .btn').click();
    await expect(page.locator('.app')).toHaveAttribute('data-stage', 'universe');
    await page.waitForTimeout(2300);

    const stats = await page.evaluate(() => window.__loveUniverse?.stats() ?? null);
    expect(stats).not.toBeNull();
    expect(stats?.triangles ?? 0).toBeGreaterThan(1000);
    const distance = Math.hypot(...(stats?.camera ?? [0, 0, 0]));
    expect(distance).toBeGreaterThan(6);
    expect(stats?.fov ?? 0).toBeGreaterThan(30);
    expect(errors).toEqual([]);
    expect(failed).toEqual([]);

    const overflowAfter = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflowAfter).toBeLessThanOrEqual(0);
  });

  test('MP3 реально воспроизводится: play, pause, громкость и mute', async ({ page }) => {
    test.setTimeout(90_000);
    const errors = collectErrors(page);

    await page.goto('/');
    const audio = page.getByTestId('universe-audio');
    await expect(audio).toHaveCount(1);
    await expect(page.getByTestId('audio-toggle')).toBeEnabled();
    await expect
      .poll(() => audio.evaluate((element) => (element as HTMLAudioElement).readyState), {
        timeout: 20_000,
      })
      .toBeGreaterThanOrEqual(1);
    // Даём автозапуску 180 мс завершиться, чтобы не кликать Play,
    // если трек уже играет.
    await page.waitForTimeout(500);

    const before = await audio.evaluate((element) => {
      const media = element as HTMLAudioElement;
      return {
        src: media.currentSrc,
        mime: media.canPlayType('audio/mpeg'),
        duration: media.duration,
        paused: media.paused,
        currentTime: media.currentTime,
        readyState: media.readyState,
      };
    });
    expect(before.src).toContain('/audio/ufo-luv.mp3');
    expect(before.mime).toMatch(/maybe|probably/);
    expect(before.duration).toBeGreaterThan(280);
    expect(before.duration).toBeLessThan(295);
    // Автозапуск либо уже играет, либо ждёт первого действия —
    // даём плееру мгновение на переход в одно из этих состояний.
    await expect
      .poll(
        async () => {
          const state = await audio.evaluate((element) => {
            const media = element as HTMLAudioElement;
            return { paused: media.paused, currentTime: media.currentTime };
          });
          return state.paused || state.currentTime > 0;
        },
        { timeout: 5_000 },
      )
      .toBe(true);
    await expect(page.locator('.player__title')).toContainText('GONE.Fludd — UFO LUV');

    // Пытаемся запустить сразу при открытии; если браузер запретил
    // автозапуск, явный клик включает трек.
    if (before.paused) {
      await page.getByTestId('audio-toggle').click();
    }
    await expect
      .poll(() => audio.evaluate((element) => (element as HTMLAudioElement).paused), {
        timeout: 20_000,
      })
      .toBe(false);
    await expect(page.getByTestId('audio-status')).toHaveText(/Играет GONE\.Fludd — UFO LUV/);
    await expect(page.getByTestId('audio-equalizer')).toHaveAttribute('data-playing', 'true');
    const animation = await page
      .getByTestId('audio-equalizer')
      .locator('span')
      .first()
      .evaluate((element) => getComputedStyle(element).animationName);
    expect(animation).toBe('player-equalize');

    await page.waitForTimeout(1500);
    const playing = await audio.evaluate((element) => {
      const media = element as HTMLAudioElement;
      return {
        currentTime: media.currentTime,
        readyState: media.readyState,
      };
    });
    expect(playing.currentTime).toBeGreaterThan(0.5);
    expect(playing.readyState).toBeGreaterThanOrEqual(2);

    // Пауза действительно останавливает позицию.
    await page.getByTestId('audio-toggle').click();
    await expect
      .poll(() => audio.evaluate((element) => (element as HTMLAudioElement).paused))
      .toBe(true);
    await expect(page.getByTestId('audio-status')).toHaveText('Пауза');
    await expect(page.getByTestId('audio-equalizer')).toHaveAttribute('data-playing', 'false');
    const pausedAt = await audio.evaluate((element) => (element as HTMLAudioElement).currentTime);
    await page.waitForTimeout(700);
    const stillPausedAt = await audio.evaluate(
      (element) => (element as HTMLAudioElement).currentTime,
    );
    expect(Math.abs(stillPausedAt - pausedAt)).toBeLessThan(0.25);

    // Продолжение с той же позиции.
    await page.getByTestId('audio-toggle').click();
    await expect
      .poll(() => audio.evaluate((element) => (element as HTMLAudioElement).paused))
      .toBe(false);
    await page.waitForTimeout(800);
    const resumedAt = await audio.evaluate((element) => (element as HTMLAudioElement).currentTime);
    expect(resumedAt).toBeGreaterThan(pausedAt + 0.3);

    const volume = page.getByTestId('audio-volume');
    if (await volume.isVisible()) {
      await volume.evaluate((element) => {
        const input = element as HTMLInputElement;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter?.call(input, '0.2');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await expect
        .poll(() =>
          audio.evaluate((element) => Math.round((element as HTMLAudioElement).volume * 100) / 100),
        )
        .toBe(0.2);
    }

    await page.getByRole('button', { name: 'Выключить звук' }).click();
    await expect
      .poll(() => audio.evaluate((element) => (element as HTMLAudioElement).muted))
      .toBe(true);
    await expect(page.getByTestId('audio-status')).toContainText('без звука');
    await page.getByRole('button', { name: 'Включить звук' }).click();
    await expect
      .poll(() => audio.evaluate((element) => (element as HTMLAudioElement).muted))
      .toBe(false);

    await page.getByTestId('audio-toggle').click();
    await expect
      .poll(() => audio.evaluate((element) => (element as HTMLAudioElement).paused))
      .toBe(true);
    expect(errors).toEqual([]);
  });

  test('на мобильном тап запускает и останавливает трек', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'только мобильный проект');
    test.setTimeout(90_000);

    await page.goto('/');
    const audio = page.getByTestId('universe-audio');
    await expect(audio).toHaveCount(1);
    await page.waitForTimeout(500);
    const initiallyPaused = await audio.evaluate((element) => (element as HTMLAudioElement).paused);
    if (initiallyPaused) await page.getByTestId('audio-toggle').tap();
    await expect
      .poll(() => audio.evaluate((element) => (element as HTMLAudioElement).paused), {
        timeout: 20_000,
      })
      .toBe(false);
    await page.waitForTimeout(1000);
    expect(
      await audio.evaluate((element) => (element as HTMLAudioElement).currentTime),
    ).toBeGreaterThan(0.3);
    await expect(page.getByTestId('audio-equalizer')).toBeVisible();
    await expect(page.getByTestId('audio-equalizer')).toHaveAttribute('data-playing', 'true');

    const mute = page.locator('.player__button--mute');
    await mute.tap();
    await expect
      .poll(() => audio.evaluate((element) => (element as HTMLAudioElement).muted))
      .toBe(true);
    await mute.tap();
    await expect
      .poll(() => audio.evaluate((element) => (element as HTMLAudioElement).muted))
      .toBe(false);

    await page.getByTestId('audio-toggle').tap();
    await expect
      .poll(() => audio.evaluate((element) => (element as HTMLAudioElement).paused))
      .toBe(true);
    await expect(page.getByTestId('audio-equalizer')).toHaveAttribute('data-playing', 'false');

    for (const locator of [
      page.getByTestId('audio-toggle'),
      page.locator('.player__button--mute'),
    ]) {
      const box = await locator.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('ошибка загрузки MP3 показывается без падения плеера', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'достаточно одного проекта');

    await page.route('**/audio/ufo-luv.mp3', (route) =>
      route.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' }),
    );
    await page.goto('/');
    const audio = page.getByTestId('universe-audio');
    await expect(audio).toHaveCount(1);
    await page.getByTestId('audio-toggle').click();
    await expect(page.getByTestId('audio-status')).toHaveText(
      /Не удалось|Браузер не поддерживает/,
      { timeout: 20_000 },
    );
    await expect(page.getByTestId('audio-toggle')).toBeEnabled();
    await expect(page.getByTestId('audio-equalizer')).toHaveAttribute('data-playing', 'false');
    await expect(page.getByTestId('audio-player')).not.toHaveClass(/is-unavailable/);
  });

  test('все пять планет открываются и закрываются', async ({ page }) => {
    const errors = collectErrors(page);
    await openUniverse(page);

    const expected: Record<string, string> = {
      love: 'Всё, что я не сказал вслух',
      dreams: 'Места, куда мы ещё доберёмся',
      heart: 'Оно бьётся неровно',
      secret: 'Есть одна вещь, которую я прятал',
      forever: FINAL_LINE,
    };

    for (const [id, text] of Object.entries(expected)) {
      await openPlanet(page, id);
      await expect(page.locator(`[data-testid="panel-${id}"]`)).toContainText(text);
      await expect(page.getByTestId('stage-status')).toContainText(`Открыта планета ${id}`);

      if (id === 'love') {
        await expect(page.locator('.love-list__item')).toHaveCount(5);
      }
      if (id === 'dreams') {
        await expect(page.locator('.dream')).toHaveCount(5);
      }
      if (id === 'forever') {
        const quote = normalize(await page.locator('.final__quote p').textContent());
        expect(quote).toBe(FINAL_LINE);
        await settleAnimations(page);
        await page
          .locator('[data-testid="panel-forever"]')
          .getByRole('button', { name: 'ко всем планетам' })
          .click();
        await expect(page.locator('.dock')).toBeVisible();
        continue;
      }

      await closePlanet(page);
    }

    expect(errors).toEqual([]);
  });

  test('камера совершает перелёт между обзором и планетой', async ({ page }) => {
    await openUniverse(page);
    const overview = await page.evaluate(() => window.__loveUniverse?.stats() ?? null);
    expect(overview).not.toBeNull();

    const before = overview?.camera ?? [0, 0, 0];
    const beforeFov = overview?.fov ?? 45;

    await page.locator('[data-planet="love"]').click();
    await expect(page.locator('[data-testid="panel-love"]')).toBeVisible();
    await page.waitForTimeout(1700);

    const focused = await page.evaluate(() => window.__loveUniverse?.stats() ?? null);
    expect(focused).not.toBeNull();
    const after = focused?.camera ?? [0, 0, 0];
    const distance = Math.hypot(after[0] - before[0], after[1] - before[1], after[2] - before[2]);
    expect(distance).toBeGreaterThan(3);
    expect(focused?.fov).not.toBe(beforeFov);

    await page.keyboard.press('Escape');
    await expect(page.locator('.dock')).toBeVisible();
    await page.waitForTimeout(1400);
    const returned = await page.evaluate(() => window.__loveUniverse?.stats() ?? null);
    const back = returned?.camera ?? after;
    const returnDistance = Math.hypot(back[0] - after[0], back[1] - after[1], back[2] - after[2]);
    expect(returnDistance).toBeGreaterThan(2);
  });

  test('3D-планета, сердце-шёпот и вращение камеры', async ({ page, isMobile }) => {
    // В headless-режиме WebGL рисует единицы кадров в секунду, и перелёты
    // камеры занимают больше времени, чем в реальном браузере.
    test.setTimeout(90_000);
    const errors = collectErrors(page);
    await openUniverse(page);
    await settleCamera(page);

    const portrait = await page.evaluate(
      () => window.innerWidth < 900 || window.innerWidth / window.innerHeight < 1.02,
    );
    const activate = async (coords: number[]) => {
      const point = await page.evaluate(
        ([x, y, z]) => window.__loveUniverse!.project(x, y, z),
        coords,
      );
      expect(point.visible).toBe(true);
      if (isMobile) {
        await page.touchscreen.tap(point.x, point.y);
      } else {
        await page.mouse.click(point.x, point.y);
      }
    };

    // Клик прямо по 3D-сердцу планеты HEART, а не по кнопке дока.
    const heartCoords = portrait ? [0, 0.1, -5.6] : [0.6, 2.7, -5.2];
    await activate(heartCoords);
    await expect(page.locator('[data-testid="panel-heart"]')).toBeVisible();
    await expect(page.locator('.app')).toHaveAttribute('data-active', 'heart');
    await closePlanet(page);
    await settleCamera(page);

    // Клик по парящему 3D-сердцу открывает шёпот.
    const whisper = whispers[0];
    await activate(portrait ? whisper.portrait : whisper.position);
    await expect(page.getByTestId('whisper-card')).toBeVisible();
    await expect(page.locator('.whisper__text')).toHaveText(whisper.text);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('whisper-card')).toHaveCount(0);

    // Перетаскивание вращает камеру (на мобильном жест проверяется тач-тестом).
    if (!isMobile) {
      const before = await page.evaluate(() => window.__loveUniverse!.stats().camera);
      await page.mouse.move(600, 440);
      await page.mouse.down();
      await page.mouse.move(780, 470, { steps: 12 });
      await page.mouse.up();
      await page.waitForTimeout(1400);
      const after = await page.evaluate(() => window.__loveUniverse!.stats().camera);
      const moved = Math.hypot(after[0] - before[0], after[2] - before[2]);
      expect(moved).toBeGreaterThan(1);
    }

    expect(errors).toEqual([]);
  });

  test('секрет открывается удержанием мыши и клавиатуры', async ({ page }) => {
    await openUniverse(page);
    await openPlanet(page, 'secret');

    const hold = page.getByTestId('secret-hold');
    const box = await hold.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(2400);
      await page.mouse.up();
    }

    await expect(page.getByTestId('secret-letter')).toBeVisible();
    await expect(page.getByTestId('secret-letter')).toContainText('всегда твой');

    await page.getByRole('button', { name: 'спрятать обратно' }).click();
    const keyboardHold = page.getByTestId('secret-hold');
    await keyboardHold.focus();
    await page.keyboard.down('Space');
    await page.waitForTimeout(2400);
    await page.keyboard.up('Space');
    await expect(page.getByTestId('secret-letter')).toBeVisible();
  });

  test('шёпот сердец доступен из HUD', async ({ page }) => {
    await openUniverse(page);
    await page.locator('.hud__whispers').click();
    await expect(page.getByTestId('whispers-panel')).toBeVisible();
    await expect(page.locator('.whisper-list__item')).toHaveCount(7);

    await page.locator('.whisper-list__item').first().click();
    await expect(page.getByTestId('whisper-card')).toBeVisible();
    await expect(page.locator('.whisper__text')).toHaveText('Ты — моя любимая пауза.');

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('whisper-card')).toHaveCount(0);
    await page.waitForTimeout(250);
    const focused = await page.evaluate(() => document.activeElement?.className ?? '');
    expect(focused).toContain('hud__whispers');
  });

  test('фокус заперт в панели и возвращается в док', async ({ page }) => {
    await openUniverse(page);

    const loveButton = page.locator('[data-planet="love"]');
    await loveButton.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('panel-love')).toBeVisible();
    await page.waitForTimeout(600);

    for (let index = 0; index < 8; index += 1) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => {
        const panel = document.querySelector('.panel');
        return !!panel && !!document.activeElement && panel.contains(document.activeElement);
      });
      expect(inside).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(page.locator('.panel')).toHaveCount(0);
    await expect(page.locator('.dock')).toBeVisible();
    await page.waitForTimeout(1000);
    const focusedPlanet = await page.evaluate(
      () => document.activeElement?.getAttribute('data-planet') ?? null,
    );
    expect(focusedPlanet).toBe('love');
  });

  test('финальная сцена и рестарт', async ({ page }) => {
    await openUniverse(page);
    await openPlanet(page, 'forever');

    const quote = normalize(await page.locator('.final__quote p').textContent());
    expect(quote).toBe(FINAL_LINE);

    await settleAnimations(page);
    await page
      .locator('[data-testid="panel-forever"]')
      .getByRole('button', { name: 'вернуться в начало' })
      .click();
    await expect(page.locator('.intro')).toBeVisible();
    await expect(page.locator('.app')).toHaveAttribute('data-stage', 'intro');
    await page.waitForTimeout(1200);
    const focused = await page.evaluate(() => document.activeElement?.className ?? '');
    expect(focused).toContain('btn--primary');
  });

  test('сниженная анимация не ломает сценарий', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('.intro')).toBeVisible();
    const orbitAnimation = await page
      .locator('.intro__orbit--a')
      .evaluate((element) => getComputedStyle(element).animationName);
    expect(orbitAnimation).toBe('none');

    await page.locator('.intro__actions .btn').click();
    await expect(page.locator('.app')).toHaveAttribute('data-stage', 'universe');
    await page.waitForTimeout(1400);
    await openPlanet(page, 'heart');
    const pulseAnimation = await page
      .locator('.pulse__ring--one')
      .evaluate((element) => getComputedStyle(element).animationName);
    expect(pulseAnimation).toBe('none');
    await expect(page.locator('[data-testid="panel-heart"]')).toContainText('Оно бьётся неровно');
  });

  test('мобильные тач-цели и отсутствие горизонтального скролла', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'только мобильный проект');

    await openUniverse(page);

    const targets = [
      page.locator('.dock__button').first(),
      page.locator('.hud__whispers'),
      page.getByTestId('audio-toggle'),
    ];
    for (const target of targets) {
      const box = await target.boundingBox();
      expect(box).not.toBeNull();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }

    await page.locator('[data-planet="love"]').tap();
    await expect(page.getByTestId('panel-love')).toBeVisible();
    const closeBox = await page.locator('.panel__close').boundingBox();
    expect(closeBox?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(closeBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    await page.locator('.panel__close').tap();
    await expect(page.locator('.dock')).toBeVisible();
  });

  test('аудит доступности главного экрана и панели', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'достаточно одного проекта');

    await page.goto('/');
    await expect(page.locator('.intro')).toBeVisible();
    const introScan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const introViolations = introScan.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(introViolations).toEqual([]);

    await page.locator('.intro__actions .btn').click();
    await expect(page.locator('.app')).toHaveAttribute('data-stage', 'universe');
    await page.waitForTimeout(2200);
    await openPlanet(page, 'love');

    const panelScan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const panelViolations = panelScan.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(panelViolations).toEqual([]);
  });
});
