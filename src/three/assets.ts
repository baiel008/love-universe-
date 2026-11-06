import * as THREE from 'three';

let heartGeometry: THREE.ExtrudeGeometry | null = null;

/** Аккуратное объёмное сердце с фаской — общая геометрия для всех сердец сцены. */
export function getHeartGeometry(): THREE.ExtrudeGeometry {
  if (heartGeometry) return heartGeometry;

  const shape = new THREE.Shape();
  shape.moveTo(0, -1);
  shape.bezierCurveTo(-0.62, -0.55, -1.22, 0.02, -1.22, 0.52);
  shape.bezierCurveTo(-1.22, 1.02, -0.72, 1.24, -0.38, 1.24);
  shape.bezierCurveTo(-0.12, 1.24, 0.02, 1.02, 0, 0.78);
  shape.bezierCurveTo(-0.02, 1.02, 0.12, 1.24, 0.38, 1.24);
  shape.bezierCurveTo(0.72, 1.24, 1.22, 1.02, 1.22, 0.52);
  shape.bezierCurveTo(1.22, 0.02, 0.62, -0.55, 0, -1);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.62,
    bevelEnabled: true,
    bevelThickness: 0.14,
    bevelSize: 0.12,
    bevelSegments: 6,
    curveSegments: 28,
    steps: 1,
  });

  geometry.center();
  heartGeometry = geometry;
  return geometry;
}

let glowTexture: THREE.Texture | null = null;

/** Мягкое радиальное свечение для спрайтов-ореолов. */
export function getGlowTexture(): THREE.Texture {
  if (glowTexture) return glowTexture;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) {
    glowTexture = new THREE.Texture();
    return glowTexture;
  }

  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, 'rgba(255, 245, 230, 1)');
  gradient.addColorStop(0.22, 'rgba(255, 220, 210, 0.55)');
  gradient.addColorStop(0.55, 'rgba(220, 90, 110, 0.16)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  glowTexture = texture;
  return texture;
}

let nebulaTexture: THREE.Texture | null = null;

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/** Процедурная туманность: только красный, розовый и кремовый. */
export function getNebulaTexture(): THREE.Texture {
  if (nebulaTexture) return nebulaTexture;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) {
    nebulaTexture = new THREE.Texture();
    return nebulaTexture;
  }

  const random = seededRandom(42);
  context.clearRect(0, 0, size, size);

  const base = context.createRadialGradient(
    size * 0.5,
    size * 0.5,
    0,
    size * 0.5,
    size * 0.5,
    size * 0.5,
  );
  base.addColorStop(0, 'rgba(200, 24, 46, 0.34)');
  base.addColorStop(0.4, 'rgba(140, 20, 36, 0.18)');
  base.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = base;
  context.fillRect(0, 0, size, size);

  for (let index = 0; index < 26; index += 1) {
    const x = size * (0.18 + random() * 0.64);
    const y = size * (0.18 + random() * 0.64);
    const radius = size * (0.04 + random() * 0.18);
    const warm = random() > 0.45;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, warm ? 'rgba(243, 183, 193, 0.16)' : 'rgba(246, 236, 220, 0.1)');
    gradient.addColorStop(0.6, 'rgba(200, 24, 46, 0.06)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  nebulaTexture = texture;
  return texture;
}

/** Ограничитель кадров / сглаживание для пульсации. */
export const damp = (current: number, target: number, lambda: number, delta: number): number =>
  THREE.MathUtils.damp(current, target, lambda, delta);
