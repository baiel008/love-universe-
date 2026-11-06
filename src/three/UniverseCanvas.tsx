import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { PlanetId, QualityLevel, Whisper } from '../types';
import { qualitySettings } from '../lib/quality';
import type { OrbitState } from './CameraRig';
import { Scene } from './Scene';

interface UniverseCanvasProps {
  stage: 'intro' | 'universe';
  active: PlanetId | null;
  portrait: boolean;
  reduced: boolean;
  quality: QualityLevel;
  warp: boolean;
  visible: boolean;
  controls: React.RefObject<OrbitState>;
  movedRef: React.RefObject<boolean>;
  onSelect: (id: PlanetId) => void;
  onWhisper: (whisper: Whisper, index: number) => void;
}

export function UniverseCanvas({
  stage,
  active,
  portrait,
  reduced,
  quality,
  warp,
  visible,
  controls,
  movedRef,
  onSelect,
  onWhisper,
}: UniverseCanvasProps) {
  const wrapper = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistance = useRef(0);
  const start = useRef({ x: 0, y: 0 });
  const [lost, setLost] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [glKey, setGlKey] = useState(0);
  const settings = qualitySettings[quality];

  useEffect(() => {
    const node = wrapper.current;
    if (!node) return;

    const onWheel = (event: WheelEvent) => {
      if (stage !== 'universe' || active) return;
      event.preventDefault();
      const orbit = controls.current;
      orbit.distance = THREE.MathUtils.clamp(orbit.distance + event.deltaY * 0.012, 11, 23);
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [active, controls, stage]);

  useEffect(() => {
    const canvas = wrapper.current?.querySelector('canvas');
    if (!canvas) return;

    const onLost = (event: Event) => {
      event.preventDefault();
      setLost(true);
    };
    const onRestored = () => setLost(false);
    const onError = () => setLost(true);

    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    canvas.addEventListener('webglcontextcreationerror', onError);
    return () => {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      canvas.removeEventListener('webglcontextcreationerror', onError);
    };
  }, [glKey]);

  const restart = useCallback(() => {
    setLost(false);
    setGlKey((value) => value + 1);
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (stage !== 'universe' || active) return;
    // Не перехватываем указатель у DOM-оверлеев внутри сцены:
    // кнопки восстановления WebGL и подписи планет должны получать клики.
    if (!(event.target instanceof HTMLCanvasElement)) return;
    // Capture ставим на сам canvas: тогда pointerup/click остаются на нём
    // и raycast-события R3F (планеты, сердца) продолжают срабатывать.
    event.target.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    movedRef.current = false;
    controls.current.dragging = true;
    setDragging(true);
    start.current = { x: event.clientX, y: event.clientY };

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchDistance.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (stage !== 'universe' || active) return;
    const pointer = pointers.current.get(event.pointerId);
    if (!pointer) return;

    if (pointers.current.size === 2) {
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance.current > 0) {
        const delta = (pinchDistance.current - distance) * 0.03;
        controls.current.distance = THREE.MathUtils.clamp(
          controls.current.distance + delta,
          11,
          24,
        );
      }
      pinchDistance.current = distance;
      movedRef.current = true;
      return;
    }

    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    controls.current.yaw = THREE.MathUtils.clamp(controls.current.yaw - dx * 0.0026, -0.62, 0.62);
    controls.current.pitch = THREE.MathUtils.clamp(
      controls.current.pitch + dy * 0.0017,
      -0.24,
      0.2,
    );

    if (Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 7) {
      movedRef.current = true;
    }
  };

  const endPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    pinchDistance.current = 0;
    if (pointers.current.size === 0) {
      controls.current.dragging = false;
      setDragging(false);
      window.setTimeout(() => {
        movedRef.current = false;
      }, 80);
    }
  };

  return (
    <div
      className={`universe-canvas${lost ? ' is-lost' : ''}${dragging ? ' is-dragging' : ''}`}
      ref={wrapper}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onPointerLeave={endPointer}
    >
      <Canvas
        key={glKey}
        dpr={[1, settings.dpr]}
        frameloop={visible ? 'always' : 'never'}
        gl={{
          antialias: settings.antialias,
          powerPreference: 'high-performance',
          alpha: false,
          stencil: false,
        }}
        camera={{ fov: 45, near: 0.1, far: 140, position: [0, 0.7, 13.6] }}
        onCreated={({ gl }) => {
          gl.setClearColor('#070204');
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.12;
          gl.domElement.setAttribute('aria-hidden', 'true');
          gl.domElement.setAttribute('tabindex', '-1');
        }}
      >
        <Scene
          stage={stage}
          active={active}
          portrait={portrait}
          reduced={reduced}
          quality={quality}
          warp={warp}
          controls={controls}
          movedRef={movedRef}
          onSelect={onSelect}
          onWhisper={onWhisper}
        />
      </Canvas>

      {lost ? (
        <div className="gl-fallback" role="alert">
          <p>3D-сцена приостановлена браузером.</p>
          <p className="gl-fallback__hint">Это случается редко — обычно после нехватки памяти.</p>
          <button type="button" className="btn btn--ghost" onClick={restart}>
            Перезапустить сцену
          </button>
        </div>
      ) : null}
    </div>
  );
}
