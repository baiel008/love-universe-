import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { Lock, LockOpen } from 'lucide-react';
import { secretText } from '../../data/content';
import { PanelShell } from '../PanelShell';

const HOLD_MS = 1600;

export function SecretPanel({ onClose }: { onClose: () => void }) {
  const [progress, setProgress] = useState(0);
  const [unlocked, setUnlocked] = useState(false);
  const [holding, setHolding] = useState(false);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!holding || unlocked) return;
    let frame = 0;

    const tick = () => {
      const value = Math.min(1, (performance.now() - startedAt.current) / HOLD_MS);
      setProgress(value);
      if (value >= 1) {
        setUnlocked(true);
        setHolding(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [holding, unlocked]);

  const start = () => {
    if (unlocked || holding) return;
    startedAt.current = performance.now();
    setProgress(0.02);
    setHolding(true);
  };

  const stop = () => {
    setHolding(false);
    setProgress((value) => (value >= 1 ? 1 : 0));
  };

  const reseal = () => {
    setUnlocked(false);
    setProgress(0);
  };

  return (
    <PanelShell id="secret" index="04" kicker={secretText.kicker} name="SECRET" onClose={onClose}>
      <h2 className="panel__title" id="secret-title">
        {secretText.title}
      </h2>
      <p className="panel__lead">{secretText.lead}</p>

      {!unlocked ? (
        <div className="secret-hold">
          <button
            type="button"
            className="secret-hold__button"
            style={{ '--progress': progress } as CSSProperties}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              start();
            }}
            onPointerUp={stop}
            onPointerCancel={stop}
            onPointerLeave={stop}
            onContextMenu={(event) => event.preventDefault()}
            onKeyDown={(event) => {
              if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
                event.preventDefault();
                start();
              }
            }}
            onKeyUp={(event) => {
              if (event.key === 'Enter' || event.key === ' ') stop();
            }}
            onBlur={stop}
            onClick={(event) => event.preventDefault()}
            aria-label={`${secretText.hold}. Удерживайте, чтобы открыть письмо.`}
            data-testid="secret-hold"
          >
            <span className="secret-hold__ring" aria-hidden="true" />
            <span className="secret-hold__inner">
              <Lock size={20} strokeWidth={1.3} aria-hidden="true" />
              <span className="secret-hold__label">
                {progress > 0.12 ? secretText.holding : secretText.hold}
              </span>
            </span>
          </button>
          <p className="secret-hold__hint">
            <span aria-hidden="true">☾</span> удерживай, пока круг не замкнётся
          </p>
        </div>
      ) : (
        <motion.div
          className="secret-letter"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          data-testid="secret-letter"
        >
          <p className="secret-letter__state">
            <LockOpen size={14} strokeWidth={1.4} aria-hidden="true" /> {secretText.unlocked}
          </p>
          <h3 className="secret-letter__title">{secretText.letterTitle}</h3>
          {secretText.letter.map((paragraph, index) => (
            <motion.p
              key={paragraph.slice(0, 24)}
              className="secret-letter__paragraph"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.12, duration: 0.65 }}
            >
              {paragraph}
            </motion.p>
          ))}
          <p className="secret-letter__sign">
            <span>{secretText.sign}</span>
            <span className="secret-letter__heart" aria-hidden="true">
              ❤
            </span>
          </p>
          <button type="button" className="btn btn--ghost" onClick={reseal}>
            {secretText.reseal}
          </button>
        </motion.div>
      )}
    </PanelShell>
  );
}
