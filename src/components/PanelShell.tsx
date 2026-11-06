import { useEffect, useRef, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useFocusTrap } from '../lib/useFocusTrap';

interface PanelShellProps {
  id: string;
  index: string;
  kicker: string;
  name: string;
  variant?: 'side' | 'final';
  onClose: () => void;
  children: ReactNode;
}

export function PanelShell({
  id,
  index,
  kicker,
  name,
  variant = 'side',
  onClose,
  children,
}: PanelShellProps) {
  const ref = useRef<HTMLElement>(null);
  useFocusTrap(ref, true);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="panel-layer">
      <motion.button
        type="button"
        className="panel__backdrop"
        onClick={onClose}
        aria-label="Закрыть планету"
        tabIndex={-1}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      />

      <motion.section
        ref={ref}
        className={`panel panel--${variant}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        data-testid={`panel-${id}`}
        initial={{ opacity: 0, x: variant === 'side' ? 46 : 0, y: variant === 'final' ? 26 : 0 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, x: variant === 'side' ? 32 : 0, y: variant === 'final' ? 18 : 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="panel__head">
          <div className="panel__id">
            <span className="panel__index">{index}</span>
            <span className="panel__kicker">{kicker}</span>
          </div>
          <span className="panel__name">{name}</span>
          <button
            type="button"
            className="panel__close"
            onClick={onClose}
            aria-label="Закрыть"
            data-testid="panel-close"
          >
            <X size={19} strokeWidth={1.5} />
          </button>
        </header>

        <div className="panel__scroll" tabIndex={0}>
          {children}
        </div>
      </motion.section>
    </div>
  );
}
