import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import '@fontsource/cormorant-garamond/300.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/manrope/300.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/hud.css';
import './styles/intro.css';
import './styles/panels.css';
import './styles/final.css';
import { App } from './App';
import { AudioProvider } from './audio/AudioProvider';

const container = document.getElementById('root');
if (!container) throw new Error('Не найден root-элемент');

createRoot(container).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <AudioProvider>
        <App />
      </AudioProvider>
    </MotionConfig>
  </StrictMode>,
);
