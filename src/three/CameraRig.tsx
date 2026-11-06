import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { PlanetId } from '../types';
import { planetById } from '../data/planets';

export interface OrbitState {
  yaw: number;
  pitch: number;
  distance: number;
  dragging: boolean;
  moved: boolean;
}

export interface CameraRigProps {
  stage: 'intro' | 'universe';
  active: PlanetId | null;
  portrait: boolean;
  reduced: boolean;
  warp: boolean;
  controls: React.RefObject<OrbitState>;
}

export function CameraRig({ stage, active, portrait, reduced, warp, controls }: CameraRigProps) {
  const { camera } = useThree();
  const position = useRef(new THREE.Vector3(0, 0.8, 13.6));
  const look = useRef(new THREE.Vector3(0, 0, 0));
  const targetPosition = useMemo(() => new THREE.Vector3(), []);
  const targetLook = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    let fov: number;

    if (warp) {
      targetPosition.set(0, 0.5, 4.6);
      targetLook.set(0, 0, 0);
      fov = 58;
    } else if (stage === 'intro') {
      targetPosition.set(0, 0.7, 13.6);
      targetLook.set(0, 0, 0);
      fov = 45;
    } else if (active) {
      const def = planetById(active);
      const base = portrait ? def.portrait : def.position;
      const distance = Math.max(5.2, def.radius * 3.1) * (portrait ? 1.16 : 1);
      targetPosition.set(base[0], base[1] + 0.28, base[2] + distance);
      targetLook.set(base[0], base[1], base[2]);
      fov = portrait ? 48 : 40;
    } else {
      const orbit = controls.current;
      const distance = orbit.distance;
      targetPosition.set(
        Math.sin(orbit.yaw) * Math.cos(orbit.pitch) * distance,
        2.4 + Math.sin(orbit.pitch) * distance,
        Math.cos(orbit.yaw) * Math.cos(orbit.pitch) * distance,
      );
      targetLook.set(0, 0, -1.4);
      fov = portrait ? 50 : 45;
    }

    const damping = reduced ? 1 : 1 - Math.exp(-dt * 3.1);
    position.current.lerp(targetPosition, damping);
    look.current.lerp(targetLook, damping);

    camera.position.copy(position.current);
    if (!reduced && !active && !warp && stage === 'universe') {
      camera.position.y += Math.sin(state.clock.elapsedTime * 0.38) * 0.04;
    }
    camera.lookAt(look.current);

    const perspective = camera as THREE.PerspectiveCamera;
    if (Math.abs(perspective.fov - fov) > 0.015) {
      perspective.fov = THREE.MathUtils.damp(perspective.fov, fov, 3, dt);
      perspective.updateProjectionMatrix();
    }
  });

  return null;
}
