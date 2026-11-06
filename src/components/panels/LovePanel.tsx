import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { loveText } from '../../data/content';
import { PanelShell } from '../PanelShell';

export function LovePanel({ onClose }: { onClose: () => void }) {
  return (
    <PanelShell id="love" index="01" kicker={loveText.kicker} name="LOVE" onClose={onClose}>
      <h2 className="panel__title" id="love-title">
        {loveText.title}
      </h2>
      <p className="panel__lead">{loveText.lead}</p>

      <ol className="love-list">
        {loveText.phrases.map((phrase, index) => (
          <motion.li
            key={phrase}
            className="love-list__item"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 + index * 0.09, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="love-list__index" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="love-list__text">{phrase}</span>
            <span className="love-list__heart" aria-hidden="true">
              <Heart size={14} strokeWidth={1.4} />
            </span>
          </motion.li>
        ))}
      </ol>

      <p className="panel__footnote">{loveText.footnote}</p>
    </PanelShell>
  );
}
