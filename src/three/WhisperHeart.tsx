import { useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Whisper } from '../types';
import { getGlowTexture, getHeartGeometry } from './assets';

interface WhisperHeartProps {
  whisper: Whisper;
  index: number;
  portrait: boolean;
  reduced: boolean;
  onWhisper: (whisper: Whisper, index: number) => void;
  movedRef: React.RefObject<boolean>;
}

export function WhisperHeart({
  whisper,
  index,
  portrait,
  reduced,
  onWhisper,
  movedRef,
}: WhisperHeartProps) {
  const { gl } = useThree();
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const geometry = useMemo(() => getHeartGeometry(), []);
  const glow = useMemo(() => getGlowTexture(), []);
  const position = portrait ? whisper.portrait : whisper.position;
  const baseY = position[1];

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    if (group.current) {
      const drift = reduced ? 0 : Math.sin(time * 0.55 + index * 1.7) * 0.18;
      const driftX = reduced ? 0 : Math.cos(time * 0.42 + index) * 0.08;
      group.current.position.y = baseY + drift;
      group.current.position.x = position[0] + driftX;
    }
    if (mesh.current) {
      if (!reduced) {
        mesh.current.rotation.y += delta * (0.3 + index * 0.03);
        mesh.current.rotation.z = Math.sin(time * 0.5 + index) * 0.18;
      }
      const target = hovered ? whisper.scale * 1.4 : whisper.scale;
      const next = THREE.MathUtils.damp(mesh.current.scale.x, target, 6, Math.min(delta, 0.06));
      mesh.current.scale.setScalar(next);
    }
  });

  return (
    <group
      ref={group}
      position={[...position]}
      onClick={(event) => {
        event.stopPropagation();
        if (movedRef.current) return;
        onWhisper(whisper, index);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        gl.domElement.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        gl.domElement.style.cursor = '';
      }}
    >
      <sprite scale={[whisper.scale * 5.2, whisper.scale * 5.2, 1]}>
        <spriteMaterial
          map={glow}
          color="#f3b7c1"
          transparent
          opacity={hovered ? 0.55 : 0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <mesh ref={mesh} geometry={geometry} scale={whisper.scale}>
        <meshPhysicalMaterial
          color="#f3b7c1"
          emissive="#c8182e"
          emissiveIntensity={0.65}
          roughness={0.26}
          metalness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.18}
        />
      </mesh>
    </group>
  );
}
