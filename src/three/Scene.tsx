import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { PlanetId, QualityLevel, Whisper } from '../types';
import { planets } from '../data/planets';
import { whispers } from '../data/content';
import { qualitySettings } from '../lib/quality';
import { CameraRig, type OrbitState } from './CameraRig';
import { Nebula } from './Nebula';
import { CosmicDust, Starfield } from './Starfield';
import { Planet, UniverseCore } from './Planet';
import { WhisperHeart } from './WhisperHeart';
import { getGlowTexture } from './assets';

interface SceneProps {
  stage: 'intro' | 'universe';
  active: PlanetId | null;
  portrait: boolean;
  reduced: boolean;
  quality: QualityLevel;
  warp: boolean;
  controls: React.RefObject<OrbitState>;
  movedRef: React.RefObject<boolean>;
  onSelect: (id: PlanetId) => void;
  onWhisper: (whisper: Whisper, index: number) => void;
}

function FpsProbe() {
  const { gl, scene, camera } = useThree();
  const frames = useMemo(() => ({ count: 0, elapsed: 0, fps: 60 }), []);

  useFrame((_, delta) => {
    frames.count += 1;
    frames.elapsed += delta;
    if (frames.elapsed >= 0.5) {
      frames.fps = frames.count / frames.elapsed;
      frames.count = 0;
      frames.elapsed = 0;
    }
  });

  useEffect(() => {
    window.__loveUniverse = {
      stats: () => ({
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        programs: gl.info.programs?.length ?? 0,
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        fps: Math.round(frames.fps),
        fov: Math.round((camera as THREE.PerspectiveCamera).fov * 10) / 10,
        camera: [
          Math.round(camera.position.x * 100) / 100,
          Math.round(camera.position.y * 100) / 100,
          Math.round(camera.position.z * 100) / 100,
        ],
      }),
      loseContext: () => gl.forceContextLoss(),
      resumeContext: () => {
        gl.getContext().getExtension('WEBGL_lose_context')?.restoreContext();
      },
      project: (x, y, z) => {
        const point = new THREE.Vector3(x, y, z).project(camera);
        return {
          x: Math.round((point.x * 0.5 + 0.5) * window.innerWidth),
          y: Math.round((-point.y * 0.5 + 0.5) * window.innerHeight),
          visible: point.z > -1 && point.z < 1,
        };
      },
      setQuality: () => undefined,
    };
    return () => {
      delete window.__loveUniverse;
    };
  }, [gl, scene, frames, camera]);

  return null;
}

function DecorativeOrbits() {
  const geometryA = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let index = 0; index <= 128; index += 1) {
      const angle = (index / 128) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * 11.4, 0, Math.sin(angle) * 11.4));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  const geometryB = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let index = 0; index <= 128; index += 1) {
      const angle = (index / 128) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * 8.4, 0, Math.sin(angle) * 8.4));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  return (
    <group>
      <group rotation={[Math.PI / 2.35, 0, 0.42]}>
        <lineLoop geometry={geometryA}>
          <lineBasicMaterial
            color="#f3b7c1"
            transparent
            opacity={0.1}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </lineLoop>
      </group>
      <group rotation={[Math.PI / 2.1, 0.3, -0.28]}>
        <lineLoop geometry={geometryB}>
          <lineBasicMaterial
            color="#c8182e"
            transparent
            opacity={0.12}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </lineLoop>
      </group>
    </group>
  );
}

function FinalAura({ visible, portrait }: { visible: boolean; portrait: boolean }) {
  const texture = useMemo(() => getGlowTexture(), []);
  const sprite = useRef<THREE.Sprite>(null);
  const planet = planets.find((item) => item.id === 'forever');
  const base = planet ? (portrait ? planet.portrait : planet.position) : [0, 0, 0];

  useFrame((_, delta) => {
    const material = sprite.current?.material;
    if (!material) return;
    const target = visible ? 0.3 : 0;
    material.opacity = THREE.MathUtils.damp(material.opacity, target, 2.4, Math.min(delta, 0.06));
  });

  return (
    <sprite ref={sprite} position={[base[0], base[1] - 0.2, base[2] - 0.4]} scale={[15, 15, 1]}>
      <spriteMaterial
        map={texture}
        color="#f6ecdc"
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}

export function Scene({
  stage,
  active,
  portrait,
  reduced,
  quality,
  warp,
  controls,
  movedRef,
  onSelect,
  onWhisper,
}: SceneProps) {
  const settings = qualitySettings[quality];
  const labelsVisible = stage === 'universe' && !active;

  return (
    <>
      <color attach="background" args={['#070204']} />
      <fog attach="fog" args={['#070204', 24, 62]} />

      <ambientLight intensity={0.55} color="#f6ecdc" />
      <directionalLight position={[-6, 7, 9]} intensity={1.4} color="#f6ecdc" />
      <pointLight position={[0, 0, 0]} intensity={26} distance={34} decay={1.8} color="#c8182e" />
      <pointLight position={[7, -4, 6]} intensity={14} distance={26} decay={1.8} color="#f3b7c1" />

      <CameraRig
        stage={stage}
        active={active}
        portrait={portrait}
        reduced={reduced}
        warp={warp}
        controls={controls}
      />
      <FpsProbe />

      <Starfield count={settings.stars} reduced={reduced} pixelRatio={settings.dpr} />
      <CosmicDust count={settings.dust} reduced={reduced} pixelRatio={settings.dpr} />
      <Nebula layers={settings.nebulae} reduced={reduced} />
      <DecorativeOrbits />

      <UniverseCore
        dimmed={stage === 'universe' && active !== null}
        portrait={portrait}
        reduced={reduced}
        segments={settings.planetSegments}
      />

      {planets.map((planet) => (
        <Planet
          key={planet.id}
          def={planet}
          portrait={portrait}
          active={active === planet.id}
          labelsVisible={labelsVisible}
          reduced={reduced}
          segments={settings.planetSegments}
          orbitHearts={settings.orbitHearts}
          onSelect={onSelect}
          movedRef={movedRef}
        />
      ))}

      {whispers.map((whisper, index) => (
        <WhisperHeart
          key={whisper.id}
          whisper={whisper}
          index={index}
          portrait={portrait}
          reduced={reduced}
          onWhisper={onWhisper}
          movedRef={movedRef}
        />
      ))}

      <FinalAura visible={active === 'forever'} portrait={portrait} />
    </>
  );
}
