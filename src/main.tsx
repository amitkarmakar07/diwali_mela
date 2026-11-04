import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import './index.css';
import App from './App.tsx';

// StrictMode is intentionally omitted: its double-invoked effects churn the Rapier
// character controller and pointer-lock listeners.
//
// Analytics sits beside <App/> rather than inside it so it still reports the visit when
// App short-circuits to the "open on a desktop" notice — those are real visitors and
// should be counted. It is the /react entry, not /next: this is a Vite app, and Vercel's
// dashboard only shows the Next.js snippet because of the framework dropdown.
createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <Analytics />
  </>,
);
