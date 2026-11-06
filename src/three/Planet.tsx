import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { PlanetDef } from '../types';
import { getGlowTexture, getHeartGeometry } from './assets';
import {
  atmosphereFragmentShader,
  atmosphereVertexShader,
  planetFragmentShader,
  planetVertexShader,
} from './shaders';

interface PlanetProps {
  def: PlanetDef;
  portrait: boolean;
  active: boolean;
  labelsVisible: boolean;
  reduced: boolean;
  segments: number;
  orbitHearts: number;
  onSelect: (id: PlanetDef['id']) => void;
  movedRef: React.RefObject<boolean>;
}

function Halo({ color, scale, opacity }: { color: string; scale: number; opacity: number }) {
  const texture = useMemo(() => getGlowTexture(), []);
  return (
    <sprite scale={[scale, scale, 1]}>
      <spriteMaterial
        map={texture}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}

function OrbitHearts({
  count,
  radius,
  color,
  glow,
  reduced,
  speed,
}: {
  count: number;
  radius: number;
  color: string;
  glow: string;
  reduced: boolean;
  speed: number;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => getHeartGeometry(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const instance = mesh.current;
    if (!instance) return;
    instance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let index = 0; index < count; index += 1) {
      dummy.position.set(0, 0, 0);
      dummy.scale.setScalar(0.001);
      dummy.updateMatrix();
      instance.setMatrixAt(index, dummy.matrix);
    }
    instance.instanceMatrix.needsUpdate = true;
  }, [count, dummy]);

  useFrame((state) => {
    const instance = mesh.current;
    if (!instance) return;
    const time = reduced ? 0 : state.clock.elapsedTime;
    for (let index = 0; index < count; index += 1) {
      const phase = (index / count) * Math.PI * 2;
      const angle = phase + time * speed;
      const vertical = Math.sin(angle * 1.7 + index) * 0.34;
      dummy.position.set(Math.cos(angle) * radius, vertical, Math.sin(angle) * radius * 0.92);
      const scale = 0.085 + ((index * 37) % 11) * 0.004;
      dummy.scale.setScalar(scale);
      dummy.rotation.set(0, -angle, Math.sin(angle * 2 + index) * 0.25);
      dummy.updateMatrix();
      instance.setMatrixAt(index, dummy.matrix);
    }
    instance.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, count]} frustumCulled={false}>
      <meshPhysicalMaterial
        color={color}
        emissive={glow}
        emissiveIntensity={0.55}
        roughness={0.3}
        metalness={0.05}
        clearcoat={0.8}
        clearcoatRoughness={0.3}
      />
    </instancedMesh>
  );
}

export function Planet({
  def,
  portrait,
  active,
  labelsVisible,
  reduced,
  segments,
  orbitHearts,
  onSelect,
  movedRef,
}: PlanetProps) {
  const { gl } = useThree();
  const mesh = useRef<THREE.Mesh>(null);
  const group = useRef<THREE.Group>(null);
  const atmosphere = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const position = portrait ? def.portrait : def.position;

  const uniforms = useMemo(
    () => ({
      uBase: { value: new THREE.Color(def.colors.base) },
      uDeep: { value: new THREE.Color(def.colors.deep) },
      uGlow: { value: new THREE.Color(def.colors.glow) },
      uTime: { value: 0 },
      uSeed: { value: def.seed },
      uGlowStrength: { value: active ? 1.4 : 0.8 },
      uOpacity: { value: 1 },
    }),
    [def, active],
  );

  const atmosphereUniforms = useMemo(
    () => ({
      uGlow: { value: new THREE.Color(def.colors.glow) },
      uStrength: { value: active ? 0.9 : 0.55 },
    }),
    [def, active],
  );

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    uniforms.uTime.value = time;
    uniforms.uGlowStrength.value = THREE.MathUtils.damp(
      uniforms.uGlowStrength.value,
      active ? 1.7 : hovered ? 1.15 : 0.8,
      3,
      Math.min(delta, 0.06),
    );
    atmosphereUniforms.uStrength.value = THREE.MathUtils.damp(
      atmosphereUniforms.uStrength.value,
      active ? 1 : 0.5,
      3,
      Math.min(delta, 0.06),
    );

    if (mesh.current && !reduced) {
      mesh.current.rotation.y += delta * (def.kind === 'planet' ? 0.09 : 0.05);
      mesh.current.rotation.z = Math.sin(time * 0.18 + def.seed) * 0.04;
    }

    if (group.current) {
      const target = active ? 1.06 : hovered ? 1.03 : 1;
      const next = THREE.MathUtils.damp(group.current.scale.x, target, 4, Math.min(delta, 0.06));
      group.current.scale.setScalar(next);
    }
  });

  useEffect(() => {
    return () => {
      gl.domElement.style.cursor = '';
    };
  }, [gl]);

  const handleSelect = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    if (movedRef.current) return;
    onSelect(def.id);
  };

  return (
    <group position={position}>
      <Halo color={def.colors.glow} scale={def.radius * 4.2} opacity={active ? 0.34 : 0.18} />

      <group ref={group}>
        {def.kind === 'planet' ? (
          <mesh
            ref={mesh}
            onClick={handleSelect}
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
            <sphereGeometry args={[def.radius, segments, Math.round(segments * 0.7)]} />
            <shaderMaterial
              uniforms={uniforms}
              vertexShader={planetVertexShader}
              fragmentShader={planetFragmentShader}
            />
          </mesh>
        ) : (
          <HeartBody
            def={def}
            active={active}
            hovered={hovered}
            reduced={reduced}
            onClick={handleSelect}
            onHover={(value) => {
              setHovered(value);
              gl.domElement.style.cursor = value ? 'pointer' : '';
            }}
          />
        )}

        <mesh ref={atmosphere} scale={def.radius * 1.08}>
          <sphereGeometry args={[1, 48, 32]} />
          <shaderMaterial
            uniforms={atmosphereUniforms}
            vertexShader={atmosphereVertexShader}
            fragmentShader={atmosphereFragmentShader}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.FrontSide}
          />
        </mesh>

        {def.ring ? (
          <mesh rotation={[Math.PI / 2 + def.ring.tilt, 0, def.ring.tilt * 0.4]}>
            <ringGeometry
              args={[def.radius * def.ring.inner * 0.82, def.radius * def.ring.outer * 0.82, 96]}
            />
            <meshBasicMaterial
              color={def.colors.glow}
              transparent
              opacity={def.ring.opacity}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ) : null}

        {def.kind === 'heart' ? (
          <OrbitHearts
            count={orbitHearts}
            radius={def.radius * 1.55}
            color={def.id === 'forever' ? '#f3b7c1' : '#f6ecdc'}
            glow={def.colors.glow}
            reduced={reduced}
            speed={def.id === 'forever' ? 0.11 : 0.22}
          />
        ) : null}
      </group>

      {labelsVisible && !portrait ? (
        <Html
          position={[0, def.radius + 0.62, 0]}
          center
          distanceFactor={13}
          zIndexRange={[30, 5]}
          style={{ pointerEvents: 'none' }}
        >
          <button
            type="button"
            className={`planet-label${active ? ' is-active' : ''}`}
            style={{ pointerEvents: 'auto' }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(def.id);
            }}
            aria-label={`Открыть планету ${def.name} — ${def.ru}`}
          >
            <span className="planet-label__index">{def.index}</span>
            <span className="planet-label__name">{def.name}</span>
            <span className="planet-label__ru">{def.ru}</span>
          </button>
        </Html>
      ) : null}
    </group>
  );
}

function HeartBody({
  def,
  active,
  hovered,
  reduced,
  onClick,
  onHover,
}: {
  def: PlanetDef;
  active: boolean;
  hovered: boolean;
  reduced: boolean;
  onClick: (event: { stopPropagation: () => void }) => void;
  onHover: (value: boolean) => void;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => getHeartGeometry(), []);
  const baseScale = def.radius * 0.92;

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const speed = def.id === 'forever' ? 0.62 : 0.78;
    const cycle = (time * speed) % 1.5;
    const lub = Math.exp(-Math.pow((cycle - 0.12) / 0.1, 2));
    const dub = 0.5 * Math.exp(-Math.pow((cycle - 0.34) / 0.12, 2));
    const beat = reduced ? 0 : (lub + dub) * (active ? 1.5 : 1);
    const hover = hovered ? 1.04 : 1;
    if (mesh.current) {
      mesh.current.scale.setScalar(baseScale * hover * (1 + beat * 0.055));
      if (!reduced) {
        mesh.current.rotation.y += delta * 0.12;
        mesh.current.rotation.z = Math.sin(time * 0.35 + def.seed) * 0.08;
      }
    }
  });

  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      scale={baseScale}
      onClick={onClick}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(true);
      }}
      onPointerOut={() => onHover(false)}
    >
      <meshPhysicalMaterial
        color={def.colors.base}
        emissive={def.colors.deep}
        emissiveIntensity={0.5}
        roughness={0.3}
        metalness={0.08}
        clearcoat={1}
        clearcoatRoughness={0.24}
        sheen={0.8}
        sheenColor={def.colors.glow}
      />
    </mesh>
  );
}

interface CoreProps {
  dimmed: boolean;
  portrait: boolean;
  reduced: boolean;
  segments: number;
}

/** Центральное светило вселенной — огромная планета из первого экрана. */
export function UniverseCore({ dimmed, portrait, reduced, segments }: CoreProps) {
  const mesh = useRef<THREE.Mesh>(null);
  const atmosphere = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Sprite>(null);

  const uniforms = useMemo(
    () => ({
      uBase: { value: new THREE.Color('#f3b7c1') },
      uDeep: { value: new THREE.Color('#3a0910') },
      uGlow: { value: new THREE.Color('#f6ecdc') },
      uTime: { value: 0 },
      uSeed: { value: 3.3 },
      uGlowStrength: { value: 1.5 },
      uOpacity: { value: 1 },
    }),
    [],
  );

  const atmosphereUniforms = useMemo(
    () => ({ uGlow: { value: new THREE.Color('#ff8a96') }, uStrength: { value: 0.85 } }),
    [],
  );

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    uniforms.uTime.value = time;
    const targetOpacity = dimmed ? 0 : 1;
    uniforms.uOpacity.value = THREE.MathUtils.damp(
      uniforms.uOpacity.value,
      targetOpacity,
      4,
      Math.min(delta, 0.06),
    );
    atmosphereUniforms.uStrength.value = THREE.MathUtils.damp(
      atmosphereUniforms.uStrength.value,
      dimmed ? 0 : 0.85,
      4,
      Math.min(delta, 0.06),
    );
    if (halo.current) {
      halo.current.material.opacity = THREE.MathUtils.damp(
        halo.current.material.opacity,
        dimmed ? 0 : 0.4,
        4,
        Math.min(delta, 0.06),
      );
    }
    if (mesh.current) {
      mesh.current.visible = uniforms.uOpacity.value > 0.02;
      if (!reduced) mesh.current.rotation.y += delta * 0.028;
    }
    if (atmosphere.current) {
      atmosphere.current.visible = uniforms.uOpacity.value > 0.02;
    }
  });

  return (
    <group scale={portrait ? 0.66 : 1}>
      <sprite ref={halo} scale={[16, 16, 1]}>
        <spriteMaterial
          map={getGlowTexture()}
          color="#f3b7c1"
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <mesh ref={mesh}>
        <sphereGeometry args={[3.3, segments, Math.round(segments * 0.7)]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={planetVertexShader}
          fragmentShader={planetFragmentShader}
          transparent
        />
      </mesh>
      <mesh ref={atmosphere} scale={3.48}>
        <sphereGeometry args={[1, 64, 40]} />
        <shaderMaterial
          uniforms={atmosphereUniforms}
          vertexShader={atmosphereVertexShader}
          fragmentShader={atmosphereFragmentShader}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2.4, 0, 0.2]}>
        <ringGeometry args={[4.6, 4.66, 128]} />
        <meshBasicMaterial
          color="#f3b7c1"
          transparent
          opacity={0.16}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
