export type PlanetId = 'love' | 'dreams' | 'heart' | 'secret' | 'forever';

export type QualityLevel = 'high' | 'low';

export interface PlanetColors {
  /** Основной цвет поверхности. */
  base: string;
  /** Тёмный цвет ядра / теней. */
  deep: string;
  /** Цвет свечения и атмосферы. */
  glow: string;
}

export interface PlanetRing {
  inner: number;
  outer: number;
  tilt: number;
  opacity: number;
}

export interface PlanetDef {
  id: PlanetId;
  index: string;
  name: string;
  ru: string;
  tagline: string;
  colors: PlanetColors;
  radius: number;
  seed: number;
  kind: 'planet' | 'heart';
  ring?: PlanetRing;
  /** Позиция в широкой раскладке. */
  position: [number, number, number];
  /** Позиция в портретной раскладке. */
  portrait: [number, number, number];
}

export interface Dream {
  id: string;
  index: string;
  title: string;
  line: string;
  art: 'tide' | 'peaks' | 'streets' | 'road' | 'home';
}

export interface Whisper {
  id: string;
  text: string;
  /** Позиция в 3D: широкая и портретная. */
  position: [number, number, number];
  portrait: [number, number, number];
  scale: number;
}
