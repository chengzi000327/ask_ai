import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function App() {
  return (
    <main className="shell">
      <header>
        <h1>Ask AI</h1>
      </header>
      <section className="empty">Ready for paper translation and discussion.</section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
