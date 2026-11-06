import { planets } from '../data/planets';
import type { PlanetId } from '../types';

interface PlanetDockProps {
  active: PlanetId | null;
  onSelect: (id: PlanetId) => void;
}

export function PlanetDock({ active, onSelect }: PlanetDockProps) {
  return (
    <nav className="dock" id="universe-dock" aria-label="Планеты вселенной">
      <ol className="dock__list">
        {planets.map((planet) => (
          <li key={planet.id} className="dock__item">
            <button
              type="button"
              className={`dock__button${active === planet.id ? ' is-active' : ''}`}
              onClick={() => onSelect(planet.id)}
              aria-current={active === planet.id ? 'true' : undefined}
              data-planet={planet.id}
            >
              <span className="dock__index">{planet.index}</span>
              <span className="dock__name">{planet.name}</span>
              <span className="dock__ru">{planet.ru.replace('Планета ', '')}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
