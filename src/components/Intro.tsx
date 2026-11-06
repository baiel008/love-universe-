import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { intro } from '../data/content';

interface IntroProps {
  onEnter: () => void;
  reduced: boolean;
}

export function Intro({ onEnter, reduced }: IntroProps) {
  return (
    <motion.section
      className="intro"
      aria-labelledby="intro-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0.2 : 1.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="intro__veil" aria-hidden="true" />
      <div className="intro__inner">
        <motion.p
          className="intro__eyebrow"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 0.25, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          {intro.eyebrow}
        </motion.p>

        <h1 className="intro__title" id="intro-title">
          <motion.span
            className="intro__word"
            initial={{ opacity: 0, y: reduced ? 0 : 34, letterSpacing: '0.34em' }}
            animate={{ opacity: 1, y: 0, letterSpacing: '0.18em' }}
            transition={{ delay: reduced ? 0 : 0.35, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {intro.title[0]}
          </motion.span>
          <motion.span
            className="intro__word intro__word--second"
            initial={{ opacity: 0, y: reduced ? 0 : 34, letterSpacing: '0.3em' }}
            animate={{ opacity: 1, y: 0, letterSpacing: '0.14em' }}
            transition={{ delay: reduced ? 0 : 0.55, duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {intro.title[1]}
          </motion.span>
        </h1>

        <motion.p
          className="intro__subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduced ? 0 : 1.05, duration: 1.1 }}
        >
          {intro.subtitle}
        </motion.p>

        <motion.div
          className="intro__actions"
          initial={{ opacity: 0, y: reduced ? 0 : 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 1.35, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <button type="button" className="btn btn--primary" onClick={onEnter}>
            <span>{intro.cta}</span>
            <Heart aria-hidden="true" size={17} strokeWidth={1.6} />
          </button>
          <p className="intro__hint">{intro.hint}</p>
        </motion.div>
      </div>

      <motion.div
        className="intro__scroll"
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduced ? 0 : 1.9, duration: 1 }}
      >
        <span />
      </motion.div>

      <div className="intro__orbit intro__orbit--a" aria-hidden="true" />
      <div className="intro__orbit intro__orbit--b" aria-hidden="true" />
    </motion.section>
  );
}
