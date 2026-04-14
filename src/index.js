import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/globals.css';
import App from './app/App';
import { applyDocumentLanguage, getStoredLanguage } from './i18n/i18n';

// Apply saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
}

applyDocumentLanguage(getStoredLanguage());

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>
);
