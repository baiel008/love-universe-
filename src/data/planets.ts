import type { PlanetDef, PlanetId } from '../types';

/**
 * Пять планет вселенной. Позиции подобраны так, чтобы в широкой раскладке
 * планеты образовывали дугу вокруг центрального светила, а в портретной —
 * вертикальную колонну, которая целиком помещается в кадр.
 */
export const planets: PlanetDef[] = [
  {
    id: 'love',
    index: '01',
    name: 'LOVE',
    ru: 'Планета признаний',
    tagline: 'то, что я так и не научился говорить коротко',
    colors: { base: '#c8182e', deep: '#2a050b', glow: '#ff5a6e' },
    radius: 1.72,
    seed: 1.7,
    kind: 'planet',
    ring: { inner: 2.05, outer: 2.9, tilt: 0.42, opacity: 0.26 },
    position: [-7.4, 1.9, 1.4],
    portrait: [-2.1, 5.15, -1.0],
  },
  {
    id: 'dreams',
    index: '02',
    name: 'DREAMS',
    ru: 'Планета мечтаний',
    tagline: 'места, куда мы ещё обязательно доберёмся',
    colors: { base: '#f3b7c1', deep: '#5a1622', glow: '#ffd3da' },
    radius: 1.18,
    seed: 4.2,
    kind: 'planet',
    position: [-4.4, -3.1, -3.2],
    portrait: [2.3, 2.7, -3.4],
  },
  {
    id: 'heart',
    index: '03',
    name: 'HEART',
    ru: 'Планета сердцебиения',
    tagline: 'неровный ритм, который слышно только рядом',
    colors: { base: '#e23b4e', deep: '#2a0509', glow: '#ff8a96' },
    radius: 1.52,
    seed: 7.9,
    kind: 'heart',
    position: [0.6, 2.7, -5.2],
    portrait: [0, 0.1, -5.6],
  },
  {
    id: 'secret',
    index: '04',
    name: 'SECRET',
    ru: 'Секретная планета',
    tagline: 'одно письмо, которое ждало тебя дольше всех',
    colors: { base: '#6e1624', deep: '#120306', glow: '#c8182e' },
    radius: 1.05,
    seed: 11.3,
    kind: 'planet',
    ring: { inner: 1.35, outer: 1.55, tilt: 0.95, opacity: 0.2 },
    position: [5.2, -1.8, -2.2],
    portrait: [-2.2, -2.7, -3.2],
  },
  {
    id: 'forever',
    index: '05',
    name: 'FOREVER',
    ru: 'Планета бесконечности',
    tagline: 'финал, который на самом деле только начало',
    colors: { base: '#f6ecdc', deep: '#8c2534', glow: '#ffe9d6' },
    radius: 1.86,
    seed: 15.1,
    kind: 'heart',
    ring: { inner: 2.4, outer: 3.15, tilt: 0.28, opacity: 0.22 },
    position: [8.4, 2.3, -6.6],
    portrait: [2.0, -5.2, -1.2],
  },
];

export const planetById = (id: PlanetId): PlanetDef => {
  const planet = planets.find((item) => item.id === id);
  if (!planet) throw new Error(`Неизвестная планета: ${id}`);
  return planet;
};

export const planetIds: PlanetId[] = planets.map((planet) => planet.id);

export const planetIndex = (id: PlanetId): number => planets.findIndex((p) => p.id === id);
