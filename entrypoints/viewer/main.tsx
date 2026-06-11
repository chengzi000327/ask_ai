import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function ViewerApp() {
  return <main className="viewer">PDF viewer loading...</main>;
}

createRoot(document.getElementById('root')!).render(<ViewerApp />);
