import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  starFragmentShader,
  starVertexShader,
  dustVertexShader,
  dustFragmentShader,
} from './shaders';

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function createStarGeometry(count: number, seed: number): THREE.BufferGeometry {
  const random = seeded(seed);
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const tints = new Float32Array(count);

  for (let index = 0; index < count; index += 1) {
    const radius = 17 + random() * 38;
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.cos(phi);
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    sizes[index] = 0.6 + Math.pow(random(), 2.4) * 3.4;
    phases[index] = random();
    tints[index] = random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aTint', new THREE.BufferAttribute(tints, 1));
  return geometry;
}

function createDustGeometry(count: number, seed: number): THREE.BufferGeometry {
  const random = seeded(seed);
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);

  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = (random() - 0.5) * 30;
    positions[index * 3 + 1] = (random() - 0.5) * 17;
    positions[index * 3 + 2] = (random() - 0.5) * 20 - 2;
    sizes[index] = 0.6 + random() * 2.1;
    phases[index] = random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  return geometry;
}

interface StarfieldProps {
  count: number;
  reduced: boolean;
  pixelRatio: number;
}

export function Starfield({ count, reduced, pixelRatio }: StarfieldProps) {
  const geometry = useMemo(() => createStarGeometry(count, 7), [count]);
  const group = useRef<THREE.Group>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uCream: { value: new THREE.Color('#f6ecdc') },
      uRose: { value: new THREE.Color('#f3b7c1') },
      uRed: { value: new THREE.Color('#c8182e') },
    }),
    [pixelRatio],
  );

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    if (!reduced && group.current) {
      group.current.rotation.y = state.clock.elapsedTime * 0.004;
    }
  });

  return (
    <group ref={group}>
      <points geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={starVertexShader}
          fragmentShader={starFragmentShader}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

interface DustProps {
  count: number;
  reduced: boolean;
  pixelRatio: number;
}

export function CosmicDust({ count, reduced, pixelRatio }: DustProps) {
  const geometry = useMemo(() => createDustGeometry(count, 21), [count]);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uDrift: { value: 0.22 },
      uColor: { value: new THREE.Color('#f3b7c1') },
    }),
    [pixelRatio],
  );

  useFrame((state) => {
    uniforms.uTime.value = reduced ? 0 : state.clock.elapsedTime;
  });

  return (
    <points geometry={geometry}>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={dustVertexShader}
        fragmentShader={dustFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
