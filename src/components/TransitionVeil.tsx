import { AnimatePresence, motion } from 'framer-motion';
import { Heart } from 'lucide-react';

export function TransitionVeil({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="veil"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32, ease: 'easeInOut' }}
        >
          <div className="veil__glow" />
          <motion.span
            className="veil__mark"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.15, opacity: 0 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            <Heart size={26} strokeWidth={1.2} />
          </motion.span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
