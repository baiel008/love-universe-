import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Heart, X } from 'lucide-react';
import type { Whisper } from '../types';
import { universeText } from '../data/content';
import { whispers } from '../data/content';
import { useFocusTrap } from '../lib/useFocusTrap';

interface WhisperListProps {
  onClose: () => void;
  onPick: (whisper: Whisper, index: number) => void;
}

export function WhisperList({ onClose, onPick }: WhisperListProps) {
  const ref = useRef<HTMLElement>(null);
  useFocusTrap(ref, true);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="panel-layer">
      <motion.button
        type="button"
        className="panel__backdrop"
        onClick={onClose}
        aria-label="Закрыть шёпот сердец"
        tabIndex={-1}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      />
      <motion.section
        ref={ref}
        className="panel panel--whispers"
        role="dialog"
        aria-modal="true"
        aria-labelledby="whispers-title"
        data-testid="whispers-panel"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 28 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="panel__head">
          <div className="panel__id">
            <span className="panel__index">∞</span>
            <span className="panel__kicker">сердца говорят</span>
          </div>
          <button
            type="button"
            className="panel__close"
            onClick={onClose}
            aria-label="Закрыть"
            data-testid="whispers-close"
          >
            <X size={19} strokeWidth={1.5} />
          </button>
        </header>

        <div className="panel__scroll" tabIndex={0}>
          <h2 className="panel__title" id="whispers-title">
            {universeText.whisperHint}
          </h2>
          <ul className="whisper-list">
            {whispers.map((whisper, index) => (
              <li key={whisper.id}>
                <button
                  type="button"
                  className="whisper-list__item"
                  onClick={() => onPick(whisper, index)}
                >
                  <span className="whisper-list__mark" aria-hidden="true">
                    <Heart size={15} strokeWidth={1.4} />
                  </span>
                  <span>{whisper.text}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="panel__footnote">
            Эти сердца летают в космосе — их можно нажать и там, но здесь они всегда под рукой.
          </p>
        </div>
      </motion.section>
    </div>
  );
}
