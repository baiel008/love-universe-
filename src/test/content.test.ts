import { describe, expect, it } from 'vitest';
import {
  dreams,
  foreverText,
  heartText,
  intro,
  loveText,
  secretText,
  whispers,
} from '../data/content';
import { planets, planetById, planetIds } from '../data/planets';
import { track } from '../data/track';

describe('контент вселенной', () => {
  it('содержит ровно пять планет с уникальными id', () => {
    expect(planets).toHaveLength(5);
    expect(new Set(planetIds).size).toBe(5);
    expect(planetIds).toEqual(['love', 'dreams', 'heart', 'secret', 'forever']);
  });

  it('у каждой планеты есть название, подпись и палитра', () => {
    for (const planet of planets) {
      expect(planet.name.length).toBeGreaterThan(2);
      expect(planet.ru.length).toBeGreaterThan(4);
      expect(planet.tagline.length).toBeGreaterThan(8);
      expect(planet.index).toMatch(/^0[1-5]$/);
      expect(planetById(planet.id)).toBe(planet);
    }
  });

  it('палитра планет остаётся в красно-розово-кремовой гамме', () => {
    for (const planet of planets) {
      for (const color of Object.values(planet.colors)) {
        const red = Number.parseInt(color.slice(1, 3), 16);
        const blue = Number.parseInt(color.slice(5, 7), 16);
        expect(red).toBeGreaterThanOrEqual(blue);
      }
    }
  });

  it('финальная строка совпадает дословно', () => {
    expect(foreverText.quote).toBe(
      'Среди бесконечности миров есть один, который всегда будет особенным',
    );
  });

  it('в текстах нет заглушек и пустых строк', () => {
    const texts = [
      intro.subtitle,
      intro.cta,
      loveText.title,
      loveText.lead,
      heartText.title,
      secretText.letterTitle,
      foreverText.quote,
      foreverText.support,
      track.label,
      ...loveText.phrases,
      ...secretText.letter,
      ...dreams.map((dream) => dream.title),
      ...whispers.map((whisper) => whisper.text),
    ];
    for (const text of texts) {
      expect(text.trim().length).toBeGreaterThan(5);
      expect(text).not.toMatch(/lorem|ipsum|todo|placeholder|xxx/i);
    }
  });

  it('пять мечт и семь интерактивных сердец', () => {
    expect(dreams).toHaveLength(5);
    expect(new Set(dreams.map((dream) => dream.art)).size).toBe(5);
    expect(whispers).toHaveLength(7);
    expect(new Set(whispers.map((whisper) => whisper.text)).size).toBe(7);
  });

  it('письмо секретной планеты состоит из четырёх абзацев и подписи', () => {
    expect(secretText.letter).toHaveLength(4);
    expect(secretText.sign.length).toBeGreaterThan(3);
  });
});
