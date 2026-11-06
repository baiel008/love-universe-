import { motion } from 'framer-motion';
import { dreams, dreamsText } from '../../data/content';
import { DreamArt } from '../DreamArt';
import { PanelShell } from '../PanelShell';

export function DreamsPanel({ onClose }: { onClose: () => void }) {
  return (
    <PanelShell id="dreams" index="02" kicker={dreamsText.kicker} name="DREAMS" onClose={onClose}>
      <h2 className="panel__title" id="dreams-title">
        {dreamsText.title}
      </h2>
      <p className="panel__lead">{dreamsText.lead}</p>

      <div className="dreams">
        {dreams.map((dream, index) => (
          <motion.article
            key={dream.id}
            className={`dream${index % 2 === 1 ? ' dream--reverse' : ''}`}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 + index * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="dream__art-wrap" aria-hidden="true">
              <span className="dream__index">{dream.index}</span>
              <DreamArt art={dream.art} />
            </div>
            <div className="dream__body">
              <h3 className="dream__title">{dream.title}</h3>
              <p className="dream__line">{dream.line}</p>
            </div>
          </motion.article>
        ))}
      </div>

      <p className="panel__footnote">карта пока без координат — но уже наша</p>
    </PanelShell>
  );
}
