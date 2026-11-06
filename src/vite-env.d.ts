/// <reference types="vite/client" />

declare const __AUDIO_AVAILABLE__: boolean;

interface LoveUniverseStats {
  geometries: number;
  textures: number;
  programs: number;
  calls: number;
  triangles: number;
  fps: number;
  fov: number;
  camera: [number, number, number];
}

interface LoveUniverseDebug {
  stats: () => LoveUniverseStats;
  loseContext: () => void;
  resumeContext: () => void;
  project: (x: number, y: number, z: number) => { x: number; y: number; visible: boolean };
  setQuality: (quality: 'high' | 'low') => void;
}

interface Window {
  __loveUniverse?: LoveUniverseDebug;
}
