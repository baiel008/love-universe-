import type { QualityLevel } from '../types';

/**
 * Определяет уровень графики без бенчмарков: по железу и типу устройства.
 * Низкий режим уменьшает число частиц, отключает лишние слои туманности
 * и ограничивает pixel ratio.
 */
export function detectQuality(): QualityLevel {
  if (typeof navigator === 'undefined') return 'high';

  const cores = navigator.hardwareConcurrency ?? 8;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

  if (mobile || coarse || cores <= 4 || memory <= 4) return 'low';
  return 'high';
}

export const qualitySettings = {
  high: {
    stars: 4200,
    dust: 900,
    nebulae: 4,
    planetSegments: 64,
    dpr: 1.6,
    orbitHearts: 14,
    antialias: true,
  },
  low: {
    stars: 1900,
    dust: 320,
    nebulae: 2,
    planetSegments: 40,
    dpr: 1,
    orbitHearts: 8,
    antialias: false,
  },
} as const;
