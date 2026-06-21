import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth';
import { ThemeProvider } from './theme';
import { ConfirmProvider } from './components/ConfirmProvider';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);

// PWA service worker — production only. In dev, actively remove any stale SW (e.g. left over
// from a previous `vite preview`/prod run) and clear its caches so it can't serve old code.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
    if (window.caches) caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
}
