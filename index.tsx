import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Buffer } from "buffer";
import { showGlobalToast } from './context/NotificationContext';

(window as any).Buffer = Buffer;

const originalFetch = window.fetch;
window.fetch = async (...args) => {
  try {
    const response = await originalFetch(...args);
    if (!response.ok) {
      const clone = response.clone();
      clone.json().then(data => {
        const errMsg = data?.error || data?.message || `Request failed with status ${response.status}`;
        showGlobalToast(errMsg, 'error');
      }).catch(() => {
        showGlobalToast(`Request failed with status ${response.status}`, 'error');
      });
    }
    return response;
  } catch (error: any) {
    showGlobalToast(error?.message || "Network error. Please try again.", 'error');
    throw error;
  }
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
      });
    });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);