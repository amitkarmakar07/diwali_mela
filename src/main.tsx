import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// StrictMode is intentionally omitted: its double-invoked effects churn the Rapier
// character controller and pointer-lock listeners.
createRoot(document.getElementById('root')!).render(<App />);
