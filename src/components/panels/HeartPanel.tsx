import { Heart } from 'lucide-react';
import { heartText } from '../../data/content';
import { PanelShell } from '../PanelShell';

export function HeartPanel({ onClose }: { onClose: () => void }) {
  return (
    <PanelShell id="heart" index="03" kicker={heartText.kicker} name="HEART" onClose={onClose}>
      <h2 className="panel__title" id="heart-title">
        {heartText.title}
      </h2>
      <p className="panel__lead">{heartText.lead}</p>

      <div className="pulse" aria-hidden="true">
        <span className="pulse__ring pulse__ring--one" />
        <span className="pulse__ring pulse__ring--two" />
        <span className="pulse__ring pulse__ring--three" />
        <span className="pulse__core">
          <Heart size={30} strokeWidth={1.1} />
        </span>
      </div>

      <p className="heart-note">{heartText.note}</p>

      <blockquote className="heart-quote">
        <p>{heartText.whisper}</p>
      </blockquote>

      <p className="panel__footnote">пульс — единственный ритм, которому я доверяю</p>
    </PanelShell>
  );
}
