import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getNebulaTexture } from './assets';

const LAYERS = [
  { position: [-19, 7, -30] as const, scale: 38, opacity: 0.5, speed: 0.006 },
  { position: [17, -9, -36] as const, scale: 46, opacity: 0.42, speed: -0.004 },
  { position: [5, 13, -27] as const, scale: 27, opacity: 0.33, speed: 0.009 },
  { position: [-12, -13, -33] as const, scale: 33, opacity: 0.32, speed: -0.007 },
  { position: [12, 8, 13] as const, scale: 26, opacity: 0.07, speed: 0.003 },
];

interface NebulaProps {
  layers: number;
  reduced: boolean;
}

export function Nebula({ layers, reduced }: NebulaProps) {
  const texture = useMemo(() => getNebulaTexture(), []);
  const refs = useRef<(THREE.Sprite | null)[]>([]);

  useFrame((state) => {
    if (reduced) return;
    refs.current.forEach((sprite, index) => {
      if (!sprite) return;
      const layer = LAYERS[index];
      sprite.material.rotation += layer.speed * 0.01;
      sprite.position.y =
        layer.position[1] + Math.sin(state.clock.elapsedTime * 0.03 + index) * 0.5;
    });
  });

  return (
    <group>
      {LAYERS.slice(0, layers).map((layer, index) => (
        <sprite
          key={`${layer.position.join(':')}`}
          ref={(node) => {
            refs.current[index] = node;
          }}
          position={[...layer.position]}
          scale={[layer.scale, layer.scale, 1]}
        >
          <spriteMaterial
            map={texture}
            color="#f3b7c1"
            transparent
            opacity={layer.opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </group>
  );
}
