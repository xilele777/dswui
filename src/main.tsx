import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ConfirmProvider } from './components/ConfirmDialog';
import 'katex/dist/katex.min.css';
import './styles/index.css';

const el = document.getElementById('root')!;
createRoot(el).render(
  <React.StrictMode>
    <ConfirmProvider>
      <App />
    </ConfirmProvider>
  </React.StrictMode>,
);
