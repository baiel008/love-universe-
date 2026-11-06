import { motion } from 'framer-motion';
import { Heart, RotateCcw } from 'lucide-react';
import { foreverText } from '../../data/content';
import { PanelShell } from '../PanelShell';

interface ForeverPanelProps {
  onClose: () => void;
  onRestart: () => void;
}

export function ForeverPanel({ onClose, onRestart }: ForeverPanelProps) {
  return (
    <PanelShell
      id="forever"
      index="05"
      kicker={foreverText.kicker}
      name="FOREVER"
      variant="final"
      onClose={onClose}
    >
      <div className="final">
        <motion.span
          className="final__heart"
          aria-hidden="true"
          initial={{ opacity: 0, scale: 0.72 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <Heart size={38} strokeWidth={0.9} />
          <span className="final__heart-glow" />
        </motion.span>

        <motion.blockquote
          className="final__quote"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <p id="forever-title">{foreverText.quote}</p>
        </motion.blockquote>

        <motion.p
          className="final__support"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75, duration: 1 }}
        >
          {foreverText.support}
        </motion.p>

        <motion.div
          className="final__line"
          aria-hidden="true"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.95, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />

        <motion.p
          className="final__continuation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
        >
          {foreverText.line}
        </motion.p>

        <motion.div
          className="final__actions"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          <button type="button" className="btn btn--primary" onClick={onRestart}>
            <RotateCcw size={16} strokeWidth={1.6} aria-hidden="true" />
            {foreverText.restart}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {foreverText.overview}
          </button>
        </motion.div>
      </div>
    </PanelShell>
  );
}
