import type { Dream } from '../types';

const common = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function Tide() {
  return (
    <>
      <circle cx="84" cy="24" r="10" className="dream-art__accent" />
      <path d="M8 48h104" {...common} opacity="0.5" />
      <path d="M8 58c10-6 18-6 28 0s18 6 28 0 18-6 28 0 10 4 20 1" {...common} />
      <path d="M8 68c10-6 18-6 28 0s18 6 28 0 18-6 28 0 10 4 20 1" {...common} opacity="0.65" />
      <path d="M18 48V30l14 8-14 8" {...common} opacity="0.7" />
    </>
  );
}

function Peaks() {
  return (
    <>
      <path d="M6 70 38 24l18 26 12-16 30 36" {...common} />
      <path d="M30 37l8 8 8-9" {...common} opacity="0.6" />
      <path d="M68 41l7 9 7-7" {...common} opacity="0.6" />
      <circle cx="96" cy="18" r="6" className="dream-art__accent" />
      <path d="M16 18h.01M24 26h.01M78 16h.01M88 28h.01" {...common} opacity="0.8" />
    </>
  );
}

function Streets() {
  return (
    <>
      <path d="M8 70h104" {...common} opacity="0.5" />
      <path
        d="M12 70V34h22v36M34 70V48h20v22M54 70V26h24v44M78 70V40h16v30M94 70V52h14v18"
        {...common}
      />
      <path
        d="M17 41h.01M25 41h.01M17 49h.01M25 49h.01M61 34h.01M69 34h.01M61 42h.01M69 42h.01M61 50h.01M69 50h.01M84 47h.01M84 55h.01"
        {...common}
        opacity="0.8"
      />
      <path d="M100 60h.01" {...common} opacity="0.6" />
    </>
  );
}

function Road() {
  return (
    <>
      <path d="M8 70h104" {...common} opacity="0.5" />
      <path d="M60 70 44 34M60 70l16-36" {...common} opacity="0.8" />
      <path d="M60 62v-8M60 48v-6M60 38v-4" {...common} opacity="0.7" />
      <circle cx="88" cy="22" r="8" className="dream-art__accent" />
      <path d="M20 70 52 34M100 70 68 34" {...common} opacity="0.28" />
      <path d="M18 28h12M12 36h10" {...common} opacity="0.5" />
    </>
  );
}

function Home() {
  return (
    <>
      <path d="M28 64V36l26-18 26 18v28" {...common} />
      <path d="M46 64V50h16v14" {...common} />
      <rect x="36" y="42" width="9" height="9" className="dream-art__accent" />
      <path d="M56 20V12h7v13" {...common} opacity="0.7" />
      <path d="M63 12c8 0 8-5 14-5" {...common} opacity="0.45" />
      <path d="M16 64h88" {...common} opacity="0.5" />
      <path d="M12 26h.01M104 34h.01M96 18h.01" {...common} opacity="0.7" />
    </>
  );
}

const ART: Record<Dream['art'], () => React.ReactElement> = {
  tide: Tide,
  peaks: Peaks,
  streets: Streets,
  road: Road,
  home: Home,
};

export function DreamArt({ art }: { art: Dream['art'] }) {
  const Component = ART[art];
  return (
    <svg className="dream-art" viewBox="0 0 120 80" aria-hidden="true" focusable="false">
      <Component />
    </svg>
  );
}
