import { Heart, Sparkles } from 'lucide-react';
import type { PlanetId } from '../types';
import { planetById } from '../data/planets';
import { universeText } from '../data/content';
import { AudioPlayer } from './AudioPlayer';

interface HudProps {
  stage: 'intro' | 'universe';
  active: PlanetId | null;
  onHome: () => void;
  onWhispers: () => void;
}

export function Hud({ stage, active, onHome, onWhispers }: HudProps) {
  const planet = active ? planetById(active) : null;

  return (
    <header className="hud">
      <div className="hud__bar">
        <button
          type="button"
          className="brand"
          onClick={onHome}
          aria-label="LOVE UNIVERSE — вернуться ко всем планетам"
        >
          <span className="brand__mark" aria-hidden="true">
            <Heart size={16} strokeWidth={1.7} />
          </span>
          <span className="brand__text">
            <span className="brand__name">LOVE UNIVERSE</span>
            <span className="brand__sub">
              {planet ? `${planet.index} · ${planet.name}` : 'интерактивная вселенная'}
            </span>
          </span>
        </button>

        <div className="hud__right">
          {stage === 'universe' ? (
            <div className="hud__actions">
              {active ? (
                <button type="button" className="hud__back" onClick={onHome}>
                  <span aria-hidden="true">←</span> {universeText.back}
                </button>
              ) : null}
              <button
                type="button"
                className="hud__whispers"
                onClick={onWhispers}
                aria-label="Открыть шёпот сердец"
              >
                <Sparkles size={15} strokeWidth={1.6} aria-hidden="true" />
                <span>шёпот сердец</span>
              </button>
            </div>
          ) : null}
          <AudioPlayer />
        </div>
      </div>
    </header>
  );
}
