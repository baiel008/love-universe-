import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { PlanetId, Whisper } from './types';
import { whispers } from './data/content';
import { detectQuality } from './lib/quality';
import { useDocumentVisible, usePortrait, useReducedMotion } from './lib/hooks';
import { UniverseCanvas } from './three/UniverseCanvas';
import type { OrbitState } from './three/CameraRig';
import { Intro } from './components/Intro';
import { Hud } from './components/Hud';
import { PlanetDock } from './components/PlanetDock';
import { TransitionVeil } from './components/TransitionVeil';
import { WhisperCard } from './components/WhisperCard';
import { WhisperList } from './components/WhisperList';
import { LovePanel } from './components/panels/LovePanel';
import { DreamsPanel } from './components/panels/DreamsPanel';
import { HeartPanel } from './components/panels/HeartPanel';
import { SecretPanel } from './components/panels/SecretPanel';
import { ForeverPanel } from './components/panels/ForeverPanel';

type Stage = 'intro' | 'universe';

interface ActiveWhisper {
  whisper: Whisper;
  index: number;
}

export function App() {
  const [stage, setStage] = useState<Stage>('intro');
  const [active, setActive] = useState<PlanetId | null>(null);
  const [warp, setWarp] = useState(false);
  const [veil, setVeil] = useState(false);
  const [whisper, setWhisper] = useState<ActiveWhisper | null>(null);
  const [whisperListOpen, setWhisperListOpen] = useState(false);

  const portrait = usePortrait();
  const reduced = useReducedMotion();
  const visible = useDocumentVisible();
  const [quality] = useState(() => detectQuality());
  const controls = useRef<OrbitState>({
    yaw: 0.16,
    pitch: 0.04,
    distance: 14.4,
    dragging: false,
    moved: false,
  });
  const movedRef = useRef(false);
  const lastPlanet = useRef<PlanetId | null>(null);
  const timers = useRef<number[]>([]);

  const after = useCallback((delay: number, action: () => void) => {
    const id = window.setTimeout(action, delay);
    timers.current.push(id);
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    },
    [],
  );

  const closePanels = useCallback(() => {
    setWhisper(null);
    setWhisperListOpen(false);
  }, []);

  const enter = useCallback(() => {
    closePanels();
    setVeil(true);
    after(380, () => {
      setStage('universe');
      setWarp(true);
      setVeil(false);
      after(1900, () => setWarp(false));
    });
  }, [after, closePanels]);

  const goHome = useCallback(() => {
    if (stage === 'intro') return;
    closePanels();
    if (active === null) return;
    setVeil(true);
    setActive(null);
    after(520, () => setVeil(false));
    after(820, () => {
      if (lastPlanet.current) {
        document.querySelector<HTMLButtonElement>(`[data-planet="${lastPlanet.current}"]`)?.focus();
      }
    });
  }, [active, after, closePanels, stage]);

  const focusPlanet = useCallback(
    (id: PlanetId) => {
      closePanels();
      lastPlanet.current = id;
      if (active === id) return;
      setVeil(true);
      setActive(id);
      after(stage === 'intro' ? 0 : 480, () => setVeil(false));
      if (stage === 'intro') {
        setStage('universe');
        setWarp(false);
      }
    },
    [active, after, closePanels, stage],
  );

  const openWhisper = useCallback((value: Whisper, index: number) => {
    setWhisperListOpen(false);
    setWhisper({ whisper: value, index });
  }, []);

  const restart = useCallback(() => {
    closePanels();
    setActive(null);
    setWarp(false);
    setStage('intro');
    controls.current.yaw = 0.16;
    controls.current.pitch = 0.04;
    controls.current.distance = 14.4;
    after(1000, () => {
      document.querySelector<HTMLButtonElement>('.intro__actions .btn')?.focus();
    });
  }, [after, closePanels]);

  const renderPanel = () => {
    switch (active) {
      case 'love':
        return <LovePanel key="love" onClose={goHome} />;
      case 'dreams':
        return <DreamsPanel key="dreams" onClose={goHome} />;
      case 'heart':
        return <HeartPanel key="heart" onClose={goHome} />;
      case 'secret':
        return <SecretPanel key="secret" onClose={goHome} />;
      case 'forever':
        return <ForeverPanel key="forever" onClose={goHome} onRestart={restart} />;
      default:
        return null;
    }
  };

  return (
    <div className="app" data-stage={stage} data-active={active ?? 'none'}>
      <a className="skip-link" href={stage === 'intro' ? '#intro-title' : '#universe-dock'}>
        Перейти к содержимому
      </a>

      <UniverseCanvas
        stage={stage}
        active={active}
        portrait={portrait}
        reduced={reduced}
        quality={quality}
        warp={warp}
        visible={visible}
        controls={controls}
        movedRef={movedRef}
        onSelect={focusPlanet}
        onWhisper={openWhisper}
      />

      <AnimatePresence>
        {stage === 'intro' ? <Intro onEnter={enter} reduced={reduced} /> : null}
      </AnimatePresence>

      <p className="visually-hidden" role="status" data-testid="stage-status">
        {active
          ? `Открыта планета ${active}`
          : stage === 'intro'
            ? 'Главный экран вселенной'
            : 'Все пять планет перед вами'}
      </p>

      <Hud
        stage={stage}
        active={active}
        onHome={goHome}
        onWhispers={() => {
          setWhisper(null);
          setWhisperListOpen(true);
        }}
      />

      <AnimatePresence>
        {stage === 'universe' && !active ? (
          <PlanetDock key="dock" active={active} onSelect={focusPlanet} />
        ) : null}
      </AnimatePresence>

      {stage === 'universe' && !active ? (
        <p className="scene-hint" aria-hidden="true">
          {portrait
            ? 'проведи — повернуть · щипок — приблизить'
            : 'перетащи — повернуть · колесо — приблизить'}
        </p>
      ) : null}

      <AnimatePresence mode="wait">{active ? renderPanel() : null}</AnimatePresence>

      <AnimatePresence>
        {whisper ? (
          <WhisperCard
            key="whisper-card"
            whisper={whisper.whisper}
            index={whisper.index}
            total={whispers.length}
            onClose={() => {
              setWhisper(null);
              after(80, () => {
                document.querySelector<HTMLButtonElement>('.hud__whispers')?.focus();
              });
            }}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {whisperListOpen ? (
          <WhisperList
            key="whisper-list"
            onClose={() => setWhisperListOpen(false)}
            onPick={openWhisper}
          />
        ) : null}
      </AnimatePresence>

      <TransitionVeil visible={veil} />
    </div>
  );
}
