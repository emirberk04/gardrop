import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { db } from './db/db';
import './styles/app.css';

registerSW({ immediate: true });

// Geliştirme sırasında konsoldan veriye erişim
if (import.meta.env.DEV) Object.assign(window, { __db: db });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
