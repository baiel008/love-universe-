import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Heart, X } from 'lucide-react';
import type { Whisper } from '../types';

interface WhisperCardProps {
  whisper: Whisper;
  index: number;
  total: number;
  onClose: () => void;
}

export function WhisperCard({ whisper, index, total, onClose }: WhisperCardProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="whisper-layer">
      <motion.button
        type="button"
        className="whisper__backdrop"
        onClick={onClose}
        aria-label="Закрыть фразу"
        tabIndex={-1}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      />
      <motion.div
        className="whisper"
        role="dialog"
        aria-modal="true"
        aria-labelledby="whisper-text"
        data-testid="whisper-card"
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="whisper__glow" aria-hidden="true" />
        <span className="whisper__mark" aria-hidden="true">
          <Heart size={22} strokeWidth={1.3} />
        </span>
        <span className="whisper__counter">
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
        <p className="whisper__text" id="whisper-text">
          {whisper.text}
        </p>
        <button
          ref={closeRef}
          type="button"
          className="whisper__close"
          onClick={onClose}
          aria-label="Закрыть фразу"
        >
          <X size={17} strokeWidth={1.5} />
        </button>
      </motion.div>
    </div>
  );
}
