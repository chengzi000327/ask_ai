import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function OptionsApp() {
  return <main className="options">Ask AI settings</main>;
}

createRoot(document.getElementById('root')!).render(<OptionsApp />);
